const express = require('express');
const controller = require('./inquiry.controller');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');

const router = express.Router();

router.post('/', controller.create);
router.get('/', auth, requireRole('agent', 'admin'), controller.list);

module.exports = router;
