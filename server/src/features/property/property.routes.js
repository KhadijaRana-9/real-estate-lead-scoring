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
  submitPropertyReviewSchema,
  listPropertyReviewsQuerySchema,
  estimatePriceSchema,
  compareQuerySchema,
  addMediaImagesSchema,
  addMediaVideosSchema,
  mediaIdParamSchema,
  updateMediaItemSchema,
  reorderMediaSchema,
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
router.get('/mine', auth, requireRole('agent', 'agency_admin'), resolveTenant(), controller.listMine);
router.get('/compare', resolveTenant(), validate(compareQuerySchema), controller.compare);
router.get('/analytics', resolveTenant(), controller.analytics);
router.get('/favorites/mine', auth, resolveTenant(), controller.listFavorites);
router.get('/top-rated', resolveTenant(), controller.topRated);

router.get('/:id', resolveTenant(), validate(idParamSchema), controller.getById);
router.post('/:id/favorite', auth, resolveTenant(), validate(idParamSchema), controller.addFavorite);
router.delete('/:id/favorite', auth, resolveTenant(), validate(idParamSchema), controller.removeFavorite);
router.get('/:id/reviews', resolveTenant(), validate(listPropertyReviewsQuerySchema), controller.listReviews);
router.post('/:id/reviews', auth, requireRole('customer'), resolveTenant(), validate(submitPropertyReviewSchema), controller.submitReview);
router.delete('/:id/reviews', auth, requireRole('customer'), resolveTenant(), validate(idParamSchema), controller.deleteReview);
router.get('/:id/recommendations', resolveTenant(), validate(idParamSchema), controller.recommendations);

// Authenticated writes: auth runs first so resolveTenant can trust
// req.user.agencyId from the verified JWT rather than the request host.
router.post(
  '/',
  auth,
  requireRole('agent', 'agency_admin'),
  resolveTenant(),
  validate(createPropertySchema),
  controller.create
);

// Wizard entry point (Step 1) - creates a minimal draft, never publicly
// visible (see property.service.js getPropertyById), refined via the
// ordinary PUT below as later steps complete.
router.post(
  '/drafts',
  auth,
  requireRole('agent', 'agency_admin'),
  resolveTenant(),
  validate(draftPropertySchema),
  controller.createDraft
);

router.put(
  '/:id',
  auth,
  requireRole('agent', 'agency_admin'),
  resolveTenant(),
  validate(updatePropertySchema),
  controller.update
);
router.delete(
  '/:id',
  auth,
  requireRole('agent', 'agency_admin'),
  resolveTenant(),
  validate(idParamSchema),
  controller.remove
);

// Step 7 "Publish" action - validates completeness server-side and
// flips draft -> available. See property.service.js publishProperty.
router.patch(
  '/:id/publish',
  auth,
  requireRole('agent', 'agency_admin'),
  resolveTenant(),
  validate(idParamSchema),
  controller.publish
);

// Categorized media management (wizard's Media Manager + property owner
// edits) - see property.service.js's addMediaImages/addMediaVideos/etc.
// and property.model.js's MEDIA_CATEGORIES for the 19 room categories.
const mediaAuth = [auth, requireRole('agent', 'agency_admin'), resolveTenant()];

router.post('/:id/media/images', ...mediaAuth, validate(addMediaImagesSchema), controller.addMediaImages);
router.post('/:id/media/videos', ...mediaAuth, validate(addMediaVideosSchema), controller.addMediaVideos);
// /reorder must stay registered before the /:mediaId routes below -
// otherwise Express matches "reorder" itself as a :mediaId value.
router.patch('/:id/media/images/reorder', ...mediaAuth, validate(reorderMediaSchema), controller.reorderMediaImages);
router.patch('/:id/media/videos/reorder', ...mediaAuth, validate(reorderMediaSchema), controller.reorderMediaVideos);
router.patch('/:id/media/images/:mediaId/cover', ...mediaAuth, validate(mediaIdParamSchema), controller.setCoverImage);
router.patch('/:id/media/images/:mediaId', ...mediaAuth, validate(updateMediaItemSchema), controller.updateMediaImage);
router.patch('/:id/media/videos/:mediaId', ...mediaAuth, validate(updateMediaItemSchema), controller.updateMediaVideo);
router.delete('/:id/media/images/:mediaId', ...mediaAuth, validate(mediaIdParamSchema), controller.deleteMediaImage);
router.delete('/:id/media/videos/:mediaId', ...mediaAuth, validate(mediaIdParamSchema), controller.deleteMediaVideo);

module.exports = router;
