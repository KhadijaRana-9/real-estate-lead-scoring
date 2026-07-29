const express = require('express');
const controller = require('./property.controller');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const {
  createPropertySchema,
  draftPropertySchema,
  updatePropertySchema,
  idParamSchema,
  listPropertiesQuerySchema,
  estimatePriceSchema,
  compareQuerySchema,
} = require('./property.schema');

const router = express.Router();

// Public browsing routes: no req.user yet, so resolveTenant resolves
// from host/workspace/default instead.
router.get('/', resolveTenant(), validate(listPropertiesQuerySchema), controller.list);
// Pure calculation, no DB access - no tenant needed.
router.post('/estimate-price', validate(estimatePriceSchema), controller.estimatePrice);

// Must stay registered before GET /:id - otherwise Express matches
// "mine"/"compare"/"analytics" as :id first (this ordering constraint
// predates this refactor, see property.routes.js history).
router.get('/mine', auth, resolveTenant(), requireRole('agent', 'agency_admin'), controller.listMine);
router.get('/compare', resolveTenant(), validate(compareQuerySchema), controller.compare);
router.get('/analytics', resolveTenant(), controller.analytics);

router.get('/:id', resolveTenant(), validate(idParamSchema), controller.getById);
router.get('/:id/recommendations', resolveTenant(), validate(idParamSchema), controller.recommendations);

// Authenticated writes: auth runs first so resolveTenant can trust
// req.user.agencyId from the verified JWT rather than the request host.
router.post(
  '/',
  auth,
  resolveTenant(),
  requireRole('agent', 'agency_admin'),
  validate(createPropertySchema),
  controller.create
);

// Wizard entry point (Step 1) - creates a minimal draft, never publicly
// visible (see property.service.js getPropertyById), refined via the
// ordinary PUT below as later steps complete.
router.post(
  '/drafts',
  auth,
  resolveTenant(),
  requireRole('agent', 'agency_admin'),
  validate(draftPropertySchema),
  controller.createDraft
);

router.put(
  '/:id',
  auth,
  resolveTenant(),
  requireRole('agent', 'agency_admin'),
  validate(updatePropertySchema),
  controller.update
);
router.delete(
  '/:id',
  auth,
  resolveTenant(),
  requireRole('agent', 'agency_admin'),
  validate(idParamSchema),
  controller.remove
);

// Step 7 "Publish" action - validates completeness server-side and
// flips draft -> available. See property.service.js publishProperty.
router.patch(
  '/:id/publish',
  auth,
  resolveTenant(),
  requireRole('agent', 'agency_admin'),
  validate(idParamSchema),
  controller.publish
);

module.exports = router;
