const propertyRepository = require('./property.repository');
const { estimatePrice } = require('../../shared/utils/priceEstimate');
const { pickAllowedFields } = require('../../shared/utils/whitelist');
const { escapeRegExp } = require('../../shared/utils/regex');
const auditLog = require('../audit/auditLog.service');

const DEFAULT_PAGE_SIZE = 10;

// Client-editable fields only. Deliberately excludes agent, status, views,
// publishedAt, and every Mongoose-managed field (_id, createdAt,
// updatedAt, __v) so those can never be set via create/update payloads,
// no matter what the client sends.
const EDITABLE_PROPERTY_FIELDS = [
  'title',
  'description',
  'price',
  'city',
  'locality',
  'area',
  'areaUnit',
  'type',
  'category',
  'bedrooms',
  'bathrooms',
  'floors',
  'constructionYear',
  'condition',
  'amenities',
  'location',
  'images',
  'videos',
  'virtualTourUrl',
  'documents',
  'negotiable',
  'maintenanceCharges',
  'featured',
];

// Required to move a draft to 'available'. Separate from Mongoose-level
// requiredness (relaxed on the model precisely so a draft CAN be
// incomplete) - this is enforced only at the publish transition.
const REQUIRED_TO_PUBLISH = ['title', 'city', 'price', 'area'];

const SORT_MAP = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  most_viewed: { views: -1 },
};

async function listProperties(tenantId, query) {
  const {
    city,
    locality,
    minPrice,
    maxPrice,
    type,
    category,
    bedrooms,
    featured,
    sort,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
  } = query;

  const filter = { status: 'available' };
  if (city) filter.city = new RegExp(`^${escapeRegExp(city)}$`, 'i');
  if (locality) filter.locality = new RegExp(escapeRegExp(locality), 'i');
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) };
  if (featured !== undefined) filter.featured = featured;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || DEFAULT_PAGE_SIZE);
  const skip = (pageNum - 1) * limitNum;
  const sortSpec = SORT_MAP[sort] || SORT_MAP.newest;

  const [items, total] = await Promise.all([
    propertyRepository.find(tenantId, filter).sort(sortSpec).skip(skip).limit(limitNum),
    propertyRepository.countDocuments(tenantId, filter),
  ]);

  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

async function listMyProperties(tenantId, requester) {
  const filter = requester.role === 'agency_admin' ? {} : { agent: requester.id };
  return propertyRepository.find(tenantId, filter).sort({ createdAt: -1 });
}

function notFound() {
  const err = new Error('Property not found');
  err.status = 404;
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.status = 403;
  return err;
}

function assertOwnership(property, requester, message) {
  if (requester.role !== 'agency_admin' && property.agent.toString() !== requester.id) {
    throw forbidden(message);
  }
}

async function getPropertyById(tenantId, id) {
  const property = await propertyRepository.incrementViewsById(tenantId, id);
  // Drafts are never publicly visible, even to someone who has/guesses
  // the ID - this is the public, unauthenticated route. Treated exactly
  // like "doesn't exist" rather than a 403, so a draft's existence isn't
  // leaked either.
  if (!property || property.status === 'draft') {
    throw notFound();
  }
  return property;
}

async function createProperty(tenantId, data, requester) {
  const safeData = pickAllowedFields(data, EDITABLE_PROPERTY_FIELDS);
  const property = await propertyRepository.create(tenantId, { ...safeData, agent: requester.id });
  auditLog.record({ tenantId, actor: requester, action: 'property.create', targetType: 'Property', targetId: property._id, metadata: { title: property.title } });
  return property;
}

// Wizard entry point: creates a minimal draft (only whatever Step 1 has
// collected so far - typically just a title). Everything else defaults
// per the relaxed schema fields; subsequent wizard steps fill it in via
// the ordinary updateProperty below.
async function createDraftProperty(tenantId, data, requester) {
  const safeData = pickAllowedFields(data, EDITABLE_PROPERTY_FIELDS);
  const property = await propertyRepository.create(tenantId, { ...safeData, agent: requester.id, status: 'draft' });
  auditLog.record({ tenantId, actor: requester, action: 'property.create_draft', targetType: 'Property', targetId: property._id, metadata: { title: property.title } });
  return property;
}

async function updateProperty(tenantId, id, data, requester) {
  const property = await propertyRepository.findById(tenantId, id);
  if (!property) throw notFound();
  assertOwnership(property, requester, 'You can only edit your own listings');

  const safeData = pickAllowedFields(data, EDITABLE_PROPERTY_FIELDS);
  Object.assign(property, safeData);
  await property.save();
  auditLog.record({ tenantId, actor: requester, action: 'property.update', targetType: 'Property', targetId: property._id, metadata: { fields: Object.keys(safeData) } });
  return property;
}

