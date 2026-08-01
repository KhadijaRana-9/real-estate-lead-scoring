const express = require('express');
const validate = require('../../shared/middleware/validate');
const controller = require('./newsletter.controller');
const { subscribeSchema, unsubscribeSchema } = require('./newsletter.schema');

const router = express.Router();

router.post('/subscribe', validate(subscribeSchema), controller.subscribe);
router.post('/unsubscribe/:token', validate(unsubscribeSchema), controller.unsubscribe);

module.exports = router;
