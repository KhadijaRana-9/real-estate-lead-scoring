const express = require('express');
const auth = require('../../shared/middleware/auth');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const controller = require('./project.controller');
const {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  idParamSchema,
  slugParamSchema,
  setFeaturedSchema,
} = require('./project.schema');

const router = express.Router();

// Public, cross-tenant browsing - same posture as the agency marketplace.
router.get('/', validate(listProjectsQuerySchema), controller.list);
router.get('/featured', controller.featured);
router.get('/new-launches', controller.newLaunches);
router.get('/mine', auth, resolveTenant(), requireRole('agent', 'agency_admin'), controller.mine);
router.get('/:slug', validate(slugParamSchema), controller.getBySlug);

router.post(
  '/',
  auth,
  resolveTenant(),
  requireRole('agency_admin'),
  validate(createProjectSchema),
  controller.create
);
router.patch(
  '/:id',
  auth,
  resolveTenant(),
  requireRole('agency_admin'),
  validate(updateProjectSchema),
  controller.update
);
router.delete('/:id', auth, resolveTenant(), requireRole('agency_admin'), validate(idParamSchema), controller.remove);

router.patch('/:id/featured', auth, requireRole('super_admin'), validate(setFeaturedSchema), controller.setFeatured);

module.exports = router;
