const express = require('express');
const controller = require('./property.controller');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');

const router = express.Router();

router.get('/', controller.list);
router.post('/estimate-price', controller.estimatePrice);
router.get('/mine', auth, requireRole('agent', 'admin'), controller.listMine);
router.get('/:id', controller.getById);
router.post('/', auth, requireRole('agent', 'admin'), controller.create);
router.put('/:id', auth, requireRole('agent', 'admin'), controller.update);
router.delete('/:id', auth, requireRole('agent', 'admin'), controller.remove);

module.exports = router;
