const rateLimit = require('express-rate-limit');

// Uses the default in-memory store, so limits are enforced per server
// instance. Fine for a single Node process; on a horizontally-scaled or
// serverless deployment (this app runs on Vercel) each instance counts
// independently, so the effective limit is (instances x limit). Swap in
// `rate-limit-redis` with a shared Redis store before that matters.

// The integration test suite makes far more than 10 auth requests across
// its full run, so the real production limits would make unrelated tests
// fail with 429s. Rather than skip the middleware in tests (which would
// leave it unexercised), the limit itself is raised in NODE_ENV=test -
// the real express-rate-limit middleware still runs on every request.
// Rate-limiting behavior itself is covered by a dedicated test that
// builds its own isolated limiter with a small explicit limit.
const isTestEnv = process.env.NODE_ENV === 'test';

// Applies to every /api/* request. Generous - this is a backstop against
// abusive/broken clients, not the primary defense for any one endpoint.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTestEnv ? 100000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

// Tight window on credential-guessing surfaces (signup/login/refresh).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTestEnv ? 100000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// Public, unauthenticated endpoint that writes to the DB and runs the
// scoring engine on every call - needs its own cap independent of auth.
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isTestEnv ? 100000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many inquiries submitted. Please try again later.' },
});

// The AI Assistant (see features/ai) runs fully offline - local
// keyword/entity matching against MongoDB-backed tools, no paid LLM API
// call behind it - so this doesn't need the tight per-request cost
// protection a real LLM integration would. Still capped independently of
// the general API limiter as a backstop against a runaway client loop,
// just at a limit generous enough for a normal back-and-forth
// conversation not to trip it.
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: isTestEnv ? 100000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many AI requests. Please wait a few minutes and try again.' },
});

// File uploads are expensive (disk/bandwidth, or a paid Cloudinary/S3
// call once configured) - its own cap independent of the general API limiter.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTestEnv ? 100000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many uploads. Please wait a few minutes and try again.' },
});

module.exports = { apiLimiter, authLimiter, inquiryLimiter, aiLimiter, uploadLimiter };
