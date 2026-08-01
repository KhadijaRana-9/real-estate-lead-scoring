const newsletterService = require('./newsletter.service');

async function subscribe(req, res, next) {
  try {
    const result = await newsletterService.subscribe(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function unsubscribe(req, res, next) {
  try {
    const result = await newsletterService.unsubscribe(req.params.token);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { subscribe, unsubscribe };
