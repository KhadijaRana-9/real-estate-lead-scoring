const express = require('express');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const controller = require('./award.controller');
const { createAwardSchema, updateAwardSchema, idParamSchema } = require('./award.schema');

const router = express.Router();

router.get('/', controller.list);

router.post('/', auth, requireRole('super_admin'), validate(createAwardSchema), controller.create);
router.patch('/:id', auth, requireRole('super_admin'), validate(updateAwardSchema), controller.update);
router.delete('/:id', auth, requireRole('super_admin'), validate(idParamSchema), controller.remove);

module.exports = router;
