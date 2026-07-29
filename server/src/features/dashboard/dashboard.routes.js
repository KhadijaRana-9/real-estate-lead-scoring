const express = require('express');
const controller = require('./dashboard.controller');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');
const resolveTenant = require('../../shared/middleware/resolveTenant');

const router = express.Router();

router.get('/summary', auth, resolveTenant(), requireRole('agent', 'agency_admin'), controller.summary);
router.get('/public-stats', resolveTenant(), controller.publicStats);

module.exports = router;
