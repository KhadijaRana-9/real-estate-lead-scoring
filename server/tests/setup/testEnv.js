// Runs before the test framework loads, so these are in place before any
// application module (env.js, auth.service.js, etc.) is required.
// Deliberately self-contained - does not depend on a developer's local
// .env file existing or having any particular shape.

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/realestate_test';
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN_DAYS = '30';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

// Deliberately NOT set: DEFAULT_AGENCY_SLUG. Tests resolve tenants
// explicitly via ?workspace=<slug> so isolation behavior is asserted
// against real, deliberate input rather than an implicit fallback.
delete process.env.DEFAULT_AGENCY_SLUG;
delete process.env.PLATFORM_ROOT_DOMAIN;

// Deliberately NOT set either: LLM_BASE_URL/LLM_API_KEY/LLM_MODEL (Phase
// 3, features/ai/llm/). Test determinism must never depend on whatever a
// developer's shell happens to have exported - explicitly cleared so the
// AI test suite always exercises the deterministic-only path unless a
// specific test opts into LLM escalation itself (see
// aiLlmEscalation.test.js, which sets these for the duration of that
// file only).
delete process.env.LLM_BASE_URL;
delete process.env.LLM_API_KEY;
delete process.env.LLM_MODEL;
