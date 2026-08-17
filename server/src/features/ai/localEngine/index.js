const { matchIntent } = require('./matcher');
const { findByTool } = require('./toolIntents');
const { buildReply, buildHelpMessage, buildConfirmationPrompt } = require('./templates');
const { extractCity, extractType } = require('./entities');
const { matchSmallTalk } = require('./smallTalk');
const { isAffirmative, isNegative } = require('./confirmations');
const { recordToolExecution } = require('./memory');
const { needsSummarization } = require('./summarization');
const { getToolsForRole, executeTool, TOOL_DEFINITIONS } = require('../ai.tools');
const { isLlmAvailable } = require('../llm');
const { runLlmTurn } = require('../llm/orchestrator');

const CONTINUATION_RE = /\b(more|another|others?|else|again)\b/i;

// Deliberately a curated list of near-exact phrases, not a loose
// "help"-word regex - a bare "help" inside a longer, unrelated sentence
// ("this would help me decide") must not hijack it.
//
// "how do i buy a property"/"how do i contact an agent"/"favorites
// work"/"inquiries work" used to be routed here too (to the generic
// capability list) - Phase 2 (Customer AI) gives them real, specific
// answers instead via get_faq_answer (see localEngine/faq.js), so
// they're deliberately no longer part of this generic fallback. "how
// does the platform work" stays here - it's genuinely broad enough that
// the capability list IS the right answer.
const HELP_INTENT_RE = /^(help|who are you\??|what can you do\??|what can i ask you\??|show me examples\.?|how do(?:es)? the platform work\??)$/i;

// Below this, a matchIntent() result is treated as too weak to trust and
// escalates to the LLM (Phase 3) instead of executing. Kept at 9 (one
// point above KEYWORD_WEIGHT=8) deliberately: a bare single-keyword hit
// (flat weight 8, e.g. the 'bedrooms' keyword on search_properties) is
// exactly the kind of weak, out-of-context signal that must NOT resolve
// on its own, because it also fires inside pronoun follow-ups like "how
// many bedrooms does it have?" - a message that has no city/type/price
// of its own and needs the LLM's conversation memory to know "it" means
// the property just discussed, not a fresh, unfiltered search. This was
// verified the hard way: an earlier attempt to lower this constant to 8
// (to fix a real bug below) passed a fresh trigger-vs-itself sweep but
// then broke aiLlmEscalation.test.js, because it also let that bare
// 'bedrooms' keyword hijack a follow-up question that used to correctly
// escalate. Lowering a threshold shared by every tool's keyword score is
// too blunt an instrument for a problem that only affects a handful of
// specific, genuinely-standalone trigger phrases.
//
// The real bug - a systematic sweep (every trigger phrase in this
// codebase, matched against itself as if it were the entire message)
// found 30 pre-existing, complete, unambiguous phrases ("who am i", "my
// tasks", "overview", "upcoming", "todo", "new task", "due soon", etc)
// silently failing because they happen to score below 9 as a short
// standalone trigger - is fixed at the source instead: matcher.js's
// `exactMatchEligible` opt-in (see there) grants a bonus ONLY when the
// user's entire trimmed message exactly equals one of that intent's
// trigger phrases, never for a partial/substring match. That distinction
// is exactly the "who am i" (deliberate, complete) vs "bedrooms" (a
// fragment inside a longer, ambiguous sentence) split this constant
// alone can't express. Intents opted in: get_current_user,
// get_subscription, list_tasks, create_task, get_dashboard_summary,
// get_upcoming_reminders, get_favorite_properties - each audited to
// confirm none of their short triggers are connector words meant to
// combine (unlike search_properties' 'under'/'crore'/'at least'/etc,
// which intentionally do NOT opt in, so a bare "crore" with nothing else
// still correctly escalates instead of running a filterless search).
// Re-swept via the trigger-vs-itself script after this change: 17
// triggers remain below 9, all 17 the intentional search_properties
// connector words above - zero genuine standalone phrases left
// unresolved.
const CONFIDENCE_THRESHOLD = 9;

