const Property = require('./property.model');

// Every method requires tenantId as its first argument - there is no
// method on this module that can query Property without it, so an
// unscoped query is a missing-argument error at the call site, not a
// silently-forgotten filter.

function find(tenantId, filter = {}) {
  return Property.find({ ...filter, agencyId: tenantId });
}

function countDocuments(tenantId, filter = {}) {
  return Property.countDocuments({ ...filter, agencyId: tenantId });
}

function findById(tenantId, id) {
  return Property.findOne({ _id: id, agencyId: tenantId });
}

function incrementViewsById(tenantId, id) {
  return Property.findOneAndUpdate(
    { _id: id, agencyId: tenantId },
    { $inc: { views: 1 } },
    { new: true }
  ).populate('agent', 'name email phone whatsapp avatar');
}

function create(tenantId, data) {
  return Property.create({ ...data, agencyId: tenantId });
}

function distinctCities(tenantId) {
  return Property.distinct('city', { agencyId: tenantId });
}

module.exports = { find, countDocuments, findById, incrementViewsById, create, distinctCities };
