const Review = require('./review.model');
const Inquiry = require('../inquiry/inquiry.model');

async function upsertReview(agencyId, requester, { rating, comment, images }) {
  // "Verified" = this reviewer actually submitted a real inquiry to this
  // agency (matched by their account email, the only link between an
  // authenticated review and a - possibly anonymous-at-the-time - public
  // inquiry submission). Never set true without checking.
  const hasInquiry = await Inquiry.exists({ agencyId, 'customer.email': requester.email });

  return Review.findOneAndUpdate(
    { agencyId, 'author.id': requester.id },
    {
      agencyId,
      author: { id: requester.id, name: requester.name },
      rating,
      comment: comment || '',
      images: images || [],
      verifiedInquiry: Boolean(hasInquiry),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

const REVIEW_SORTS = {
  newest: { createdAt: -1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
  helpful: { helpfulCount: -1, createdAt: -1 },
};

async function listReviews(agencyId, { page = 1, limit = 10, sort = 'newest', withPhotos } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(50, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = { agencyId };
  if (withPhotos === 'true' || withPhotos === true) filter.images = { $ne: [] };

  let query = Review.find(filter);
  if (sort === 'helpful') {
    // helpfulCount isn't a stored field - sort on the array length via
    // aggregation instead of a plain .find().sort().
    const items = await Review.aggregate([
      { $match: filter },
      { $addFields: { helpfulCount: { $size: '$helpfulUserIds' } } },
      { $sort: { helpfulCount: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ]);
    const total = await Review.countDocuments(filter);
    return { items, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 } };
  }

  query = query.sort(REVIEW_SORTS[sort] || REVIEW_SORTS.newest).skip(skip).limit(limitNum);
  const [items, total] = await Promise.all([query, Review.countDocuments(filter)]);

  return { items, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 } };
}

// Real histogram, not an invented distribution - counts actual reviews
// per star rating, 1 through 5.
async function getRatingDistribution(agencyId) {
  const results = await Review.aggregate([{ $match: { agencyId } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]);
  const byRating = new Map(results.map((r) => [r._id, r.count]));
  const total = results.reduce((sum, r) => sum + r.count, 0);
  return [5, 4, 3, 2, 1].map((star) => ({ star, count: byRating.get(star) || 0, pct: total ? Math.round(((byRating.get(star) || 0) / total) * 100) : 0 }));
}

async function toggleHelpful(reviewId, userId) {
  const review = await Review.findById(reviewId);
  if (!review) {
    const err = new Error('Review not found');
    err.status = 404;
    throw err;
  }
  const idx = review.helpfulUserIds.findIndex((id) => id.toString() === userId);
  if (idx === -1) review.helpfulUserIds.push(userId);
  else review.helpfulUserIds.splice(idx, 1);
  await review.save();
  return { helpfulCount: review.helpfulUserIds.length, marked: idx === -1 };
}

// Agency replying to a review on their own profile - agency_admin only,
// enforced by the route's requireRole, re-checked here against the
// tenant the review actually belongs to.
async function replyToReview(tenantId, reviewId, text) {
  const review = await Review.findOne({ _id: reviewId, agencyId: tenantId });
  if (!review) {
    const err = new Error('Review not found');
    err.status = 404;
    throw err;
  }
  review.reply = { text, repliedAt: new Date() };
  await review.save();
  return review;
}

// Real aggregation, not a stored/cached counter - a marketplace card
// showing "4.6 (23)" always reflects the current Review collection, no
// risk of drifting from an incrementally-maintained field.
async function getRatingSummary(agencyId) {
  const result = await Review.aggregate([
    { $match: { agencyId } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (!result.length) return { average: 0, count: 0 };
  return { average: Math.round(result[0].average * 10) / 10, count: result[0].count };
}

async function getRatingSummaryForMany(agencyIds) {
  const results = await Review.aggregate([
    { $match: { agencyId: { $in: agencyIds } } },
    { $group: { _id: '$agencyId', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const byAgency = new Map(results.map((r) => [r._id.toString(), { average: Math.round(r.average * 10) / 10, count: r.count }]));
  return agencyIds.reduce((map, id) => {
    map[id.toString()] = byAgency.get(id.toString()) || { average: 0, count: 0 };
    return map;
  }, {});
}

async function deleteReview(agencyId, requester) {
  const res = await Review.deleteOne({ agencyId, 'author.id': requester.id });
  if (res.deletedCount === 0) {
    const err = new Error('Review not found');
    err.status = 404;
    throw err;
  }
}

module.exports = {
  upsertReview,
  listReviews,
  getRatingSummary,
  getRatingSummaryForMany,
  getRatingDistribution,
  toggleHelpful,
  replyToReview,
  deleteReview,
};
