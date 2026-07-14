const Inquiry = require('./inquiry.model');
const Property = require('../property/property.model');
const { calculateLeadScore } = require('../../shared/utils/leadScoring');

async function createInquiry({ propertyId, customer, message, budget, moveTimeline }) {
  const property = await Property.findById(propertyId);
  if (!property) {
    const err = new Error('Property not found');
    err.status = 404;
    throw err;
  }

  const { total, status, breakdown } = calculateLeadScore({
    budget,
    price: property.price,
    moveTimeline,
    message,
    phone: customer.phone,
    propertyViews: property.views,
  });

  const inquiry = await Inquiry.create({
    property: property._id,
    customer,
    message,
    budget,
    moveTimeline,
    score: total,
    status,
    scoreBreakdown: breakdown,
  });

  return inquiry;
}

async function listInquiriesForAgent(requester) {
  const propertyFilter = requester.role === 'admin' ? {} : { agent: requester.id };
  const propertyIds = await Property.find(propertyFilter).distinct('_id');

  return Inquiry.find({ property: { $in: propertyIds } })
    .populate('property', 'title city price')
    .sort({ score: -1, createdAt: -1 });
}

module.exports = { createInquiry, listInquiriesForAgent };
