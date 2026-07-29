const dashboardService = require('./dashboard.service');

async function summary(req, res, next) {
  try {
    const result = await dashboardService.getSummary(req.tenant._id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function publicStats(req, res, next) {
  try {
    const result = await dashboardService.getPublicStats(req.tenant._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, publicStats };
