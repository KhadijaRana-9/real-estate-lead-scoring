const developerService = require('./developer.service');

async function create(req, res, next) {
  try {
    const developer = await developerService.create(req.user, req.body);
    res.status(201).json(developer);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const developer = await developerService.update(req.params.id, req.body);
    res.json(developer);
  } catch (err) {
    next(err);
  }
}

async function setVerified(req, res, next) {
  try {
    const developer = await developerService.setVerified(req.params.id, req.body.value);
    res.json(developer);
  } catch (err) {
    next(err);
  }
}

async function setFeatured(req, res, next) {
  try {
    const developer = await developerService.setFeatured(req.params.id, req.body.value);
    res.json(developer);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await developerService.list(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const developer = await developerService.getBySlug(req.params.slug);
    res.json(developer);
  } catch (err) {
    next(err);
  }
}

async function top(req, res, next) {
  try {
    const developers = await developerService.topDevelopers(Number(req.query.limit) || 8);
    res.json({ items: developers });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, update, setVerified, setFeatured, list, getBySlug, top };