// The deterministic path here is: keyword-match the message to one of
// this role's tools, extract arguments with plain regex/heuristics,
// execute the real backend service through ai.tools.js's existing
// role+tenant enforcement, and phrase the result. No LLM, no external
// API call, no network round trip beyond MongoDB - this remains the
// default, fast, free path for anything it's already confident about.
//
// Since Phase 3, a message the deterministic matcher has low confidence
// in (or no match at all) can escalate to an LLM orchestration layer
// (see ../llm/orchestrator.js) instead of immediately falling back to a
// generic "I didn't catch that" - but only when one is actually
// configured (isLlmAvailable()); with none configured (the default -
// zero LLM_* env vars set) this function's behavior is byte-identical to
// before Phase 3 existed. The LLM never executes anything directly -
// every tool call it proposes still goes through the same executeTool()
// gateway below, with the same role/tenant re-check, same confirmation
// gate for mutating tools, same audit trail.
//
// `memory` is the conversation's structured context object
// (Conversation.context), covering three generations of the same idea:
//   - Phase 1 fields (lastCity/lastType/lastTool/pendingAction) - read
//     and written exactly as before, unchanged by this phase.
//   - Phase 2 fields (entities/lastFilters/recentToolResults/turnCount/
//     needsSummarization) - see memory.js and summarization.js.
//   - Phase 3 reads (but doesn't add new fields to) this memory when
//     escalating, to give the LLM the same "what did we just look at"
//     context Phase 2 built for exactly this purpose.
// `recentMessages` (Phase 3, additive, optional) is the last handful of
// raw transcript turns - the deterministic path below ignores it
// entirely; only the LLM escalation branch reads it, for pure paraphrase
// follow-ups that aren't anchored to a remembered entity.
// Returns the updated memory so the caller (ai.service.js) can persist
// it verbatim - same contract as before, richer shape.
async function resolveMessage(message, ctx, memory = {}, recentMessages = []) {
  // turnCount/needsSummarization are computed once, up front, so every
  // return path below carries them - regardless of whether this turn is
  // small talk, a clarifying question, a confirmation, or a real tool
  // call. A real, cheap counter; not a summary itself (see
  // summarization.js for why one isn't generated here).
  const turnCount = (memory.turnCount || 0) + 1;
  const memoryBase = { ...memory, turnCount, needsSummarization: needsSummarization({ turnCount }) };

  // Confirmation gate for mutating tools (move_lead_stage/create_task/
  // create_appointment - see ai.tools.js's `mutates` flag). Checked
  // before small talk on purpose: "ok"/"sure" are recognized small-talk
  // words too (see smallTalk.js's THANKS_WORDS), and when there's a real
  // pending action those words must resolve as a confirmation, not get
  // swallowed by "You're welcome!".
  if (memoryBase.pendingAction) {
    const { tool, args } = memoryBase.pendingAction;
    const { pendingAction: _discard, ...clearedMemory } = memoryBase;

    if (isAffirmative(message)) {
      const result = await executeTool(tool, args, ctx);
      const text = buildReply(tool, result);
      const attachments = result?.renderAs && !result.error ? [{ tool, renderAs: result.renderAs, data: result }] : [];
      const updatedMemory = recordToolExecution(clearedMemory, tool, args, result);
      if (!result?.error) updatedMemory.lastTool = tool;
      return { text, attachments, matchedTool: tool, memory: updatedMemory };
    }
    if (isNegative(message)) {
      return { text: 'Cancelled - nothing was changed.', attachments: [], memory: clearedMemory };
    }
    // Anything else abandons the stale pending action (fails closed - it
    // simply never executes) and falls through to process this message
    // as a normal new request, rather than forcing an explicit cancel
    // first.
    memory = clearedMemory;
  } else {
    memory = memoryBase;
  }

  const smallTalk = matchSmallTalk(message, ctx.requester);
  if (smallTalk) {
    return { text: smallTalk, attachments: [], memory };
  }

  const toolsForRole = getToolsForRole(ctx.requester.role);
  const allowedNames = toolsForRole.map((t) => t.name);
  const nextMemory = { ...memory };

  // A direct ask for capabilities ("help", "what can you do", "who are
  // you") deserves the real, auto-derived capability list with an
  // intro that doesn't read as a misunderstanding (see templates.js's
  // buildHelpMessage `asked` option) - answered deterministically even
  // when an LLM is configured, since this list is generated straight
  // from the real tool registry (getToolsForRole) and is a more
  // reliable source of truth for "what can you do" than a free-form
  // LLM description would be.
  if (HELP_INTENT_RE.test(message.trim())) {
    return { text: buildHelpMessage(ctx.requester.role, toolsForRole, { asked: true }), attachments: [], memory: nextMemory };
  }

  // "show me more options" / "anything else?" carries no tool-specific
  // keyword on its own - if it's a bare continuation phrase right after
  // a successful search, re-run that same tool from remembered filters
  // instead of falling through to the help message.
  let { intent, score } = matchIntent(message, allowedNames);
  let resolvedViaContinuation = false;
  if (!intent && CONTINUATION_RE.test(message) && nextMemory.lastTool && allowedNames.includes(nextMemory.lastTool)) {
    intent = findByTool(nextMemory.lastTool);
    resolvedViaContinuation = true;
  }

  // A continuation match is treated as confident regardless of score (it
  // never had one to begin with - see findByTool above); only a genuine
  // matchIntent result is subject to the confidence check.
  if (!resolvedViaContinuation && (!intent || score < CONFIDENCE_THRESHOLD)) {
    if (isLlmAvailable()) {
      return runLlmTurn({ message, ctx, memory: nextMemory, recentMessages, toolsForRole });
    }
    return { text: buildHelpMessage(ctx.requester.role, toolsForRole), attachments: [], memory: nextMemory };
  }

  // Only updated once we know this message actually resolved to a real
  // tool - previously this ran unconditionally at the top of the
  // function, so a message that mentioned a city but failed to match
  // anything (falling through to the branch above) still silently set
  // lastCity, poisoning every later search in the conversation with a
  // city the user never actually confirmed for that later request. A
  // message extracts its OWN city/type independently inside
  // intent.extract() below regardless of this block - this only feeds
  // the *next* turn's fallback (a couple lines down), so gating it here
  // changes nothing about how the current message itself is answered.
  const mentionedCity = extractCity(message);
  if (mentionedCity) nextMemory.lastCity = mentionedCity;
  const mentionedType = extractType(message);
  if (mentionedType) nextMemory.lastType = mentionedType;

  const args = intent.extract(message) || {};
  if (intent.tool === 'search_properties' || intent.tool === 'estimate_property_price') {
    if (!args.city && nextMemory.lastCity) args.city = nextMemory.lastCity;
  }
  if (intent.tool === 'search_properties' && !args.type && nextMemory.lastType) {
    args.type = nextMemory.lastType;
  }
  // "unfavorite it" right after a favorites list/property was shown
  // shouldn't ask the user to go dig up an ID they were never shown
  // (favorite cards render title/price, not the raw ObjectId) - falls
  // back to the property the conversation was just discussing (Phase
  // 2's `entities.propertyId`, see memory.js's get_favorite_properties/
  // get_property_details summarizers). Scoped to only these two
  // mutating favorite tools, not a general pronoun resolver: they're the
  // one place a customer has no other way to name "it" at all (unlike
  // search results, which they can just re-describe), and both still
  // fall through to the existing clarify question if there's no
  // remembered property either.
  if ((intent.tool === 'add_favorite_property' || intent.tool === 'remove_favorite_property') && !args.propertyId && nextMemory.entities?.propertyId) {
    args.propertyId = nextMemory.entities.propertyId;
  }

  const missing = intent.requiredArgs.filter((field) => {
    const value = args[field];
    return value === undefined || value === null || (field === 'propertyIds' && Array.isArray(value) && value.length < 2);
  });

  if (missing.length > 0) {
    return { text: intent.clarify || `I need a bit more information: ${missing.join(', ')}.`, attachments: [], memory: nextMemory };
  }

  // Mutating tools don't execute on the first match - they're staged as
  // a pending action and only run once the user actually confirms (see
  // the pendingAction gate at the top of this function). This is the
  // one behavioral difference between a read tool and a write tool in
  // this engine; everything else about them is identical.
  if (TOOL_DEFINITIONS[intent.tool]?.mutates) {
    nextMemory.pendingAction = { tool: intent.tool, args };
    return { text: buildConfirmationPrompt(intent.tool, args), attachments: [], memory: nextMemory };
  }

  const result = await executeTool(intent.tool, args, ctx);
  // Filters the user asked for that this tool has no real parameter for
  // (e.g. an area range on search_properties) - detected from the raw
  // message, not from `args`, since an unsupported filter by definition
  // never made it into args. Only a handful of intents define this (see
  // toolIntents.js's `detectUnsupported`); everything else gets [].
  const unsupportedNotes = intent.detectUnsupported ? intent.detectUnsupported(message) : [];
  const text = buildReply(intent.tool, result, unsupportedNotes);
  const attachments = result?.renderAs && !result.error ? [{ tool: intent.tool, renderAs: result.renderAs, data: result }] : [];

  const updatedMemory = recordToolExecution(nextMemory, intent.tool, args, result);
  if (!result?.error) updatedMemory.lastTool = intent.tool;

  return { text, attachments, matchedTool: intent.tool, memory: updatedMemory };
}

module.exports = { resolveMessage };
