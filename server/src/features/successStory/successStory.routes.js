const express = require('express');
const auth = require('../../shared/middleware/auth');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const controller = require('./successStory.controller');
const { createSuccessStorySchema, listSuccessStoriesQuerySchema, moderateSchema } = require('./successStory.schema');

const router = express.Router();

router.get('/', validate(listSuccessStoriesQuerySchema), controller.list);
router.get('/mine', auth, requireRole('agency_admin'), resolveTenant(), controller.mine);
router.get('/pending', auth, requireRole('super_admin'), controller.pendingModeration);

router.post(
  '/',
  auth,
  requireRole('agency_admin'),
  resolveTenant(),
  validate(createSuccessStorySchema),
  controller.create
);

// Publishing to the public homepage is super_admin-gated - this is
// testimonial content shown platform-wide, so it gets the same
// moderation posture as Agency.verified rather than being
// self-published the moment an agency submits it.
router.patch('/:id/approve', auth, requireRole('super_admin'), validate(moderateSchema), controller.approve);
router.patch('/:id/reject', auth, requireRole('super_admin'), validate(moderateSchema), controller.reject);

module.exports = router;
