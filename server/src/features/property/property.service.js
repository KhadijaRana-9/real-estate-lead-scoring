const Property = require('./property.model');
const { estimatePrice } = require('../../shared/utils/priceEstimate');

const DEFAULT_PAGE_SIZE = 10;

async function listProperties(query) {
  const { city, minPrice, maxPrice, type, bedrooms, page = 1, limit = DEFAULT_PAGE_SIZE } = query;

  const filter = { status: 'available' };
  if (city) filter.city = new RegExp(`^${city}$`, 'i');
  if (type) filter.type = type;
  if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || DEFAULT_PAGE_SIZE);
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Property.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Property.countDocuments(filter),
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

async function listMyProperties(requester) {
  const filter = requester.role === 'admin' ? {} : { agent: requester.id };
  return Property.find(filter).sort({ createdAt: -1 });
}

async function getPropertyById(id) {
  const property = await Property.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
  if (!property) {
    const err = new Error('Property not found');
    err.status = 404;
    throw err;
  }
  return property;
}

async function createProperty(data, agentId) {
  return Property.create({ ...data, agent: agentId });
}

async function updateProperty(id, data, requester) {
  const property = await Property.findById(id);
  if (!property) {
    const err = new Error('Property not found');
    err.status = 404;
    throw err;
  }
  if (requester.role !== 'admin' && property.agent.toString() !== requester.id) {
    const err = new Error('You can only edit your own listings');
    err.status = 403;
    throw err;
  }

  Object.assign(property, data);
  await property.save();
  return property;
}

async function deleteProperty(id, requester) {
  const property = await Property.findById(id);
  if (!property) {
    const err = new Error('Property not found');
    err.status = 404;
    throw err;
  }
  if (requester.role !== 'admin' && property.agent.toString() !== requester.id) {
    const err = new Error('You can only delete your own listings');
    err.status = 403;
    throw err;
  }

  await property.deleteOne();
}

function getPriceEstimate(data) {
  return estimatePrice(data);
}

module.exports = {
  listProperties,
  listMyProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPriceEstimate,
};
