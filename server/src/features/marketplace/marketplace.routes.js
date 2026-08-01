const express = require('express');
const auth = require('../../shared/middleware/auth');
const optionalAuth = require('../../shared/middleware/optionalAuth');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const controller = require('./marketplace.controller');
const {
  listAgenciesQuerySchema,
  slugParamSchema,
  submitReviewSchema,
  listReviewsQuerySchema,
  autocompleteQuerySchema,
  compareQuerySchema,
  reviewIdParamSchema,
  replyToReviewSchema,
} = require('./marketplace.schema');

const router = express.Router();

// Public, cross-tenant directory - deliberately NOT behind resolveTenant
// (there is no single workspace here, this lists every agency on the
// platform) and not behind (required) auth - anonymous visitors browse it
// exactly like Zameen/Bayut. optionalAuth only decodes a token if one is
// present, so a logged-in visitor's cards correctly show real
// Follow/Following state without requiring login to browse at all.
router.get('/', optionalAuth, validate(listAgenciesQuerySchema), controller.list);
router.get('/sections', optionalAuth, controller.homepageSections);
router.get('/platform-stats', controller.platformStats);
router.get('/autocomplete', validate(autocompleteQuerySchema), controller.autocomplete);
// Must stay before /:slug - otherwise Express matches "compare" as a slug.
router.get('/compare', validate(compareQuerySchema), controller.compare);

// optionalAuth: public profile view, but renders isFollowing correctly
// when the visitor happens to be logged in.
router.get('/:slug', optionalAuth, validate(slugParamSchema), controller.profile);

router.get('/:slug/reviews', validate(listReviewsQuerySchema), controller.listReviews);
// Reviewing is a customer action (the end user who interacted with the
// agency), same role restriction real marketplaces apply.
router.post('/:slug/reviews', auth, requireRole('customer'), validate(submitReviewSchema), controller.submitReview);
router.delete('/:slug/reviews', auth, requireRole('customer'), validate(slugParamSchema), controller.deleteReview);
router.post('/reviews/:reviewId/helpful', auth, validate(reviewIdParamSchema), controller.toggleHelpful);
router.post(
  '/reviews/:reviewId/reply',
  auth,
  resolveTenant(),
  requireRole('agency_admin'),
  validate(replyToReviewSchema),
  controller.replyToReview
);

router.post('/:slug/follow', auth, validate(slugParamSchema), controller.followAgency);
router.delete('/:slug/follow', auth, validate(slugParamSchema), controller.unfollowAgency);

module.exports = router;
