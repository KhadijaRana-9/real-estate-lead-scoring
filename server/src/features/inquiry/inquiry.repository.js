const Inquiry = require('./inquiry.model');

// Same contract as property.repository.js: tenantId is a required first
// argument on every method, not an optional filter someone might forget.

function find(tenantId, filter = {}) {
  return Inquiry.find({ ...filter, agencyId: tenantId });
}

function countDocuments(tenantId, filter = {}) {
  return Inquiry.countDocuments({ ...filter, agencyId: tenantId });
}

function findById(tenantId, id) {
  return Inquiry.findOne({ _id: id, agencyId: tenantId });
}

function create(tenantId, data) {
  return Inquiry.create({ ...data, agencyId: tenantId });
}

function findByIdAndUpdate(tenantId, id, update) {
  return Inquiry.findOneAndUpdate({ _id: id, agencyId: tenantId }, update, { new: true });
}

module.exports = { find, countDocuments, findById, create, findByIdAndUpdate };
