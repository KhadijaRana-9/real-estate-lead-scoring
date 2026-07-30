const Review = require('./review.model');

async function upsertReview(agencyId, requester, { rating, comment }) {
  return Review.findOneAndUpdate(
    { agencyId, 'author.id': requester.id },
    { agencyId, author: { id: requester.id, name: requester.name }, rating, comment: comment || '' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function listReviews(agencyId, { page = 1, limit = 10 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(50, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Review.find({ agencyId }).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Review.countDocuments({ agencyId }),
  ]);

  return { items, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 } };
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

module.exports = { upsertReview, listReviews, getRatingSummary, getRatingSummaryForMany, deleteReview };
