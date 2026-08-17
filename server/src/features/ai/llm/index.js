// Active LLM provider resolver. Only one concrete adapter ships today
// (see providers/openaiCompatible.provider.js's own header for why that
// covers Gemini/OpenAI/Azure OpenAI/Ollama without a second file) so
// this is a direct require, not a registry object like
// shared/storage/index.js's PROVIDERS map - that pattern is worth
// reintroducing here only once a second, genuinely different-wire-format
// adapter actually exists. Adding one then: implement
// provider.interface.js's contract in a new providers/*.js file, then
// swap the require below (or reintroduce a small registry keyed by an
// env var, mirroring storage's MEDIA_PROVIDER convention).
const provider = require('./providers/openaiCompatible.provider');

function isLlmAvailable() {
  return provider.isConfigured();
}

module.exports = { isLlmAvailable, provider };
