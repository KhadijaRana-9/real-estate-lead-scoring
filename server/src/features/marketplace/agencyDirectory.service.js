const Agency = require('../agency/agency.model');
const Property = require('../property/property.model');
const User = require('../auth/auth.model');
const reviewService = require('../review/review.service');
const followService = require('../follow/follow.service');

const PUBLIC_LIST_FIELDS =
  'companyName slug logo coverBanner verified featured city country phone whatsapp contactEmail website subscriptionPlan establishedYear languages specializations createdAt officeLocations ceoMessage mission vision timeline awards officeGallery businessHours socialMedia description licenseNumber';

const SORT_MAP = {
  newest: { createdAt: -1 },
  name_asc: { companyName: 1 },
};

// Real, documented formula over inputs that actually exist - every other
// factor commonly seen on "trust score" marketing pages (response rate,
// complaint ratio, document verification workflow) has no backing data
// source in this system yet, so it's deliberately excluded rather than
// invented. Capped 0-100.
function computeTrustScore(agency, stats) {
  const verifiedPoints = agency.verified ? 20 : 0;
  const ratingPoints = (stats.rating / 5) * 30;
  const reviewVolumePoints = (Math.min(stats.reviewCount, 20) / 20) * 15;
  const yearsInBusiness = agency.establishedYear ? new Date().getFullYear() - agency.establishedYear : 0;
  const experiencePoints = (Math.min(Math.max(yearsInBusiness, 0), 10) / 10) * 15;
  const soldPoints = (Math.min(stats.soldProperties, 50) / 50) * 10;
  const listingPoints = (Math.min(stats.activeListings, 20) / 20) * 10;

  return Math.round(verifiedPoints + ratingPoints + reviewVolumePoints + experiencePoints + soldPoints + listingPoints);
}

// Attaches the same real, live-aggregated stats block to every agency
// card regardless of which list it came from (directory, featured,
// top-performing, ...) - one source of truth for "what a card shows".
// requesterId is optional (anonymous browsing) - when present, each
// agency also gets a real isFollowing flag so list/strip cards can show
// an accurate Follow/Following state, not just the single-agency profile
// page.
async function attachStats(agencies, requesterId) {
  const agencyIds = agencies.map((a) => a._id);
  if (agencyIds.length === 0) return [];

  const [listingCounts, soldCounts, agentCounts, viewsAgg, ratings, followerCounts, followingSet] = await Promise.all([
    Property.aggregate([{ $match: { agencyId: { $in: agencyIds }, status: 'available' } }, { $group: { _id: '$agencyId', count: { $sum: 1 } } }]),
    Property.aggregate([{ $match: { agencyId: { $in: agencyIds }, status: 'sold' } }, { $group: { _id: '$agencyId', count: { $sum: 1 } } }]),
    User.aggregate([{ $match: { agencyId: { $in: agencyIds }, role: 'agent' } }, { $group: { _id: '$agencyId', count: { $sum: 1 } } }]),
    Property.aggregate([{ $match: { agencyId: { $in: agencyIds } } }, { $group: { _id: '$agencyId', totalViews: { $sum: '$views' } } }]),
    reviewService.getRatingSummaryForMany(agencyIds),
    followService.getFollowerCountsForMany(agencyIds),
    followService.getFollowingSetForMany(agencyIds, requesterId),
  ]);

  const toMap = (rows) => new Map(rows.map((r) => [r._id.toString(), r.count]));
  const listingsById = toMap(listingCounts);
  const soldById = toMap(soldCounts);
  const agentsById = toMap(agentCounts);
  const viewsById = new Map(viewsAgg.map((r) => [r._id.toString(), r.totalViews]));

  return agencies.map((agency) => {
    const id = agency._id.toString();
    const stats = {
      activeListings: listingsById.get(id) || 0,
      soldProperties: soldById.get(id) || 0,
      activeAgents: agentsById.get(id) || 0,
      totalViews: viewsById.get(id) || 0,
      rating: ratings[id]?.average || 0,
      reviewCount: ratings[id]?.count || 0,
      followerCount: followerCounts[id] || 0,
    };
    return {
      ...agency.toObject(),
      isFollowing: followingSet.has(id),
      stats: { ...stats, trustScore: computeTrustScore(agency, stats) },
    };
  });
}

// Sort keys backed by a real, computed stat (rating/trust/sold/viewed)
// can't be done as a Mongo-level sort without denormalizing that stat
// onto the Agency document - instead of doing that prematurely, compute
// stats for the filtered pool and sort/paginate in memory. Fine at this
// data scale; revisit with a materialized stats field if the agency
// count grows large enough for this to matter.
const STAT_SORTS = {
  highest_rated: (a, b) => b.stats.rating - a.stats.rating,
  most_properties: (a, b) => b.stats.activeListings - a.stats.activeListings,
  most_sold: (a, b) => b.stats.soldProperties - a.stats.soldProperties,
  most_viewed: (a, b) => b.stats.totalViews - a.stats.totalViews,
  trust_score: (a, b) => b.stats.trustScore - a.stats.trustScore,
};

