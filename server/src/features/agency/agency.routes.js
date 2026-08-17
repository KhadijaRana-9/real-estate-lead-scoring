const express = require('express');
const auth = require('../../shared/middleware/auth');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const { authLimiter } = require('../../shared/middleware/rateLimiters');
const controller = require('./agency.controller');
const {
  inviteUserSchema,
  idParamSchema,
  acceptInviteSchema,
  updateBrandingSchema,
  updateProfileSchema,
  applyToAgencySchema,
  rejectApplicationSchema,
  listApplicationsQuerySchema,
} = require('./agency.schema');

const router = express.Router();

// Public - the invitee isn't logged in yet, only holds the emailed
// token. Rate-limited like every other unauthenticated credential-bearing
// endpoint (login/signup) to slow down token-guessing.
router.post('/invites/accept', authLimiter, validate(acceptInviteSchema), controller.acceptInvite);

// Public - an agent (or anyone) applying to join an agency, chosen from
// the public marketplace directory, has no session yet. Rate-limited
// like the invite-accept route above since it also collects a password.
router.post('/applications', authLimiter, validate(applyToAgencySchema), controller.applyToAgency);

router.use(auth, requireRole('agency_admin'), resolveTenant());

router.get('/performance', controller.getPerformance);
router.get('/branding', controller.getBranding);
router.patch('/branding', validate(updateBrandingSchema), controller.updateBranding);
router.get('/profile', controller.getProfile);
router.patch('/profile', validate(updateProfileSchema), controller.updateProfile);
router.post('/invites', validate(inviteUserSchema), controller.inviteUser);
router.get('/invites', controller.listInvites);
router.delete('/invites/:id', validate(idParamSchema), controller.revokeInvite);

router.get('/team', controller.listTeamMembers);
router.delete('/team/:id', validate(idParamSchema), controller.removeTeamMember);

// Agency Owner/Admin reviews agent applications - approval authority
// stays with the agency, never Super Admin (see platform/agencies.js
// for the separate, unrelated agency-approval flow).
router.get('/applications', validate(listApplicationsQuerySchema), controller.listApplications);
router.post('/applications/:id/approve', validate(idParamSchema), controller.approveApplication);
router.post('/applications/:id/reject', validate(rejectApplicationSchema), controller.rejectApplication);

module.exports = router;
