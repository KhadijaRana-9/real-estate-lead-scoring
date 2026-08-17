const Favorite = require('./favorite.model');
const Property = require('../property/property.model');
const propertyRepository = require('../property/property.repository');
const propertyService = require('../property/property.service');

function notFound() {
  const err = new Error('Property not found');
  err.status = 404;
  return err;
}

// A favorite's agencyId is the PROPERTY's own agency (see the "every
// query is scoped through this" comment on favorite.model.js), not
// necessarily the caller's. The public marketplace (Listings.jsx) is
// explicitly cross-tenant, so a customer can favorite a property that
// belongs to a different agency than their own account - looking the
// property up scoped to the caller's tenant (the old behavior) 404'd
// on exactly that case. Looked up by id alone here instead.
async function resolvePropertyAgencyId(propertyId) {
  const property = await Property.findById(propertyId).select('agencyId');
  if (!property) throw notFound();
  return property.agencyId;
}

async function addFavorite(_callerTenantId, userId, propertyId) {
  const agencyId = await resolvePropertyAgencyId(propertyId);
  // Upsert, same discipline as follow.service.js - favoriting twice
  // (double click, a retried request) must never throw a duplicate-key
  // error to the user. Matches favorite.model.js's real unique index
  // (property + user, not agencyId).
  await Favorite.findOneAndUpdate(
    { property: propertyId, user: userId },
    { agencyId, property: propertyId, user: userId },
    { upsert: true }
  );
  return { favorited: true };
}

async function removeFavorite(_callerTenantId, userId, propertyId) {
  await Favorite.deleteOne({ property: propertyId, user: userId });
  return { favorited: false };
}

async function isFavorited(_callerTenantId, userId, propertyId) {
  if (!userId) return false;
  const doc = await Favorite.findOne({ property: propertyId, user: userId }).select('_id');
  return Boolean(doc);
}

// Real, live-joined property documents - never a stale snapshot copied
// onto the Favorite row itself, so a favorited listing's price/status/
// photos are always current as of right now. Draft/sold properties
// silently drop out of the list (same "never leak a non-available
// listing" discipline as get_property_details' customer-facing check),
// not an error - a favorite pointing at a property that's no longer
// public just has nothing to show for it.
//
// crossTenant=false (default, used by the AI tools' get_favorite_properties -
// see ai.tools.js) keeps its existing single-tenant behavior unchanged:
// favorites are scoped to the AI conversation's one fixed agency context.
// crossTenant=true (the customer-facing "My Favorites" page/API - see
// property.controller.js's listFavorites) shows every agency the
// customer has favorited from, since addFavorite lets them favorite
// across the whole public marketplace, not just their own agency.
async function listFavoriteProperties(tenantId, userId, { limit = 8, crossTenant = false } = {}) {
  const favoriteFilter = crossTenant ? { user: userId } : { agencyId: tenantId, user: userId };
  const favorites = await Favorite.find(favoriteFilter).sort({ createdAt: -1 }).limit(limit).select('property agencyId');
  const propertyIds = favorites.map((f) => f.property);
  if (propertyIds.length === 0) return [];

  if (!crossTenant) {
    const properties = await propertyRepository.find(tenantId, { _id: { $in: propertyIds }, status: 'available' });
    const byId = new Map(properties.map((p) => [p._id.toString(), p]));
    // Preserve most-recently-favorited-first order - the $in query above
    // doesn't guarantee it.
    const ordered = propertyIds.map((id) => byId.get(id.toString())).filter(Boolean);
    // Real batched rating aggregation, same helper every other property
    // list uses (property.service.js's attachRatings) - a favorited
    // property's card shows the same real average/count as everywhere
    // else.
    return propertyService.attachRatings(tenantId, ordered);
  }

  // Favorited properties may span multiple agencies - fetch (and rate)
  // once per distinct agency, reusing the same tenant-scoped helpers
  // above unchanged, then re-merge into one most-recent-first list.
  const agencyIds = [...new Set(favorites.map((f) => f.agencyId.toString()))];
  const byId = new Map();
  for (const agencyId of agencyIds) {
    const idsForAgency = favorites.filter((f) => f.agencyId.toString() === agencyId).map((f) => f.property);
    const properties = await propertyRepository.find(agencyId, { _id: { $in: idsForAgency }, status: 'available' });
    const rated = await propertyService.attachRatings(agencyId, properties);
    rated.forEach((p) => byId.set(p._id.toString(), p));
  }
  return propertyIds.map((id) => byId.get(id.toString())).filter(Boolean);
}

// Real aggregation over Favorite, grouped by property - the only honest
// way to answer "which property is most popular/saved/has the highest
// customer engagement", since no separate favorite-count field is
// stored on Property itself (same "compute, don't cache" discipline as
// propertyReview.service.js's rankByReviews).
async function getMostFavoritedProperties(tenantId, { limit = 6, agentId } = {}) {
  const results = await Favorite.aggregate([
    { $match: { agencyId: tenantId } },
    { $group: { _id: '$property', favoriteCount: { $sum: 1 } } },
    { $sort: { favoriteCount: -1 } },
    { $limit: Math.max(limit * 3, limit) },
  ]);
  if (!results.length) return [];

  const propertyIds = results.map((r) => r._id);
  const propertyFilter = agentId ? { _id: { $in: propertyIds }, agent: agentId, status: 'available' } : { _id: { $in: propertyIds }, status: 'available' };
  const properties = await propertyRepository.find(tenantId, propertyFilter);
  const propertyById = new Map(properties.map((p) => [p._id.toString(), p]));
  const countById = new Map(results.map((r) => [r._id.toString(), r.favoriteCount]));

  const ordered = results.map((r) => propertyById.get(r._id.toString())).filter(Boolean).slice(0, limit);
  const withRatings = await propertyService.attachRatings(tenantId, ordered);
  return withRatings.map((p) => ({ ...p, favoriteCount: countById.get(p._id.toString()) }));
}

module.exports = { addFavorite, removeFavorite, isFavorited, listFavoriteProperties, getMostFavoritedProperties };
