const http = require('http');

// A real local HTTP server speaking the OpenAI-compatible chat-
// completions wire format, so integration tests exercise the actual
// openaiCompatible.provider.js fetch/parse code path - not a bypass -
// while requiring zero real network access and no real API key. This
// codebase's other tests are 100% real-integration (real Mongo, real
// supertest, zero jest.mock) - this preserves that convention for the
// HTTP layer instead of introducing module mocking here.
function createFakeLlmServer() {
  let queue = [];
  const requests = [];

  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      let body = null;
      try {
        body = JSON.parse(raw);
      } catch {
        body = null;
      }
      requests.push(body);

      if (req.method !== 'POST' || !req.url.endsWith('/chat/completions')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'fake LLM server: unexpected route' }));
        return;
      }

      const next = queue.shift();
      if (!next) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'fake LLM server: no scripted response queued for this request' }));
        return;
      }

      res.writeHead(next.status || 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(next.body || {}));
    });
  });

  function start() {
    return new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        resolve(`http://127.0.0.1:${server.address().port}`);
      });
    });
  }

  function close() {
    return new Promise((resolve) => server.close(() => resolve()));
  }

  // Queues one or more scripted responses, consumed in order - the Nth
  // request this server receives gets the Nth scripted response.
  function script(...responses) {
    queue.push(...responses);
  }

  function reset() {
    queue = [];
    requests.length = 0;
  }

  return { start, close, script, reset, requests };
}

// OpenAI-compatible response builders, matching what
// openaiCompatible.provider.js actually parses (see its parseToolCalls/
// parseUsage) - kept here rather than duplicated in every test.
function textResponse(content, usage) {
  return { body: { model: 'fake-model', choices: [{ message: { content, tool_calls: undefined } }], usage } };
}

function toolCallResponse(toolCalls, usage) {
  return {
    body: {
      model: 'fake-model',
      choices: [
        {
          message: {
            content: null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) },
            })),
          },
        },
      ],
      usage,
    },
  };
}

module.exports = { createFakeLlmServer, textResponse, toolCallResponse };
