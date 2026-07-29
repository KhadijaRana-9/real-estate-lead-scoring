const express = require('express');
const controller = require('./inquiry.controller');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const { inquiryLimiter } = require('../../shared/middleware/rateLimiters');
const { createInquirySchema, moveLeadStageSchema } = require('./inquiry.schema');

const router = express.Router();

router.post('/', inquiryLimiter, resolveTenant(), validate(createInquirySchema), controller.create);
router.get('/', auth, resolveTenant(), requireRole('agent', 'agency_admin'), controller.list);
router.get('/pipeline', auth, resolveTenant(), requireRole('agent', 'agency_admin'), controller.pipeline);
router.patch(
  '/:id/stage',
  auth,
  resolveTenant(),
  requireRole('agent', 'agency_admin'),
  validate(moveLeadStageSchema),
  controller.moveStage
);

module.exports = router;
