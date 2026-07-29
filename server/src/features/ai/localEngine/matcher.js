const { TOOL_INTENTS } = require('./toolIntents');

const KEYWORD_WEIGHT = 8;

// Deterministic keyword scoring - no ML model, no embeddings. Two
// signals combine: `triggers` are multi-word phrases matched as
// substrings (weight = phrase length, rewarding specificity), `keywords`
// are single words matched on a word boundary (flat weight) so real
// phrasing variance - "Search my available house listings" vs "show
// houses in Lahore" - still accumulates a real score without requiring
// an exact phrase. Highest total score wins; ties go to whichever tool
// was checked first (TOOL_INTENTS order).
function matchIntent(message, allowedToolNames) {
  const lower = message.toLowerCase();
  let best = null;

  for (const intent of TOOL_INTENTS) {
    if (!allowedToolNames.includes(intent.tool)) continue;

    let score = 0;
    for (const trigger of intent.triggers) {
      if (lower.includes(trigger)) score += trigger.length;
    }
    for (const keyword of intent.keywords || []) {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(lower)) score += KEYWORD_WEIGHT;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { intent, score };
    }
  }

  return best?.intent || null;
}

module.exports = { matchIntent };
