const express = require('express');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const { authLimiter } = require('../../shared/middleware/rateLimiters');
const authController = require('../auth/auth.controller');
const { loginSchema } = require('../auth/auth.schema');
const agenciesController = require('./agencies.controller');
const dashboardController = require('./dashboard.controller');
const { createAgencySchema, listAgenciesQuerySchema, agencyIdParamSchema } = require('./agencies.schema');

const router = express.Router();

// Deliberately NOT behind resolveTenant - super_admin has no agency, and
// this whole route file operates across every tenant by design. Physical
// separation from the tenant-scoped /api/* surface (see property/inquiry
// routes) means a bug in tenant resolution can never accidentally grant
// cross-tenant access: that code path doesn't exist here.
router.post('/login', authLimiter, validate(loginSchema), authController.platformLogin);

router.use(auth, requireRole('super_admin'));

router.get('/agencies', validate(listAgenciesQuerySchema), agenciesController.list);
router.post('/agencies', validate(createAgencySchema), agenciesController.create);
router.patch('/agencies/:id/suspend', validate(agencyIdParamSchema), agenciesController.suspend);
router.patch('/agencies/:id/reactivate', validate(agencyIdParamSchema), agenciesController.reactivate);
router.delete('/agencies/:id', validate(agencyIdParamSchema), agenciesController.remove);

router.get('/dashboard/summary', dashboardController.summary);

module.exports = router;
