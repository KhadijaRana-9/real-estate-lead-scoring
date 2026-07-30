const agenciesService = require('./agencies.service');

async function list(req, res, next) {
  try {
    const result = await agenciesService.listAgencies(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const agency = await agenciesService.createAgency(req.body);
    res.status(201).json(agency);
  } catch (err) {
    next(err);
  }
}

async function suspend(req, res, next) {
  try {
    const agency = await agenciesService.suspendAgency(req.params.id, req.user);
    res.json(agency);
  } catch (err) {
    next(err);
  }
}

async function reactivate(req, res, next) {
  try {
    const agency = await agenciesService.reactivateAgency(req.params.id, req.user);
    res.json(agency);
  } catch (err) {
    next(err);
  }
}

async function setVerified(req, res, next) {
  try {
    const agency = await agenciesService.setVerified(req.params.id, req.body.verified, req.user);
    res.json(agency);
  } catch (err) {
    next(err);
  }
}

async function setFeatured(req, res, next) {
  try {
    const agency = await agenciesService.setFeatured(req.params.id, req.body.featured, req.user);
    res.json(agency);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await agenciesService.deleteAgency(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, suspend, reactivate, setVerified, setFeatured, remove };
