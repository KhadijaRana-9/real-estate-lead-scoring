const express = require('express');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const controller = require('./developer.controller');
const {
  createDeveloperSchema,
  updateDeveloperSchema,
  listDevelopersQuerySchema,
  slugParamSchema,
  setFlagSchema,
} = require('./developer.schema');

const router = express.Router();

// Public, platform-wide directory - same posture as the agency
// marketplace: no tenant, no auth required to browse.
router.get('/', validate(listDevelopersQuerySchema), controller.list);
router.get('/top', controller.top);
router.get('/:slug', validate(slugParamSchema), controller.getBySlug);

// Any agency_admin can onboard a developer partner's profile, same as an
// agency inviting a partner into the marketplace; super_admin can too.
// `verified`/`featured` stay locked behind super_admin-only routes below,
// matching Agency's badge-integrity pattern exactly.
router.post('/', auth, requireRole('agency_admin', 'super_admin'), validate(createDeveloperSchema), controller.create);
router.patch('/:id', auth, requireRole('agency_admin', 'super_admin'), validate(updateDeveloperSchema), controller.update);

router.patch('/:id/verified', auth, requireRole('super_admin'), validate(setFlagSchema), controller.setVerified);
router.patch('/:id/featured', auth, requireRole('super_admin'), validate(setFlagSchema), controller.setFeatured);

module.exports = router;
