const directoryService = require('./agencyDirectory.service');
const reviewService = require('../review/review.service');
const Agency = require('../agency/agency.model');

async function list(req, res, next) {
  try {
    const result = await directoryService.listAgencies(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function homepageSections(req, res, next) {
  try {
    const result = await directoryService.getHomepageSections();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function profile(req, res, next) {
  try {
    const result = await directoryService.getAgencyProfile(req.params.slug);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function resolveAgencyId(slug) {
  const agency = await Agency.findOne({ slug, status: 'active' }).select('_id');
  if (!agency) {
    const err = new Error('Agency not found');
    err.status = 404;
    throw err;
  }
  return agency._id;
}

async function listReviews(req, res, next) {
  try {
    const agencyId = await resolveAgencyId(req.params.slug);
    const result = await reviewService.listReviews(agencyId, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function submitReview(req, res, next) {
  try {
    const agencyId = await resolveAgencyId(req.params.slug);
    const review = await reviewService.upsertReview(agencyId, req.user, req.body);
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

async function deleteReview(req, res, next) {
  try {
    const agencyId = await resolveAgencyId(req.params.slug);
    await reviewService.deleteReview(agencyId, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, homepageSections, profile, listReviews, submitReview, deleteReview };
