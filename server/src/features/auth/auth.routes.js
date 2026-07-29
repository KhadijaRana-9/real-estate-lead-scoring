const express = require('express');
const controller = require('./auth.controller');
const auth = require('../../shared/middleware/auth');
const validate = require('../../shared/middleware/validate');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const { authLimiter } = require('../../shared/middleware/rateLimiters');
const { signupSchema, loginSchema, refreshSchema, logoutSchema } = require('./auth.schema');

const router = express.Router();

// signup/login are the entry point that DETERMINES a user's tenant, so
// resolveTenant runs from host/workspace/default here - there's no
// req.user yet to trust.
router.post('/signup', authLimiter, resolveTenant(), validate(signupSchema), controller.signup);
router.post('/login', authLimiter, resolveTenant(), validate(loginSchema), controller.login);
router.post('/refresh', authLimiter, validate(refreshSchema), controller.refresh);
router.post('/logout', validate(logoutSchema), controller.logout);

router.get('/me', auth, controller.me);
router.get('/sessions', auth, controller.sessions);
router.delete('/sessions/:id', auth, controller.revokeSession);

module.exports = router;
