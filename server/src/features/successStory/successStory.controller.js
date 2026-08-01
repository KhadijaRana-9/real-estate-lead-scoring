const successStoryService = require('./successStory.service');

async function create(req, res, next) {
  try {
    const story = await successStoryService.create(req.tenant._id, req.user, req.body);
    res.status(201).json(story);
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const story = await successStoryService.approve(req.params.id);
    res.json(story);
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const story = await successStoryService.reject(req.params.id);
    res.json(story);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await successStoryService.listPublic(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function pendingModeration(req, res, next) {
  try {
    const items = await successStoryService.listPendingModeration();
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function mine(req, res, next) {
  try {
    const items = await successStoryService.listMine(req.tenant._id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, approve, reject, list, pendingModeration, mine };
