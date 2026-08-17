// Every LLM provider adapter must export exactly this shape. Adding a
// new one (a genuinely different wire format, e.g. native Anthropic
// Messages API rather than an OpenAI-compatible endpoint) means a new
// file implementing this interface plus a one-line swap in llm/index.js
// - nothing in localEngine/orchestrator.js changes. Same contract-file
// convention as shared/storage/provider.interface.js.
//
// isConfigured() -> boolean
//   Reads process.env fresh on every call (never cached at require-time,
//   same discipline as billing/providers/stripeProvider.js) so the
//   deterministic engine can be asked "is LLM escalation even possible"
//   without attempting a real call first. Never throws.
//
// chat({ systemPrompt, messages, tools }) -> Promise<{ content, toolCalls, usage, model }>
//   `messages` is [{ role: 'user'|'assistant'|'tool', content, ... }] in
//   the orchestrator's neutral shape - the adapter is responsible for
//   translating to/from whatever wire format the underlying provider
//   speaks, including turning `tools` (the plain { name, description,
//   parameters }[] shape already returned by ai.tools.js's
//   getToolsForRole()) into that provider's function-calling schema.
//   `toolCalls` in the response is always the neutral, already-parsed
//   shape [{ id, name, arguments: object }] - never a raw JSON string
//   the caller has to parse itself. `content` is the final text answer
//   (only meaningful when toolCalls is empty). `usage` is
//   { promptTokens, completionTokens, totalTokens } with any field the
//   provider doesn't report left undefined - never fabricated.
//   Throws (does not swallow) on a genuine network/timeout/parse
//   failure - the orchestrator is responsible for catching that and
//   degrading gracefully, same division of responsibility as
//   ai.tools.js's executeTool vs. its EXECUTORS.
module.exports = {};
