// Adapter for any backend speaking the OpenAI chat-completions wire
// format - which covers the first shipped provider (Gemini's
// OpenAI-compatible endpoint) plus OpenAI itself, Azure OpenAI, and
// Ollama, all without a second adapter file. Swapping between any of
// those is an env var change (LLM_BASE_URL/LLM_API_KEY/LLM_MODEL), never
// a code change - see provider.interface.js for the contract this
// implements and llm/index.js for how it's selected.
//
// Same gated-provider discipline as billing/providers/stripeProvider.js:
// isConfigured() reads process.env fresh every call (never cached at
// require-time), never throws for "not configured" - only a genuine
// network/timeout/parse failure throws, and only when chat() is actually
// invoked.

const LLM_CALL_TIMEOUT_MS = 15000;

function isConfigured() {
  return Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY && process.env.LLM_MODEL);
}

function toWireTool(tool) {
  return { type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } };
}

function toWireMessage(message) {
  if (message.role === 'tool') {
    return { role: 'tool', tool_call_id: message.toolCallId, content: message.content };
  }
  if (message.role === 'assistant' && message.toolCalls?.length) {
    return {
      role: 'assistant',
      content: message.content || null,
      tool_calls: message.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

// Wire tool call arguments arrive as a JSON string, not an object - a
// malformed one is a genuine parse failure (see provider.interface.js's
// "throws on parse failure" contract), not something to silently paper
// over with an empty object, since that would let the orchestrator call
// a tool with arguments the model never actually specified.
function parseToolCalls(rawToolCalls) {
  if (!rawToolCalls?.length) return [];
  return rawToolCalls.map((tc) => ({
    id: tc.id,
    name: tc.function?.name,
    arguments: JSON.parse(tc.function?.arguments || '{}'),
  }));
}

function parseUsage(usage) {
  if (!usage) return {};
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}

async function chat({ systemPrompt, messages, tools }) {
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;

  const body = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...(messages || []).map(toWireMessage)],
    ...(tools?.length ? { tools: tools.map(toWireTool), tool_choice: 'auto' } : {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_CALL_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('LLM provider request timed out.');
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`LLM provider request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0]?.message || {};
  return {
    content: choice.content || '',
    toolCalls: parseToolCalls(choice.tool_calls),
    usage: parseUsage(data.usage),
    model: data.model || model,
  };
}

module.exports = { isConfigured, chat, name: 'openai_compatible', LLM_CALL_TIMEOUT_MS };
