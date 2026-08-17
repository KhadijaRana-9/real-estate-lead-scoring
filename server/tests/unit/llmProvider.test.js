const provider = require('../../src/features/ai/llm/providers/openaiCompatible.provider');

// Plain object merge, not destructuring defaults - a destructured
// default kicks in on an explicit `undefined` too, which would make
// `setEnv({ baseUrl: undefined })` silently fall back to the default
// instead of clearing it. Object spread has no such gotcha: an explicit
// `undefined` in `overrides` really does win.
function setEnv(overrides = {}) {
  const values = { baseUrl: 'https://example.test/v1', apiKey: 'test-key', model: 'test-model', ...overrides };
  if (values.baseUrl === undefined) delete process.env.LLM_BASE_URL;
  else process.env.LLM_BASE_URL = values.baseUrl;
  if (values.apiKey === undefined) delete process.env.LLM_API_KEY;
  else process.env.LLM_API_KEY = values.apiKey;
  if (values.model === undefined) delete process.env.LLM_MODEL;
  else process.env.LLM_MODEL = values.model;
}

describe('openaiCompatible LLM provider', () => {
  afterEach(() => {
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
    if (global.fetch?.mockRestore) global.fetch.mockRestore();
  });

  describe('isConfigured', () => {
    it('is false when no env vars are set', () => {
      setEnv({ baseUrl: undefined, apiKey: undefined, model: undefined });
      expect(provider.isConfigured()).toBe(false);
    });

    it('is false when only some env vars are set', () => {
      setEnv({ apiKey: undefined });
      expect(provider.isConfigured()).toBe(false);
    });

    it('is true when all three env vars are set', () => {
      setEnv();
      expect(provider.isConfigured()).toBe(true);
    });

    it('reads process.env fresh every call, never caches', () => {
      setEnv();
      expect(provider.isConfigured()).toBe(true);
      delete process.env.LLM_API_KEY;
      expect(provider.isConfigured()).toBe(false);
    });
  });

  describe('chat', () => {
    beforeEach(() => setEnv());

    it('parses a plain text response with no tool calls', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'test-model',
          choices: [{ message: { content: 'Here are some houses in Lahore.' } }],
          usage: { prompt_tokens: 42, completion_tokens: 8, total_tokens: 50 },
        }),
      });

      const result = await provider.chat({ systemPrompt: 'sys', messages: [{ role: 'user', content: 'hi' }], tools: [] });

      expect(result.content).toBe('Here are some houses in Lahore.');
      expect(result.toolCalls).toEqual([]);
      expect(result.usage).toEqual({ promptTokens: 42, completionTokens: 8, totalTokens: 50 });
      expect(result.model).toBe('test-model');
    });

    it('parses a tool-call response into the neutral shape with already-parsed arguments', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'test-model',
          choices: [
            {
              message: {
                content: null,
                tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'search_properties', arguments: '{"city":"Lahore"}' } }],
              },
            },
          ],
          usage: {},
        }),
      });

      const result = await provider.chat({ systemPrompt: 'sys', messages: [], tools: [] });

      expect(result.toolCalls).toEqual([{ id: 'call_1', name: 'search_properties', arguments: { city: 'Lahore' } }]);
    });

    it('sends role-filtered tools translated into the wire function-calling shape', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
      });

      await provider.chat({
        systemPrompt: 'sys',
        messages: [],
        tools: [{ name: 'search_properties', description: 'Search listings', parameters: { type: 'object', properties: {} } }],
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.tools).toEqual([
        { type: 'function', function: { name: 'search_properties', description: 'Search listings', parameters: { type: 'object', properties: {} } } },
      ]);
      expect(body.tool_choice).toBe('auto');
    });

    it('translates neutral assistant/tool messages into the wire format', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
      });

      await provider.chat({
        systemPrompt: 'sys',
        messages: [
          { role: 'user', content: 'houses in Lahore' },
          { role: 'assistant', content: null, toolCalls: [{ id: 'call_1', name: 'search_properties', arguments: { city: 'Lahore' } }] },
          { role: 'tool', toolCallId: 'call_1', content: 'Found 3 properties in Lahore.' },
        ],
        tools: [],
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' });
      expect(body.messages[2]).toEqual({
        role: 'assistant',
        content: null,
        tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'search_properties', arguments: '{"city":"Lahore"}' } }],
      });
      expect(body.messages[3]).toEqual({ role: 'tool', tool_call_id: 'call_1', content: 'Found 3 properties in Lahore.' });
    });

    it('throws with the response body on a non-ok HTTP response, never swallowing it', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 429, text: async () => 'rate limited' });

      await expect(provider.chat({ systemPrompt: 'sys', messages: [], tools: [] })).rejects.toThrow(/429/);
    });

    it('throws a clear timeout error when the request is aborted', async () => {
      jest.spyOn(global, 'fetch').mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }));

      await expect(provider.chat({ systemPrompt: 'sys', messages: [], tools: [] })).rejects.toThrow(/timed out/);
    }, 20000);
  });
});
