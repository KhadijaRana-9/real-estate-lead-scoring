const express = require('express');
const auth = require('../../shared/middleware/auth');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const requireRole = require('../../shared/middleware/role');
const auditLog = require('./auditLog.service');

const router = express.Router();

router.get('/', auth, resolveTenant(), requireRole('agent', 'agency_admin'), async (req, res, next) => {
  try {
    const logs = await auditLog.list(req.tenant._id, req.user, req.query);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
