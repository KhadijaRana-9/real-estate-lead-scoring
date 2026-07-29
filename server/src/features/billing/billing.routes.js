const express = require('express');
const auth = require('../../shared/middleware/auth');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const controller = require('./billing.controller');
const { requestUpgradeSchema } = require('./billing.schema');

const router = express.Router();

// Billing is agency_admin-only - agents and customers never see invoices
// or plan/usage data for the whole agency.
router.use(auth, resolveTenant(), requireRole('agency_admin'));

router.get('/subscription', controller.getSubscription);
router.get('/invoices', controller.listInvoices);
router.post('/invoices/generate', controller.generateInvoice);
router.post('/upgrade', validate(requestUpgradeSchema), controller.upgrade);

module.exports = router;
