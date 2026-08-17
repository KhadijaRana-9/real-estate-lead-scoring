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

// Tight window on credential-guessing surfaces (refresh, platform login,
// invite-accept, apply-to-agency - see their respective routes files).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTestEnv ? 100000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// Same budget as authLimiter, but a SEPARATE instance dedicated to
// /auth/login only (BUG-002 fix). Previously login shared authLimiter's one
// counter with signup/registration, so a user retrying a few times after a
// failed login attempt (very plausible - see BUG-001, which made correct
// passwords look wrong) could burn through the shared budget and get
// locked out of signing up or registering a brand-new agency too, not just
// logging in. Independent express-rate-limit instances get independent
// counters even on the same IP, so exhausting one no longer blocks the
// other - same abuse-protection strength (identical windowMs/limit), just
// scoped to the one surface it actually protects.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTestEnv ? 100000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// Same budget again, dedicated to identity-creation surfaces that were
// previously sharing authLimiter's counter with /auth/login: /auth/signup
// and /agency-registrations (BUG-002 fix, see loginLimiter above).
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTestEnv ? 100000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// Same budget again, dedicated to /auth/refresh only. Refresh is
// fundamentally different traffic from the rest of authLimiter's
// consumers (/platform/login, /agency/invites/accept, /agency/applications)
// - it fires automatically on any 401 anywhere in the app, not from a
// single deliberate human action, so it was able to silently exhaust the
// shared budget those other, rare, one-off actions depend on (same class
// of bug as BUG-002 above, just on the token-refresh surface instead of
// login/signup).
const refreshLimiter = rateLimit({
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

// The AI Assistant (see features/ai) runs fully offline by default -
// local keyword/entity matching against MongoDB-backed tools. Since
// Phase 3, low-confidence turns can escalate to an optional, separately-
// configured LLM provider (features/ai/llm/) - most traffic still stays
// on the free/instant deterministic path, so this limit remains sized as
// a backstop against a runaway client loop rather than a per-request
// cost control. Revisit with real usage data once LLM escalation is
// live in production; a stricter, dedicated cap is intentionally not
// added speculatively (see the Phase 3 plan's rationale).
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

module.exports = { apiLimiter, authLimiter, loginLimiter, signupLimiter, refreshLimiter, inquiryLimiter, aiLimiter, uploadLimiter };
