const PropertyReview = require('./propertyReview.model');
const Property = require('../property/property.model');
const Inquiry = require('../inquiry/inquiry.model');
const propertyRepository = require('../property/property.repository');

// Same threshold and rationale already established in market.service.js
// for city price stats: a single 5-star review outranking a property
// with 50 reviews averaging 4.8 would be a real statistical distortion,
// not a meaningful "top rated" signal - reused here for consistency
// rather than inventing a different number.
const MIN_REVIEW_SAMPLE_SIZE = 3;

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

// A review's agencyId is the PROPERTY's own agency - same bug/fix as
// favorite.service.js's resolvePropertyAgencyId. Reviewing scoped the
// property lookup (and the review's own agencyId, and the verified-
// inquiry check) to the reviewer's own tenant, which 404'd for exactly
// the marketplace case this feature exists for: a customer reviewing a
// property that belongs to a different agency than their own account.
async function upsertReview(_callerTenantId, propertyId, requester, { rating, comment }) {
  const property = await Property.findById(propertyId).select('agencyId');
  if (!property) throw notFound('Property not found');
  const agencyId = property.agencyId;

  // "Verified" = this reviewer actually submitted a real inquiry for
  // THIS property (matched by account email, the same link the agency
  // review feature uses) - never set true without checking.
  const hasInquiry = await Inquiry.exists({ agencyId, property: propertyId, 'customer.email': requester.email });

  return PropertyReview.findOneAndUpdate(
    { property: propertyId, 'author.id': requester.id },
    {
      agencyId,
      property: propertyId,
      author: { id: requester.id, name: requester.name },
      rating,
      comment: comment || '',
      verifiedInquiry: Boolean(hasInquiry),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

const REVIEW_SORTS = {
  newest: { createdAt: -1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
};

async function listReviews(tenantId, propertyId, { page = 1, limit = 10, sort = 'newest' } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(50, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = { agencyId: tenantId, property: propertyId };
  const query = PropertyReview.find(filter).sort(REVIEW_SORTS[sort] || REVIEW_SORTS.newest).skip(skip).limit(limitNum);
  const [items, total] = await Promise.all([query, PropertyReview.countDocuments(filter)]);

  return { items, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 } };
}

// Real aggregation, not a stored/cached counter - matches
// review.service.js's getRatingSummary and market.service.js's own
// "never fabricate a stat" discipline. A property with zero reviews
// gets an honest {average: 0, count: 0}, not a hidden/undefined field.
async function getRatingSummary(tenantId, propertyId) {
  const result = await PropertyReview.aggregate([
    { $match: { agencyId: tenantId, property: propertyId } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (!result.length) return { average: 0, count: 0 };
  return { average: Math.round(result[0].average * 10) / 10, count: result[0].count };
}

async function getRatingSummaryForMany(tenantId, propertyIds) {
  const results = await PropertyReview.aggregate([
    { $match: { agencyId: tenantId, property: { $in: propertyIds } } },
    { $group: { _id: '$property', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const byProperty = new Map(results.map((r) => [r._id.toString(), { average: Math.round(r.average * 10) / 10, count: r.count }]));
  return propertyIds.reduce((map, id) => {
    map[id.toString()] = byProperty.get(id.toString()) || { average: 0, count: 0 };
    return map;
  }, {});
}

// Real, aggregation-computed ranking - backs both the AI's "highest
// rated"/"most reviewed" queries and the agent dashboard's Top Listings
// section, so both surfaces are guaranteed to agree (one real query, two
// callers) rather than risking two independently-computed "top" lists
// drifting apart.
// Shared by getTopRatedProperties (sorted by average, real ratings only)
// and getMostReviewedProperties (sorted by count) - one real aggregation
// path so both "highest rated" and "most reviewed" can never silently
// disagree about which properties actually have review data.
async function rankByReviews(tenantId, { limit, minReviews, agentId, sortStage }) {
  const results = await PropertyReview.aggregate([
    { $match: { agencyId: tenantId } },
    { $group: { _id: '$property', average: { $avg: '$rating' }, count: { $sum: 1 } } },
    { $match: { count: { $gte: minReviews } } },
    { $sort: sortStage },
    { $limit: Math.max(limit * 3, limit) }, // overfetch - agentId filtering below may drop some
  ]);
  if (!results.length) return [];

  const propertyIds = results.map((r) => r._id);
  const propertyFilter = agentId ? { _id: { $in: propertyIds }, agent: agentId } : { _id: { $in: propertyIds } };
  const properties = await propertyRepository.find(tenantId, propertyFilter);
  const propertyById = new Map(properties.map((p) => [p._id.toString(), p]));
  const ratingById = new Map(results.map((r) => [r._id.toString(), { average: Math.round(r.average * 10) / 10, count: r.count }]));

  return results
    .map((r) => propertyById.get(r._id.toString()))
    .filter(Boolean)
    .slice(0, limit)
    .map((p) => ({ ...p.toObject(), rating: ratingById.get(p._id.toString()) }));
}

async function getTopRatedProperties(tenantId, { limit = 6, minReviews = MIN_REVIEW_SAMPLE_SIZE, agentId } = {}) {
  return rankByReviews(tenantId, { limit, minReviews, agentId, sortStage: { average: -1, count: -1 } });
}

async function getMostReviewedProperties(tenantId, { limit = 6, agentId } = {}) {
  // No minimum floor here (unlike top-rated) - "most reviewed" is the
  // count itself, so a property with 1 review legitimately just ranks
  // low rather than being excluded from a list that's about counting.
  return rankByReviews(tenantId, { limit, minReviews: 1, agentId, sortStage: { count: -1, average: -1 } });
}

// Same MIN_REVIEW_SAMPLE_SIZE floor as top-rated, for the same reason in
// reverse: a single angry 1-star review shouldn't brand a property
// "lowest rated" any more than a single 5-star one should crown it
// "top rated" - both need real sample size before the average means
// anything.
async function getLowestRatedProperties(tenantId, { limit = 6, minReviews = MIN_REVIEW_SAMPLE_SIZE, agentId } = {}) {
  return rankByReviews(tenantId, { limit, minReviews, agentId, sortStage: { average: 1, count: -1 } });
}

async function deleteReview(_callerTenantId, propertyId, requester) {
  // Matches the model's real unique index (property + author.id, not
  // agencyId) - see upsertReview for why agencyId can't be trusted from
  // the caller's own tenant here.
  const res = await PropertyReview.deleteOne({ property: propertyId, 'author.id': requester.id });
  if (res.deletedCount === 0) throw notFound('Review not found');
}

module.exports = {
  upsertReview,
  listReviews,
  getRatingSummary,
  getRatingSummaryForMany,
  getTopRatedProperties,
  getMostReviewedProperties,
  getLowestRatedProperties,
  deleteReview,
  MIN_REVIEW_SAMPLE_SIZE,
};
