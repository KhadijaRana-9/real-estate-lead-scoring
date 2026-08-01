const searchLogService = require('./searchLog.service');

async function record(req, res, next) {
  try {
    await searchLogService.record(req.body);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function trending(req, res, next) {
  try {
    const items = await searchLogService.trending({ scope: req.query.scope, limit: Number(req.query.limit) || 8 });
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function popular(req, res, next) {
  try {
    const items = await searchLogService.popular({ scope: req.query.scope, limit: Number(req.query.limit) || 8 });
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

module.exports = { record, trending, popular };
