const { TOOL_INTENTS } = require('./toolIntents');

const KEYWORD_WEIGHT = 8;

// A short trigger phrase typed as a user's *entire* message ("who am
// i", "overview", "todo") is a deliberate, unambiguous request - very
// different from that same short text merely appearing inside a longer,
// possibly-unrelated sentence ("how many bedrooms does it have" contains
// no full-phrase intent by itself, it's a pronoun follow-up that needs
// conversation memory, not a keyword-length trigger score). This bonus
// only fires on that first, narrow case (exact full-message equality),
// and only for intents that opt in via `exactMatchEligible` - tools
// whose short triggers double as deliberately-partial connector words
// (e.g. search_properties' 'under', 'crore', 'at least' - meant to
// combine with a property-type keyword, never to stand alone) do not
// opt in, so a bare "crore" with nothing else still correctly falls
// through to LLM escalation/help instead of running an unfiltered
// search.
const EXACT_MATCH_BONUS = 10;

// A real 24-hex-char ObjectId in the message is a strong, distinctive
// signal on its own - a customer typing "who is the agent for property
// <id>" or "what amenities does property <id> have" has no registered
// trigger phrase for every possible way to ask about one specific
// property, but the presence of a real id is unambiguous: they mean
// THAT property. Opt-in via `idBoost` (intents that take a single
// propertyId - get_property_details, add/remove favorite, recommend) so
// this never affects unrelated intents just because a message happens to
// contain a 24-char hex string.
const ID_BOOST = 10;
const OBJECT_ID_RE = /\b[0-9a-f]{24}\b/i;

// Deterministic keyword scoring - no ML model, no embeddings. Two
// signals combine: `triggers` are multi-word phrases matched as
// substrings (weight = phrase length, rewarding specificity), `keywords`
// are single words matched on a word boundary (flat weight) so real
// phrasing variance - "Search my available house listings" vs "show
// houses in Lahore" - still accumulates a real score without requiring
// an exact phrase. Highest total score wins; ties go to whichever tool
// was checked first (TOOL_INTENTS order).
//
// Returns { intent, score } always (score 0 and intent null when nothing
// matched), so a caller can tell a confident match apart from a weak one
// - see localEngine/index.js's LLM escalation decision (Phase 3), which
// is the only reason this is exposed rather than kept internal.
function matchIntent(message, allowedToolNames) {
  const lower = message.toLowerCase();
  const trimmed = lower.trim();
  const hasObjectId = OBJECT_ID_RE.test(message);
  let best = null;

  for (const intent of TOOL_INTENTS) {
    if (!allowedToolNames.includes(intent.tool)) continue;

    let score = 0;
    for (const trigger of intent.triggers) {
      if (lower.includes(trigger)) score += trigger.length;
      if (intent.exactMatchEligible && trimmed === trigger) score += EXACT_MATCH_BONUS;
    }
    for (const keyword of intent.keywords || []) {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(lower)) score += KEYWORD_WEIGHT;
    }
    if (intent.idBoost && hasObjectId) score += ID_BOOST;

    if (score > 0 && (!best || score > best.score)) {
      best = { intent, score };
    }
  }

  return { intent: best?.intent || null, score: best?.score || 0 };
}

module.exports = { matchIntent };
