const marketService = require('./market.service');

async function overview(req, res, next) {
  try {
    const result = await marketService.overview();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function priceTrend(req, res, next) {
  try {
    const result = await marketService.priceTrend({ city: req.query.city, months: Number(req.query.months) || 6 });
    res.json({ items: result });
  } catch (err) {
    next(err);
  }
}

async function cityInsight(req, res, next) {
  try {
    const result = await marketService.cityInsight(req.params.city);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { overview, priceTrend, cityInsight };
