const { matchIntent } = require('./matcher');
const { findByTool } = require('./toolIntents');
const { buildReply, buildHelpMessage, buildConfirmationPrompt } = require('./templates');
const { extractCity, extractType } = require('./entities');
const { matchSmallTalk } = require('./smallTalk');
const { isAffirmative, isNegative } = require('./confirmations');
const { recordToolExecution } = require('./memory');
const { needsSummarization } = require('./summarization');
const { getToolsForRole, executeTool, TOOL_DEFINITIONS } = require('../ai.tools');

const CONTINUATION_RE = /\b(more|another|others?|else|again)\b/i;

// The entire "AI" here is: keyword-match the message to one of this
// role's tools, extract arguments with plain regex/heuristics, execute
// the real backend service through ai.tools.js's existing role+tenant
// enforcement, and phrase the result. No LLM, no external API call, no
// network round trip beyond MongoDB - this can run fully offline.
//
// `memory` is the conversation's structured context object
// (Conversation.context), covering two generations of the same idea:
//   - Phase 1 fields (lastCity/lastType/lastTool/pendingAction) - read
//     and written exactly as before, unchanged by this phase.
//   - Phase 2 fields (entities/lastFilters/recentToolResults/turnCount/
//     needsSummarization) - see memory.js and summarization.js. These
//     let a follow-up like "why is it performing well?" eventually be
//     answered without re-asking which property was meant, once an LLM
//     exists to actually reason over them (Phase 3). The deterministic
//     engine here only *writes* them today; it doesn't read them back to
//     change its own behavior, same as Phase 1 left `pendingAction` as
//     write-then-read-next-turn but nothing fancier.
// Returns the updated memory so the caller (ai.service.js) can persist
// it verbatim - same contract as before, richer shape.
async function resolveMessage(message, ctx, memory = {}) {
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

  const mentionedCity = extractCity(message);
  if (mentionedCity) nextMemory.lastCity = mentionedCity;
  const mentionedType = extractType(message);
  if (mentionedType) nextMemory.lastType = mentionedType;

  // "show me more options" / "anything else?" carries no tool-specific
  // keyword on its own - if it's a bare continuation phrase right after
  // a successful search, re-run that same tool from remembered filters
  // instead of falling through to the help message.
  let intent = matchIntent(message, allowedNames);
  if (!intent && CONTINUATION_RE.test(message) && nextMemory.lastTool && allowedNames.includes(nextMemory.lastTool)) {
    intent = findByTool(nextMemory.lastTool);
  }

  if (!intent) {
    return { text: buildHelpMessage(ctx.requester.role, toolsForRole), attachments: [], memory: nextMemory };
  }

  const args = intent.extract(message) || {};
  if (intent.tool === 'search_properties' || intent.tool === 'estimate_property_price') {
    if (!args.city && nextMemory.lastCity) args.city = nextMemory.lastCity;
  }
  if (intent.tool === 'search_properties' && !args.type && nextMemory.lastType) {
    args.type = nextMemory.lastType;
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
  const text = buildReply(intent.tool, result);
  const attachments = result?.renderAs && !result.error ? [{ tool: intent.tool, renderAs: result.renderAs, data: result }] : [];

  const updatedMemory = recordToolExecution(nextMemory, intent.tool, args, result);
  if (!result?.error) updatedMemory.lastTool = intent.tool;

  return { text, attachments, matchedTool: intent.tool, memory: updatedMemory };
}

module.exports = { resolveMessage };
