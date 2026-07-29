const express = require('express');
const auth = require('../../shared/middleware/auth');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const validate = require('../../shared/middleware/validate');
const { aiLimiter } = require('../../shared/middleware/rateLimiters');
const controller = require('./ai.controller');
const requireRole = require('../../shared/middleware/role');
const {
  chatMessageSchema,
  conversationIdParamSchema,
  updateConversationSchema,
  propertyAssistSchema,
} = require('./ai.schema');

const router = express.Router();

// Every AI route requires a logged-in user (customer through
// super_admin). resolveTenant runs with required:false so it works for
// both tenant users (agencyId from their JWT) and super_admin (no
// agency by design, per the resolveTenant.js fix).
router.use(auth, resolveTenant({ required: false }));

router.post('/chat', aiLimiter, validate(chatMessageSchema), controller.chat);
router.post('/chat/stream', aiLimiter, validate(chatMessageSchema), controller.chatStream);
router.get('/conversations', controller.list);
router.get('/conversations/:id', validate(conversationIdParamSchema), controller.getOne);
router.patch('/conversations/:id', validate(updateConversationSchema), controller.update);
router.delete('/conversations/:id', validate(conversationIdParamSchema), controller.remove);

// Wizard-only, so scoped to the roles that can create/edit listings.
router.post(
  '/property-assist',
  aiLimiter,
  requireRole('agent', 'agency_admin'),
  validate(propertyAssistSchema),
  controller.propertyAssist
);

module.exports = router;
