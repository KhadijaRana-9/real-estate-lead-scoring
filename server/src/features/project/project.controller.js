const projectService = require('./project.service');

async function create(req, res, next) {
  try {
    const project = await projectService.create(req.tenant._id, req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const project = await projectService.update(req.tenant._id, req.params.id, req.body);
    res.json(project);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await projectService.remove(req.tenant._id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function setFeatured(req, res, next) {
  try {
    const project = await projectService.setFeatured(req.params.id, req.body.value);
    res.json(project);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await projectService.list(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const project = await projectService.getBySlug(req.params.slug);
    res.json(project);
  } catch (err) {
    next(err);
  }
}

async function featured(req, res, next) {
  try {
    const items = await projectService.featuredProjects(Number(req.query.limit) || 8);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function newLaunches(req, res, next) {
  try {
    const items = await projectService.newLaunches(Number(req.query.limit) || 8);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function mine(req, res, next) {
  try {
    const items = await projectService.listByAgency(req.tenant._id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, update, remove, setFeatured, list, getBySlug, featured, newLaunches, mine };
