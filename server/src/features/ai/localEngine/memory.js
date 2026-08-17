// Structured conversation memory - the Phase 2 upgrade from the Phase 1
// primitive (lastCity/lastType/lastTool/pendingAction, still untouched
// below). This module owns exactly one job: given a tool that just ran
// and its real result, decide what's worth remembering for future turns
// - a short, honest summary and the real IDs involved, never the raw
// dataset (a search can return several full property documents; nothing
// dumps those into `context`, which is meant to stay small and cheap to
// load on every turn).
//
// Originally written purely for Phase 3's LLM path to consume (the
// deterministic engine itself only wrote `entities`/`recentToolResults`,
// never read them back). localEngine/index.js now reads
// `entities.propertyId` back for one narrow, safe case: a pronoun
// follow-up ("unfavorite it") to add/remove-favorite right after a
// property was shown - see index.js for why this is scoped narrowly
// instead of a general pronoun-resolution mechanism.

const MAX_RECENT_TOOL_RESULTS = 5;

// Only these tools have args worth remembering as "the last search" -
// storing them verbatim is safe because they're already the small,
// validated, tool-specific argument objects the engine itself built
// (see toolIntents.js's `extract`), never raw user text.
const SEARCH_TOOLS = new Set(['search_properties', 'search_agencies', 'search_developers', 'search_projects', 'search_blog_posts']);

function firstId(items, key = '_id') {
  return items?.[0]?.[key] ? String(items[0][key]) : undefined;
}

function ids(items, key = '_id', cap = 5) {
  return (items || []).slice(0, cap).map((item) => String(item[key])).filter(Boolean);
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// One entry per tool where "what did we just look at" is a meaningful
// question to ask later. Tools with no entry here (most of the
// dashboard/billing/CRM-list tools) still get recorded in
// recentToolResults via the generic fallback below - they just don't
// produce an entity worth pinning as "the thing we're discussing now".
const SUMMARIZERS = {
  search_properties: (args, r) => ({
    summary: r.count ? `Found ${plural(r.count, 'property')}${args.city ? ` in ${args.city}` : ''}.` : 'No matching properties found.',
    identifiers: ids(r.properties),
    entities: r.count ? { propertyId: firstId(r.properties) } : {},
  }),
  get_property_details: (_args, r) => {
    const p = r.properties?.[0];
    if (!p) return { summary: 'Property not found.', identifiers: [], entities: {} };
    return { summary: `Discussed "${p.title}" in ${p.city}.`, identifiers: [String(p._id)], entities: { propertyId: String(p._id) } };
  },
  compare_properties: (_args, r) => ({
    summary: `Compared ${plural(r.properties?.length || 0, 'property')}.`,
    identifiers: ids(r.properties),
    entities: r.properties?.length ? { propertyId: firstId(r.properties) } : {},
  }),
  recommend_properties: (_args, r) => ({
    summary: `Recommended ${plural(r.count || 0, 'similar property')}.`,
    identifiers: ids(r.properties),
    entities: {},
  }),
  get_favorite_properties: (_args, r) => ({
    summary: r.count ? `Showed ${plural(r.count, 'saved property')}.` : 'No saved properties yet.',
    identifiers: ids(r.properties),
    entities: r.count ? { propertyId: firstId(r.properties) } : {},
  }),
  explain_lead_score: (args, r) => ({
    summary: `Explained ${r.customer ? `${r.customer}'s` : 'a'} lead score (${r.score}/100).`,
    identifiers: args.inquiryId ? [args.inquiryId] : [],
    entities: args.inquiryId ? { inquiryId: args.inquiryId } : {},
  }),
  move_lead_stage: (_args, r) => ({
    summary: r.newStage ? `Moved a lead to "${String(r.newStage).replace(/_/g, ' ')}".` : 'Lead stage change attempted.',
    identifiers: r.inquiryId ? [String(r.inquiryId)] : [],
    entities: r.inquiryId ? { inquiryId: String(r.inquiryId) } : {},
  }),
  search_agencies: (args, r) => ({
    summary: r.count ? `Found ${plural(r.count, 'agency')}${args.city ? ` in ${args.city}` : ''}.` : 'No matching agencies found.',
    identifiers: ids(r.agencies, 'slug'),
    entities: r.count ? { agencySlug: firstId(r.agencies, 'slug') } : {},
  }),
  get_agency_details: (_args, r) =>
    r.companyName
      ? { summary: `Discussed agency "${r.companyName}".`, identifiers: [r.slug], entities: { agencySlug: r.slug } }
      : { summary: 'Agency not found.', identifiers: [], entities: {} },
  search_developers: (args, r) => ({
    summary: r.count ? `Found ${plural(r.count, 'developer')}${args.city ? ` in ${args.city}` : ''}.` : 'No matching developers found.',
    identifiers: ids(r.developers, 'slug'),
    entities: r.count ? { developerSlug: firstId(r.developers, 'slug') } : {},
  }),
  search_projects: (args, r) => ({
    summary: r.count ? `Found ${plural(r.count, 'project')}${args.city ? ` in ${args.city}` : ''}.` : 'No matching projects found.',
    identifiers: ids(r.projects, 'slug'),
    entities: r.count ? { projectSlug: firstId(r.projects, 'slug') } : {},
  }),
  search_blog_posts: (_args, r) => ({
    summary: r.count ? `Found ${plural(r.count, 'article')}.` : 'No matching articles found.',
    identifiers: ids(r.posts, 'slug'),
    entities: r.count ? { blogSlug: firstId(r.posts, 'slug') } : {},
  }),
};

function summarizeResult(tool, args, result) {
  if (result?.error) {
    return { summary: `Tried "${tool}" - ${result.error}`, identifiers: [], entities: {} };
  }
  const summarizer = SUMMARIZERS[tool];
  if (!summarizer) return { summary: `Ran "${tool}".`, identifiers: [], entities: {} };
  try {
    return summarizer(args || {}, result || {});
  } catch {
    // A summarizer touching a result shape that doesn't match its
    // assumptions must never break the actual conversation turn - fall
    // back to the same honest generic summary an unmapped tool gets.
    return { summary: `Ran "${tool}".`, identifiers: [], entities: {} };
  }
}

// Called once after every tool execution that the engine decides is
// worth remembering (see localEngine/index.js) - never for small talk,
// clarifying questions, or help-message fallbacks, none of which ran a
// tool. `memory` is the conversation's existing context; returns a new
// object, never mutates the input.
function recordToolExecution(memory, tool, args, result) {
  const { summary, identifiers, entities } = summarizeResult(tool, args, result);
  const success = !result?.error;

  const entry = { tool, executedAt: new Date().toISOString(), success, summary, identifiers };
  const recentToolResults = [...(memory.recentToolResults || []), entry].slice(-MAX_RECENT_TOOL_RESULTS);

  const next = {
    ...memory,
    recentToolResults,
    entities: { ...memory.entities, ...(success ? entities : {}) },
  };
  if (success && SEARCH_TOOLS.has(tool)) {
    next.lastFilters = args;
  }
  return next;
}

module.exports = { recordToolExecution, summarizeResult, MAX_RECENT_TOOL_RESULTS };
