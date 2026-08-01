const express = require('express');
const controller = require('./market.controller');

const router = express.Router();

router.get('/overview', controller.overview);
router.get('/price-trend', controller.priceTrend);
router.get('/city/:city', controller.cityInsight);

module.exports = router;