// The Step 7 "Publish" action. Validates completeness server-side
// (never trust the wizard's client-side step gating alone) and flips
// status: draft -> available. Returns the missing-field list on failure
// so the Review step can render it directly as a validation summary.
async function publishProperty(tenantId, id, requester) {
  const property = await propertyRepository.findById(tenantId, id);
  if (!property) throw notFound();
  assertOwnership(property, requester, 'You can only publish your own listings');

  const missing = REQUIRED_TO_PUBLISH.filter((field) => {
    const value = property[field];
    return value === undefined || value === null || value === '' || value === 0;
  });

  if (missing.length > 0) {
    const err = new Error('This listing is missing required fields and cannot be published yet.');
    err.status = 400;
    err.missing = missing;
    throw err;
  }

  property.status = 'available';
  property.publishedAt = new Date();
  await property.save();
  auditLog.record({ tenantId, actor: requester, action: 'property.publish', targetType: 'Property', targetId: property._id, metadata: { title: property.title } });
  return property;
}

async function deleteProperty(tenantId, id, requester) {
  const property = await propertyRepository.findById(tenantId, id);
  if (!property) throw notFound();
  assertOwnership(property, requester, 'You can only delete your own listings');

  await property.deleteOne();
  auditLog.record({ tenantId, actor: requester, action: 'property.delete', targetType: 'Property', targetId: property._id, metadata: { title: property.title } });
}

function getPriceEstimate(data) {
  return estimatePrice(data);
}

// Tenant-scoped, ownership-respecting comparison of up to 5 properties
// side by side - real documents only, 404s (not silently drops) any id
// that doesn't belong to this tenant.
const MAX_COMPARE = 5;
async function compareProperties(tenantId, ids) {
  if (!Array.isArray(ids) || ids.length < 2) {
    const err = new Error('Provide at least 2 property ids to compare');
    err.status = 400;
    throw err;
  }
  const uniqueIds = [...new Set(ids)].slice(0, MAX_COMPARE);
  // status: 'available' only - this is reachable by the customer role via
  // the AI compare_properties tool, so a draft must never leak through it.
  const properties = await propertyRepository.find(tenantId, { _id: { $in: uniqueIds }, status: 'available' });
  if (properties.length !== uniqueIds.length) throw notFound();
  return properties;
}

// Simple, explainable content-based recommendation: same city + same
// type, closest in price to the reference listing, excluding itself.
// No ML model, no invented "similarity score" - just a real query
// against the same data every other property tool reads from.
async function recommendProperties(tenantId, propertyId, limit = 6) {
  const reference = await propertyRepository.findById(tenantId, propertyId);
  if (!reference) throw notFound();

  const candidates = await propertyRepository.find(tenantId, {
    _id: { $ne: reference._id },
    status: 'available',
    city: reference.city,
    type: reference.type,
  });

  return candidates
    .sort((a, b) => Math.abs(a.price - reference.price) - Math.abs(b.price - reference.price))
    .slice(0, limit);
}

// Real, live-computed analytics slices - each backed by an actual sort
// against status:'available' documents, nothing hardcoded.
async function getAnalytics(tenantId) {
  const [recentlyAdded, featured, mostViewed, highestPrice, lowestPrice, totalAvailable] = await Promise.all([
    propertyRepository.find(tenantId, { status: 'available' }).sort({ createdAt: -1 }).limit(5),
    propertyRepository.find(tenantId, { status: 'available', featured: true }).sort({ createdAt: -1 }).limit(5),
    propertyRepository.find(tenantId, { status: 'available' }).sort({ views: -1 }).limit(5),
    propertyRepository.find(tenantId, { status: 'available' }).sort({ price: -1 }).limit(5),
    propertyRepository.find(tenantId, { status: 'available' }).sort({ price: 1 }).limit(5),
    propertyRepository.countDocuments(tenantId, { status: 'available' }),
  ]);

  return { totalAvailable, recentlyAdded, featured, mostViewed, highestPrice, lowestPrice };
}

module.exports = {
  listProperties,
  listMyProperties,
  getPropertyById,
  createProperty,
  createDraftProperty,
  updateProperty,
  publishProperty,
  deleteProperty,
  getPriceEstimate,
  compareProperties,
  recommendProperties,
  getAnalytics,
};
