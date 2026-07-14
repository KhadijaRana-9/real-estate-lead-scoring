const express = require('express');
const controller = require('./dashboard.controller');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');

const router = express.Router();

router.get('/summary', auth, requireRole('agent', 'admin'), controller.summary);
router.get('/public-stats', controller.publicStats);

module.exports = router;
