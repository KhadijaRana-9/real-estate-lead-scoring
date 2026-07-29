const { matchIntent } = require('./matcher');
const { findByTool } = require('./toolIntents');
const { buildReply, buildHelpMessage } = require('./templates');
const { extractCity, extractType } = require('./entities');
const { getToolsForRole, executeTool } = require('../ai.tools');

const CONTINUATION_RE = /\b(more|another|others?|else|again)\b/i;

// The entire "AI" here is: keyword-match the message to one of this
// role's tools, extract arguments with plain regex/heuristics, execute
// the real backend service through ai.tools.js's existing role+tenant
// enforcement, and phrase the result. No LLM, no external API call, no
// network round trip beyond MongoDB - this can run fully offline.
//
// `memory` is the conversation's small persisted context object
// (Conversation.context) - it lets "show me more options" resolve
// against a city mentioned a few turns ago without an LLM holding the
// thread. Returns the updated memory so the caller can persist it.
async function resolveMessage(message, ctx, memory = {}) {
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

  const result = await executeTool(intent.tool, args, ctx);
  const text = buildReply(intent.tool, result);
  const attachments = result?.renderAs && !result.error ? [{ tool: intent.tool, renderAs: result.renderAs, data: result }] : [];

  if (!result?.error) nextMemory.lastTool = intent.tool;

  return { text, attachments, matchedTool: intent.tool, memory: nextMemory };
}

module.exports = { resolveMessage };