async function listAgencies({ search, city, verified, plan, sort = 'newest', page = 1, limit = 12 } = {}, requesterId) {
  const filter = { status: 'active' };
  if (city) filter.city = new RegExp(`^${city}$`, 'i');
  if (verified !== undefined) filter.verified = verified === 'true' || verified === true;
  if (plan) filter.subscriptionPlan = plan;
  if (search) filter.$text = { $search: search };

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(50, Number(limit) || 12));

  if (STAT_SORTS[sort]) {
    const pool = await Agency.find(filter).select(PUBLIC_LIST_FIELDS).limit(500);
    const poolWithStats = await attachStats(pool, requesterId);
    poolWithStats.sort(STAT_SORTS[sort]);
    const total = poolWithStats.length;
    const start = (pageNum - 1) * limitNum;
    return {
      items: poolWithStats.slice(start, start + limitNum),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 },
    };
  }

  const skip = (pageNum - 1) * limitNum;
  const sortSpec = SORT_MAP[sort] || SORT_MAP.newest;

  const [items, total] = await Promise.all([
    Agency.find(filter).select(PUBLIC_LIST_FIELDS).sort(sortSpec).skip(skip).limit(limitNum),
    Agency.countDocuments(filter),
  ]);

  return {
    items: await attachStats(items, requesterId),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 },
  };
}

// Lightweight, fast autocomplete - prefix match on name/city, minimal
// fields, no stats computation (that's what makes it fast enough to
// call on every keystroke).
async function autocomplete(query) {
  if (!query || query.trim().length < 1) return [];
  const regex = new RegExp(`^${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  return Agency.find({ status: 'active', $or: [{ companyName: regex }, { city: regex }] })
    .select('companyName slug logo city')
    .limit(8);
}

async function compareAgencies(slugs) {
  if (!Array.isArray(slugs) || slugs.length < 2) {
    const err = new Error('Provide at least 2 agency slugs to compare');
    err.status = 400;
    throw err;
  }
  const uniqueSlugs = [...new Set(slugs)].slice(0, 5);
  const agencies = await Agency.find({ slug: { $in: uniqueSlugs }, status: 'active' }).select(PUBLIC_LIST_FIELDS);
  if (agencies.length !== uniqueSlugs.length) {
    const err = new Error('One or more agencies not found');
    err.status = 404;
    throw err;
  }
  return attachStats(agencies);
}

// Real, cross-tenant platform totals for the marketplace hero's counters
// - the only public (no super_admin auth) aggregate view of the whole
// platform, deliberately narrow (counts only, no per-agency detail).
async function getPublicPlatformStats() {
  const [totalAgencies, totalProperties, totalAgents, cities] = await Promise.all([
    Agency.countDocuments({ status: 'active' }),
    Property.countDocuments({ status: 'available' }),
    User.countDocuments({ role: 'agent' }),
    Property.distinct('city', { status: 'available' }),
  ]);
  return { totalAgencies, totalProperties, totalAgents, totalCities: cities.length };
}

// The categorized strips - each backed by a real, distinct query, not a
// slice of the same list relabeled six times.
async function getHomepageSections(requesterId) {
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
  const poolWithStats = await attachStats(pool, requesterId);
  const topPerforming = [...poolWithStats].sort((a, b) => b.stats.totalViews - a.stats.totalViews).slice(0, 8);

  const [featuredWithStats, newestWithStats, verifiedWithStats, premiumWithStats, recentlyActiveWithStats] = await Promise.all([
    attachStats(featured, requesterId),
    attachStats(newest, requesterId),
    attachStats(verifiedAgencies, requesterId),
    attachStats(premium, requesterId),
    attachStats(orderedRecentlyActive, requesterId),
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

async function getAgencyProfile(slug, requesterId) {
  const agency = await Agency.findOne({ slug, status: 'active' });
  if (!agency) {
    const err = new Error('Agency not found');
    err.status = 404;
    throw err;
  }

  const [stats] = await attachStats([agency]);
  const [reviews, ratingDistribution, agents, related, following] = await Promise.all([
    reviewService.listReviews(agency._id, { page: 1, limit: 10 }),
    reviewService.getRatingDistribution(agency._id),
    User.find({ agencyId: agency._id, role: 'agent' }).select('name email phone whatsapp avatar'),
    Agency.find({ _id: { $ne: agency._id }, status: 'active', city: agency.city })
      .select(PUBLIC_LIST_FIELDS)
      .limit(4),
    followService.isFollowing(agency._id, requesterId),
  ]);

  return {
    ...stats,
    reviews,
    ratingDistribution,
    agents,
    relatedAgencies: await attachStats(related, requesterId),
    isFollowing: following,
  };
}

module.exports = { listAgencies, getHomepageSections, getAgencyProfile, autocomplete, compareAgencies, getPublicPlatformStats };
