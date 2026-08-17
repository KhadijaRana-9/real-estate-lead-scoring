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
router.get('/', auth, requireRole('agent', 'agency_admin'), resolveTenant(), controller.list);
router.get('/pipeline', auth, requireRole('agent', 'agency_admin'), resolveTenant(), controller.pipeline);
router.patch(
  '/:id/stage',
  auth,
  requireRole('agent', 'agency_admin'),
  resolveTenant(),
  validate(moveLeadStageSchema),
  controller.moveStage
);

module.exports = router;
