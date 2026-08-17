const propertyService = require('./property.service');
const favoriteService = require('../favorite/favorite.service');
const propertyReviewService = require('../propertyReview/propertyReview.service');

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

async function listFavorites(req, res, next) {
  try {
    const properties = await favoriteService.listFavoriteProperties(req.tenant._id, req.user.id, { limit: Number(req.query.limit) || 20, crossTenant: true });
    res.json({ properties });
  } catch (err) {
    next(err);
  }
}

async function addFavorite(req, res, next) {
  try {
    const result = await favoriteService.addFavorite(req.tenant._id, req.user.id, req.params.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function removeFavorite(req, res, next) {
  try {
    const result = await favoriteService.removeFavorite(req.tenant._id, req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listReviews(req, res, next) {
  try {
    const result = await propertyReviewService.listReviews(req.tenant._id, req.params.id, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function submitReview(req, res, next) {
  try {
    const review = await propertyReviewService.upsertReview(req.tenant._id, req.params.id, req.user, req.body);
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

async function deleteReview(req, res, next) {
  try {
    await propertyReviewService.deleteReview(req.tenant._id, req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function topRated(req, res, next) {
  try {
    const properties = await propertyReviewService.getTopRatedProperties(req.tenant._id, { limit: Number(req.query.limit) || 6 });
    res.json({ properties });
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

async function addMediaImages(req, res, next) {
  try {
    const property = await propertyService.addMediaImages(req.tenant._id, req.params.id, req.user, req.body.category, req.body.items);
    res.status(201).json(property);
  } catch (err) {
    next(err);
  }
}

async function addMediaVideos(req, res, next) {
  try {
    const property = await propertyService.addMediaVideos(req.tenant._id, req.params.id, req.user, req.body.category, req.body.items);
    res.status(201).json(property);
  } catch (err) {
    next(err);
  }
}

async function updateMediaImage(req, res, next) {
  try {
    const property = await propertyService.updateMediaItem(req.tenant._id, req.params.id, req.user, 'image', req.params.mediaId, req.body);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function updateMediaVideo(req, res, next) {
  try {
    const property = await propertyService.updateMediaItem(req.tenant._id, req.params.id, req.user, 'video', req.params.mediaId, req.body);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function deleteMediaImage(req, res, next) {
  try {
    const property = await propertyService.deleteMediaItem(req.tenant._id, req.params.id, req.user, 'image', req.params.mediaId);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function deleteMediaVideo(req, res, next) {
  try {
    const property = await propertyService.deleteMediaItem(req.tenant._id, req.params.id, req.user, 'video', req.params.mediaId);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function reorderMediaImages(req, res, next) {
  try {
    const property = await propertyService.reorderMediaCategory(req.tenant._id, req.params.id, req.user, 'image', req.body.category, req.body.orderedIds);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function reorderMediaVideos(req, res, next) {
  try {
    const property = await propertyService.reorderMediaCategory(req.tenant._id, req.params.id, req.user, 'video', req.body.category, req.body.orderedIds);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function setCoverImage(req, res, next) {
  try {
    const property = await propertyService.setCoverImage(req.tenant._id, req.params.id, req.user, req.params.mediaId);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  listMine,
  listFavorites,
  addFavorite,
  removeFavorite,
  listReviews,
  submitReview,
  deleteReview,
  topRated,
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
  addMediaImages,
  addMediaVideos,
  updateMediaImage,
  updateMediaVideo,
  deleteMediaImage,
  deleteMediaVideo,
  reorderMediaImages,
  reorderMediaVideos,
  setCoverImage,
};
