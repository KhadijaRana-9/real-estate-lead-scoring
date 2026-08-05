// Extension point for future long-conversation summarization - NOT
// implemented here. A deterministic pseudo-summary (e.g. truncating or
// concatenating old messages) would just be truncation mislabeled as
// summarization, which is worse than having no summary at all. Real
// summarization needs an LLM to actually compress meaning, which this
// phase deliberately does not introduce (see Phase 3).
//
// What this module gives Phase 3 instead: a single, obvious integration
// point (`summarizeConversation`) and a real, honestly-computed trigger
// (`needsSummarization`, driven by the conversation's actual turn count -
// see localEngine/index.js, which increments `memory.turnCount` once per
// resolveMessage call regardless of which path a turn takes). Nothing
// today calls summarizeConversation; nothing acts on needsSummarization
// beyond exposing it as a flag on the conversation's memory, so it's
// visible/testable without pretending to be functional yet.

// Arbitrary today - there's no real usage data yet to tune this against.
// Revisit once Phase 3 needs to decide when a transcript is actually too
// large for an LLM's context window.
const SUMMARIZATION_TURN_THRESHOLD = 40;

function needsSummarization(memory) {
  return (memory?.turnCount || 0) >= SUMMARIZATION_TURN_THRESHOLD;
}

// Deliberately unimplemented. Phase 3 replaces this body with a real LLM
// call over the conversation's `messages`, producing a compact digest of
// older turns to prepend to the LLM's context instead of replaying the
// entire transcript. Throws rather than silently returning a fake
// summary, so any accidental call surfaces immediately instead of
// quietly degrading conversation quality.
function summarizeConversation() {
  throw new Error('summarizeConversation is not implemented - requires an LLM (Phase 3+).');
}

module.exports = { needsSummarization, summarizeConversation, SUMMARIZATION_TURN_THRESHOLD };
