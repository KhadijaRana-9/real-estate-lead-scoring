const express = require('express');
const controller = require('./auth.controller');
const auth = require('../../shared/middleware/auth');
const validate = require('../../shared/middleware/validate');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const { loginLimiter, signupLimiter, refreshLimiter } = require('../../shared/middleware/rateLimiters');
const { signupSchema, loginSchema, refreshSchema, logoutSchema, updateMeSchema } = require('./auth.schema');

const router = express.Router();

// signup/login are the entry point that DETERMINES a user's tenant, so
// resolveTenant runs from host/workspace/default here - there's no
// req.user yet to trust.
router.post('/signup', signupLimiter, resolveTenant(), validate(signupSchema), controller.signup);
// login does NOT fall back to DEFAULT_AGENCY_SLUG (see resolveTenant.js) -
// unlike signup (creating a brand-new account, where "assume the default
// agency" is a harmless guess for an anonymous visitor), login is proving
// an EXISTING account's identity, and guessing wrong here means searching
// the wrong agency's users entirely (BUG-001: correct credentials silently
// fail with "Invalid email or password" for any agency other than the
// default one, from any entry point that doesn't carry ?workspace=, e.g.
// the Navbar/Footer links). required: false lets req.tenant come through
// as null when nothing resolves, so auth.service.js's login() can instead
// resolve the account by identity (email) - see its own comment.
// enforceSuspension: false likewise defers to auth.service.js's login(),
// which only discloses a suspended/pending/rejected agency's status AFTER
// verifying the password - resolveTenant's own immediate suspended-check
// would otherwise leak that status to anyone who merely guesses a
// workspace slug, without any valid credentials at all (FIND-01).
router.post('/login', loginLimiter, resolveTenant({ required: false, allowDefaultFallback: false, enforceSuspension: false }), validate(loginSchema), controller.login);
router.post('/refresh', refreshLimiter, validate(refreshSchema), controller.refresh);
router.post('/logout', validate(logoutSchema), controller.logout);

router.get('/me', auth, controller.me);
router.patch('/me', auth, validate(updateMeSchema), controller.updateMe);
router.get('/sessions', auth, controller.sessions);
router.delete('/sessions/:id', auth, controller.revokeSession);

module.exports = router;
