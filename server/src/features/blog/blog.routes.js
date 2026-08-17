const express = require('express');
const auth = require('../../shared/middleware/auth');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const controller = require('./blog.controller');
const { createBlogSchema, updateBlogSchema, listBlogsQuerySchema, idParamSchema, slugParamSchema } = require('./blog.schema');

const router = express.Router();

// Public, cross-tenant reading - same posture as the marketplace and
// project directories.
router.get('/', validate(listBlogsQuerySchema), controller.list);
router.get('/latest', controller.latest);
router.get('/mine', auth, requireRole('agent', 'agency_admin'), resolveTenant(), controller.mine);
router.get('/:slug', validate(slugParamSchema), controller.getBySlug);

const writeAuth = [auth, requireRole('agent', 'agency_admin'), resolveTenant()];

router.post('/', ...writeAuth, validate(createBlogSchema), controller.create);
router.patch('/:id', ...writeAuth, validate(updateBlogSchema), controller.update);
router.delete('/:id', ...writeAuth, validate(idParamSchema), controller.remove);
router.patch('/:id/publish', ...writeAuth, validate(idParamSchema), controller.publish);
router.patch('/:id/unpublish', ...writeAuth, validate(idParamSchema), controller.unpublish);

module.exports = router;
