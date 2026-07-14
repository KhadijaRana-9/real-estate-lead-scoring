const propertyService = require('./property.service');

async function list(req, res, next) {
  try {
    const result = await propertyService.listProperties(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const properties = await propertyService.listMyProperties(req.user);
    res.json(properties);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const property = await propertyService.getPropertyById(req.params.id);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const property = await propertyService.createProperty(req.body, req.user.id);
    res.status(201).json(property);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const property = await propertyService.updateProperty(req.params.id, req.body, req.user);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await propertyService.deleteProperty(req.params.id, req.user);
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

module.exports = { list, listMine, getById, create, update, remove, estimatePrice };
