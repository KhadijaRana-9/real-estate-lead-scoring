const Agency = require('../agency/agency.model');
const Property = require('../property/property.model');
const User = require('../auth/auth.model');
const reviewService = require('../review/review.service');

const PUBLIC_LIST_FIELDS =
  'companyName slug logo coverBanner verified featured city country phone whatsapp contactEmail website subscriptionPlan establishedYear languages specializations createdAt';

const SORT_MAP = {
  newest: { createdAt: -1 },
  name_asc: { companyName: 1 },
};

// Attaches the same real, live-aggregated stats block to every agency
// card regardless of which list it came from (directory, featured,
// top-performing, ...) - one source of truth for "what a card shows".
async function attachStats(agencies) {
  const agencyIds = agencies.map((a) => a._id);
  if (agencyIds.length === 0) return [];

  const [listingCounts, soldCounts, agentCounts, viewsAgg, ratings] = await Promise.all([
    Property.aggregate([{ $match: { agencyId: { $in: agencyIds }, status: 'available' } }, { $group: { _id: '$agencyId', count: { $sum: 1 } } }]),
    Property.aggregate([{ $match: { agencyId: { $in: agencyIds }, status: 'sold' } }, { $group: { _id: '$agencyId', count: { $sum: 1 } } }]),
    User.aggregate([{ $match: { agencyId: { $in: agencyIds }, role: 'agent' } }, { $group: { _id: '$agencyId', count: { $sum: 1 } } }]),
    Property.aggregate([{ $match: { agencyId: { $in: agencyIds } } }, { $group: { _id: '$agencyId', totalViews: { $sum: '$views' } } }]),
    reviewService.getRatingSummaryForMany(agencyIds),
  ]);

  const toMap = (rows) => new Map(rows.map((r) => [r._id.toString(), r.count]));
  const listingsById = toMap(listingCounts);
  const soldById = toMap(soldCounts);
  const agentsById = toMap(agentCounts);
  const viewsById = new Map(viewsAgg.map((r) => [r._id.toString(), r.totalViews]));

  return agencies.map((agency) => {
    const id = agency._id.toString();
    return {
      ...agency.toObject(),
      stats: {
        activeListings: listingsById.get(id) || 0,
        soldProperties: soldById.get(id) || 0,
        activeAgents: agentsById.get(id) || 0,
        totalViews: viewsById.get(id) || 0,
        rating: ratings[id]?.average || 0,
        reviewCount: ratings[id]?.count || 0,
      },
    };
  });
}

async function listAgencies({ search, city, verified, plan, sort = 'newest', page = 1, limit = 12 } = {}) {
  const filter = { status: 'active' };
  if (city) filter.city = new RegExp(`^${city}$`, 'i');
  if (verified !== undefined) filter.verified = verified === 'true' || verified === true;
  if (plan) filter.subscriptionPlan = plan;
  if (search) filter.$text = { $search: search };

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(50, Number(limit) || 12));
  const skip = (pageNum - 1) * limitNum;
  const sortSpec = SORT_MAP[sort] || SORT_MAP.newest;

  const [items, total] = await Promise.all([
    Agency.find(filter).select(PUBLIC_LIST_FIELDS).sort(sortSpec).skip(skip).limit(limitNum),
    Agency.countDocuments(filter),
  ]);

  return {
    items: await attachStats(items),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 },
  };
}

// The categorized strips - each backed by a real, distinct query, not a
// slice of the same list relabeled six times.
async function getHomepageSections() {
  const base = { status: 'active' };

  const [featured, newest, verifiedAgencies, premium, recentlyActiveAgg] = await Promise.all([
    Agency.find({ ...base, featured: true }).select(PUBLIC_LIST_FIELDS).sort({ createdAt: -1 }).limit(8),
    Agency.find(base).select(PUBLIC_LIST_FIELDS).sort({ createdAt: -1 }).limit(8),
    Agency.find({ ...base, verified: true }).select(PUBLIC_LIST_FIELDS).sort({ createdAt: -1 }).limit(8),
    Agency.find({ ...base, subscriptionPlan: 'enterprise' }).select(PUBLIC_LIST_FIELDS).sort({ createdAt: -1 }).limit(8),
    // "Recently active" = agencies whose properties were most recently
    // touched (created or edited) - a real activity signal, not a
    // fabricated "last seen" timestamp nothing in the system tracks.
    Property.aggregate([{ $group: { _id: '$agencyId', lastActivity: { $max: '$updatedAt' } } }, { $sort: { lastActivity: -1 } }, { $limit: 8 }]),
  ]);

  const recentlyActiveIds = recentlyActiveAgg.map((r) => r._id);
  const recentlyActiveAgencies = await Agency.find({ _id: { $in: recentlyActiveIds }, ...base }).select(PUBLIC_LIST_FIELDS);
  const orderedRecentlyActive = recentlyActiveIds
    .map((id) => recentlyActiveAgencies.find((a) => a._id.toString() === id.toString()))
    .filter(Boolean);

  // "Top performing" needs the views stat first, so compute stats once
  // for a broader pool and sort by it - cheaper than a second aggregate.
  const pool = await Agency.find(base).select(PUBLIC_LIST_FIELDS).limit(60);
  const poolWithStats = await attachStats(pool);
  const topPerforming = [...poolWithStats].sort((a, b) => b.stats.totalViews - a.stats.totalViews).slice(0, 8);

  const [featuredWithStats, newestWithStats, verifiedWithStats, premiumWithStats, recentlyActiveWithStats] = await Promise.all([
    attachStats(featured),
    attachStats(newest),
    attachStats(verifiedAgencies),
    attachStats(premium),
    attachStats(orderedRecentlyActive),
  ]);

  return {
    featured: featuredWithStats,
    newlyRegistered: newestWithStats,
    verified: verifiedWithStats,
    premium: premiumWithStats,
    topPerforming,
    recentlyActive: recentlyActiveWithStats,
  };
}

async function getAgencyProfile(slug) {
  const agency = await Agency.findOne({ slug, status: 'active' });
  if (!agency) {
    const err = new Error('Agency not found');
    err.status = 404;
    throw err;
  }

  const [stats] = await attachStats([agency]);
  const [reviews, agents, related] = await Promise.all([
    reviewService.listReviews(agency._id, { page: 1, limit: 10 }),
    User.find({ agencyId: agency._id, role: 'agent' }).select('name email'),
    Agency.find({ _id: { $ne: agency._id }, status: 'active', city: agency.city })
      .select(PUBLIC_LIST_FIELDS)
      .limit(4),
  ]);

  return {
    ...stats,
    reviews,
    agents,
    relatedAgencies: await attachStats(related),
  };
}

module.exports = { listAgencies, getHomepageSections, getAgencyProfile };
