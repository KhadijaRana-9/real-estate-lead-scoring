const collectionsService = require('./collections.service');

function makeHandler(fn) {
  return async (req, res, next) => {
    try {
      const items = await fn(Number(req.query.limit) || 8);
      res.json({ items });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  luxury: makeHandler(collectionsService.luxuryCollection),
  commercial: makeHandler(collectionsService.commercialCollection),
  investment: makeHandler(collectionsService.investmentCollection),
  newLaunches: makeHandler(collectionsService.newLaunchesCollection),
};
