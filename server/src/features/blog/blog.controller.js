const blogService = require('./blog.service');

async function create(req, res, next) {
  try {
    const blog = await blogService.create(req.tenant._id, req.user, req.body);
    res.status(201).json(blog);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const blog = await blogService.update(req.tenant._id, req.params.id, req.body);
    res.json(blog);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await blogService.remove(req.tenant._id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function publish(req, res, next) {
  try {
    const blog = await blogService.publish(req.tenant._id, req.params.id);
    res.json(blog);
  } catch (err) {
    next(err);
  }
}

async function unpublish(req, res, next) {
  try {
    const blog = await blogService.unpublish(req.tenant._id, req.params.id);
    res.json(blog);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await blogService.listPublic(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const blog = await blogService.getBySlug(req.params.slug);
    res.json(blog);
  } catch (err) {
    next(err);
  }
}

async function mine(req, res, next) {
  try {
    const items = await blogService.listMine(req.tenant._id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function latest(req, res, next) {
  try {
    const items = await blogService.latest(Number(req.query.limit) || 6);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, update, remove, publish, unpublish, list, getBySlug, mine, latest };
