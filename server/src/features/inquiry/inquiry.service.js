const inquiryRepository = require('./inquiry.repository');
const propertyRepository = require('../property/property.repository');
const { calculateLeadScore } = require('../../shared/utils/leadScoring');
const auditLog = require('../audit/auditLog.service');

async function createInquiry(tenantId, { propertyId, customer, message, budget, moveTimeline }) {
  // Scoping this lookup to tenantId means an inquiry submitted on Agency
  // A's site can never attach itself to Agency B's property, even if the
  // client sends Agency B's real propertyId - it 404s exactly like a
  // property that doesn't exist at all.
  const property = await propertyRepository.findById(tenantId, propertyId);
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

  return inquiryRepository.create(tenantId, {
    property: property._id,
    customer,
    message,
    budget,
    moveTimeline,
    score: total,
    status,
    scoreBreakdown: breakdown,
  });
}

async function listInquiriesForAgent(tenantId, requester) {
  const propertyFilter = requester.role === 'agency_admin' ? {} : { agent: requester.id };
  const propertyIds = await propertyRepository.find(tenantId, propertyFilter).distinct('_id');

  return inquiryRepository
    .find(tenantId, { property: { $in: propertyIds } })
    .populate('property', 'title city price')
    .sort({ score: -1, createdAt: -1 });
}

const { PIPELINE_STAGES } = require('./pipelineStages');

function notFound() {
  const err = new Error('Lead not found');
  err.status = 404;
  return err;
}

// Same ownership rule as every other agent-facing lead read: an agent only
// ever sees leads against their own listings, agency_admin sees all of them.
async function accessibleLeadIds(tenantId, requester) {
  const propertyFilter = requester.role === 'agency_admin' ? {} : { agent: requester.id };
  return propertyRepository.find(tenantId, propertyFilter).distinct('_id');
}

async function getPipeline(tenantId, requester) {
  const propertyIds = await accessibleLeadIds(tenantId, requester);
  const leads = await inquiryRepository
    .find(tenantId, { property: { $in: propertyIds } })
    .populate('property', 'title city price')
    .sort({ updatedAt: -1 });

  const stages = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: leads.filter((l) => l.pipelineStage === stage).length,
    leads: leads.filter((l) => l.pipelineStage === stage),
  }));

  return { stages, total: leads.length };
}

async function moveLeadStage(tenantId, inquiryId, stage, requester) {
  if (!PIPELINE_STAGES.includes(stage)) {
    const err = new Error(`Invalid pipeline stage. Must be one of: ${PIPELINE_STAGES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const propertyIds = await accessibleLeadIds(tenantId, requester);
  const inquiry = await inquiryRepository.findById(tenantId, inquiryId);
  if (!inquiry || !propertyIds.some((id) => id.toString() === inquiry.property.toString())) {
    throw notFound();
  }

  const updated = await inquiryRepository.findByIdAndUpdate(tenantId, inquiryId, { pipelineStage: stage });
  auditLog.record({
    tenantId,
    actor: requester,
    action: 'lead.stage_change',
    targetType: 'Inquiry',
    targetId: inquiry._id,
    metadata: { from: inquiry.pipelineStage, to: stage },
  });
  return updated;
}

module.exports = { createInquiry, listInquiriesForAgent, getPipeline, moveLeadStage, PIPELINE_STAGES };
