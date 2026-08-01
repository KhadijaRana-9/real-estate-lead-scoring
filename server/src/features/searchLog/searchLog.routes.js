const express = require('express');
const validate = require('../../shared/middleware/validate');
const controller = require('./searchLog.controller');
const { recordSearchSchema } = require('./searchLog.schema');

const router = express.Router();

router.get('/trending', controller.trending);
router.get('/popular', controller.popular);
router.post('/', validate(recordSearchSchema), controller.record);

module.exports = router;
