const { executeTool, TOOL_DEFINITIONS } = require('../ai.tools');
const { recordToolExecution } = require('../localEngine/memory');
const { buildConfirmationPrompt, buildHelpMessage } = require('../localEngine/templates');
const auditLogService = require('../../audit/auditLog.service');
const { buildSystemPrompt, buildMessages } = require('./prompts');
const { getPersona } = require('./personas');
const defaultProvider = require('./index').provider;

// Hard caps so a slow-but-not-technically-timed-out provider (or a model
// that keeps requesting more tools) can't chain into an unbounded turn.
// Worst case without these: MAX_LLM_ITERATIONS x (provider timeout +
// executeTool's own 8s timeout) - the wall-clock budget is the real
// backstop, the iteration cap alone doesn't bound worst-case latency.
const MAX_LLM_ITERATIONS = 5;
const WALL_CLOCK_BUDGET_MS = 35000;

const CAP_REACHED_MESSAGE = "I gathered some information but couldn't fully resolve this yet - could you rephrase or narrow down what you're looking for?";

function toWireToolCallLog(toolCallOrder) {
  return toolCallOrder.map((entry, i) => ({ ...entry, order: i + 1 }));
}

// Self-contained, symmetric with how ai.tools.js's executeTool audits
// its own ai.tool_call rows - the caller (localEngine/index.js) never
// has to know this happened. Never logs raw prompt/completion text or
// reasoning, only structured metadata - chain-of-thought stays
// unexposed at the storage layer, not just the UI.
async function auditLlmCall(ctx, { outcome, success, reason, iterations, toolCallOrder, usage, model, durationMs }) {
  await auditLogService.record({
    tenantId: ctx.tenantId,
    actor: ctx.requester,
    action: 'ai.llm_call',
    targetType: 'AiLlmTurn',
    targetId: null,
    metadata: {
      source: 'ai_chat',
      provider: 'openai_compatible',
      model,
      outcome,
      success,
      reason,
      iterations,
      toolCallOrder: toWireToolCallLog(toolCallOrder),
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      estimatedCostUsd: null, // no pricing table yet - see Phase 3 report roadmap
      durationMs,
    },
  });
}

function addUsage(total, usage) {
  return {
    promptTokens: (total.promptTokens || 0) + (usage?.promptTokens || 0),
    completionTokens: (total.completionTokens || 0) + (usage?.completionTokens || 0),
    totalTokens: (total.totalTokens || 0) + (usage?.totalTokens || 0),
  };
}

// The LLM-escalation counterpart to localEngine/index.js's resolveMessage
// deterministic path - same return shape ({text, attachments, matchedTool,
// memory}), same reused primitives (executeTool, recordToolExecution,
// buildConfirmationPrompt), so the caller doesn't need to know or care
// which path actually ran. The LLM only ever *proposes* {tool, args} -
// every real execution still goes through the exact same executeTool()
// gateway (role/tenant re-check, timeout, retry, ai.tool_call audit),
// and a proposed mutating tool stages memory.pendingAction and stops,
// exactly like the deterministic path - the confirmation gate at the top
// of resolveMessage() already handles resolving it next turn with zero
// changes, since it only cares about the shared pendingAction field, not
// who staged it.
async function runLlmTurn({ message, ctx, memory, recentMessages = [], toolsForRole, provider = defaultProvider }) {
  const startedAt = Date.now();
  // Load Persona (Phase 4): pure tone/wording/priority guidance, keyed
  // only by the authenticated role already on ctx - never affects which
  // tools are offered (toolsForRole, passed through unchanged below) or
  // how executeTool() authorizes them.
  const persona = getPersona(ctx.requester.role).guidance;
  const systemPrompt = buildSystemPrompt({ role: ctx.requester.role, memory, persona });
  const messages = buildMessages({ message, recentMessages });
  const toolCallOrder = [];
  let workingMemory = memory;
  const attachments = [];
  let usageTotal = {};
  let lastModel;

  for (let iteration = 1; iteration <= MAX_LLM_ITERATIONS; iteration += 1) {
    if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) {
      await auditLlmCall(ctx, { outcome: 'iteration_cap_reached', success: false, reason: 'wall_clock_budget', iterations: iteration - 1, toolCallOrder, usage: usageTotal, model: lastModel, durationMs: Date.now() - startedAt });
      return { text: CAP_REACHED_MESSAGE, attachments, memory: workingMemory };
    }

    let response;
    try {
      response = await provider.chat({ systemPrompt, messages, tools: toolsForRole });
    } catch (err) {
      await auditLlmCall(ctx, { outcome: 'provider_error', success: false, reason: err.message, iterations: iteration - 1, toolCallOrder, usage: usageTotal, model: lastModel, durationMs: Date.now() - startedAt });
      return { text: buildHelpMessage(ctx.requester.role, toolsForRole), attachments: [], memory: workingMemory };
    }

    lastModel = response.model || lastModel;
    usageTotal = addUsage(usageTotal, response.usage);

    if (!response.toolCalls?.length) {
      await auditLlmCall(ctx, { outcome: 'answered', success: true, iterations: iteration, toolCallOrder, usage: usageTotal, model: lastModel, durationMs: Date.now() - startedAt });
      return {
        text: response.content || CAP_REACHED_MESSAGE,
        attachments,
        matchedTool: toolCallOrder.at(-1)?.tool,
        memory: workingMemory,
      };
    }

    // A batch containing any mutating tool halts for confirmation
    // immediately - never auto-executes a write, and never executes
    // other calls from the same batch first (fails closed, same
    // discipline as the deterministic path's mutates gate).
    const mutatingCall = response.toolCalls.find((tc) => TOOL_DEFINITIONS[tc.name]?.mutates);
    if (mutatingCall) {
      workingMemory = { ...workingMemory, pendingAction: { tool: mutatingCall.name, args: mutatingCall.arguments } };
      await auditLlmCall(ctx, { outcome: 'confirmation_required', success: true, iterations: iteration, toolCallOrder, usage: usageTotal, model: lastModel, durationMs: Date.now() - startedAt });
      return { text: buildConfirmationPrompt(mutatingCall.name, mutatingCall.arguments), attachments, memory: workingMemory };
    }

    messages.push({ role: 'assistant', content: response.content || null, toolCalls: response.toolCalls });

    // eslint-disable-next-line no-await-in-loop
    for (const toolCall of response.toolCalls) {
      // eslint-disable-next-line no-await-in-loop
      const result = await executeTool(toolCall.name, toolCall.arguments, ctx);
      workingMemory = recordToolExecution(workingMemory, toolCall.name, toolCall.arguments, result);
      toolCallOrder.push({ tool: toolCall.name, mutates: false });
      if (result?.renderAs && !result.error) attachments.push({ tool: toolCall.name, renderAs: result.renderAs, data: result });
      messages.push({ role: 'tool', toolCallId: toolCall.id, content: JSON.stringify(result) });
    }
  }

  await auditLlmCall(ctx, { outcome: 'iteration_cap_reached', success: false, reason: 'max_iterations', iterations: MAX_LLM_ITERATIONS, toolCallOrder, usage: usageTotal, model: lastModel, durationMs: Date.now() - startedAt });
  return { text: CAP_REACHED_MESSAGE, attachments, memory: workingMemory };
}

module.exports = { runLlmTurn, MAX_LLM_ITERATIONS, WALL_CLOCK_BUDGET_MS, CAP_REACHED_MESSAGE };
