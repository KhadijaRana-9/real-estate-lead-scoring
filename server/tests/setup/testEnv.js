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
