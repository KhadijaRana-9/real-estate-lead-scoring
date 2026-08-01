const express = require('express');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const controller = require('./partner.controller');
const { createPartnerSchema, updatePartnerSchema, idParamSchema } = require('./partner.schema');

const router = express.Router();

router.get('/', controller.list);

router.post('/', auth, requireRole('super_admin'), validate(createPartnerSchema), controller.create);
router.patch('/:id', auth, requireRole('super_admin'), validate(updatePartnerSchema), controller.update);
router.delete('/:id', auth, requireRole('super_admin'), validate(idParamSchema), controller.remove);

module.exports = router;
