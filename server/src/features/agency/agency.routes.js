const express = require('express');
const auth = require('../../shared/middleware/auth');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const { authLimiter } = require('../../shared/middleware/rateLimiters');
const controller = require('./agency.controller');
const { inviteUserSchema, idParamSchema, acceptInviteSchema, updateBrandingSchema } = require('./agency.schema');

const router = express.Router();

// Public - the invitee isn't logged in yet, only holds the emailed
// token. Rate-limited like every other unauthenticated credential-bearing
// endpoint (login/signup) to slow down token-guessing.
router.post('/invites/accept', authLimiter, validate(acceptInviteSchema), controller.acceptInvite);

router.use(auth, resolveTenant(), requireRole('agency_admin'));

router.get('/performance', controller.getPerformance);
router.get('/branding', controller.getBranding);
router.patch('/branding', validate(updateBrandingSchema), controller.updateBranding);
router.post('/invites', validate(inviteUserSchema), controller.inviteUser);
router.get('/invites', controller.listInvites);
router.delete('/invites/:id', validate(idParamSchema), controller.revokeInvite);

module.exports = router;
