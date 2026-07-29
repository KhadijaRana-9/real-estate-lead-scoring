const propertyService = require('./property.service');

async function list(req, res, next) {
  try {
    const result = await propertyService.listProperties(req.tenant._id, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const properties = await propertyService.listMyProperties(req.tenant._id, req.user);
    res.json(properties);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const property = await propertyService.getPropertyById(req.tenant._id, req.params.id);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const property = await propertyService.createProperty(req.tenant._id, req.body, req.user);
    res.status(201).json(property);
  } catch (err) {
    next(err);
  }
}

async function createDraft(req, res, next) {
  try {
    const property = await propertyService.createDraftProperty(req.tenant._id, req.body, req.user);
    res.status(201).json(property);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const property = await propertyService.updateProperty(req.tenant._id, req.params.id, req.body, req.user);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function publish(req, res, next) {
  try {
    const property = await propertyService.publishProperty(req.tenant._id, req.params.id, req.user);
    res.json(property);
  } catch (err) {
    if (err.missing) {
      return res.status(err.status).json({ message: err.message, missing: err.missing });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await propertyService.deleteProperty(req.tenant._id, req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function estimatePrice(req, res, next) {
  try {
    const result = propertyService.getPriceEstimate(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function compare(req, res, next) {
  try {
    const result = await propertyService.compareProperties(req.tenant._id, req.query.ids);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function analytics(req, res, next) {
  try {
    const result = await propertyService.getAnalytics(req.tenant._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function recommendations(req, res, next) {
  try {
    const result = await propertyService.recommendProperties(req.tenant._id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  listMine,
  getById,
  create,
  createDraft,
  update,
  publish,
  remove,
  estimatePrice,
  compare,
  analytics,
  recommendations,
};
