const dashboardService = require('./dashboard.service');

async function summary(req, res, next) {
  try {
    const result = await dashboardService.getPlatformSummary();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { summary };
