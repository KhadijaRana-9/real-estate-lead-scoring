const express = require('express');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const controller = require('./marketplace.controller');
const { listAgenciesQuerySchema, slugParamSchema, submitReviewSchema, listReviewsQuerySchema } = require('./marketplace.schema');

const router = express.Router();

// Public, cross-tenant directory - deliberately NOT behind resolveTenant
// (there is no single workspace here, this lists every agency on the
// platform) and not behind auth (anonymous visitors browse it exactly
// like Zameen/Bayut).
router.get('/', validate(listAgenciesQuerySchema), controller.list);
router.get('/sections', controller.homepageSections);
router.get('/:slug', validate(slugParamSchema), controller.profile);

router.get('/:slug/reviews', validate(listReviewsQuerySchema), controller.listReviews);
// Reviewing is a customer action (the end user who interacted with the
// agency), same role restriction real marketplaces apply.
router.post('/:slug/reviews', auth, requireRole('customer'), validate(submitReviewSchema), controller.submitReview);
router.delete('/:slug/reviews', auth, requireRole('customer'), validate(slugParamSchema), controller.deleteReview);

module.exports = router;
