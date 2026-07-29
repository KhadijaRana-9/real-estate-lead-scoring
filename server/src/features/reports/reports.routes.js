const express = require('express');
const auth = require('../../shared/middleware/auth');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const requireRole = require('../../shared/middleware/role');
const controller = require('./reports.controller');

const router = express.Router();

router.use(auth, resolveTenant(), requireRole('agent', 'agency_admin'));

router.get('/properties.csv', controller.properties);
router.get('/leads.csv', controller.leads);
router.get('/dashboard-summary.csv', controller.dashboardSummary);

module.exports = router;
