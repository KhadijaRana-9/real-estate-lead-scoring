const propertyRepository = require('../property/property.repository');
const inquiryRepository = require('../inquiry/inquiry.repository');
const dashboardService = require('../dashboard/dashboard.service');
const { toCsv } = require('../../shared/utils/csv');

// Same ownership scoping every other agent-facing read in this codebase
// uses: agency_admin sees everything, agent sees only their own listings.
async function scopedPropertyIds(tenantId, requester) {
  const filter = requester.role === 'agency_admin' ? {} : { agent: requester.id };
  return propertyRepository.find(tenantId, filter).distinct('_id');
}

async function propertiesReport(tenantId, requester) {
  const filter = requester.role === 'agency_admin' ? {} : { agent: requester.id };
  const properties = await propertyRepository.find(tenantId, filter).sort({ createdAt: -1 });

  return toCsv(properties, [
    { label: 'Title', value: (p) => p.title },
    { label: 'Status', value: (p) => p.status },
    { label: 'City', value: (p) => p.city },
    { label: 'Locality', value: (p) => p.locality },
    { label: 'Type', value: (p) => p.type },
    { label: 'Price', value: (p) => p.price },
    { label: 'Area', value: (p) => `${p.area} ${p.areaUnit}` },
    { label: 'Bedrooms', value: (p) => p.bedrooms },
    { label: 'Views', value: (p) => p.views },
    { label: 'Created', value: (p) => p.createdAt.toISOString() },
  ]);
}

async function leadsReport(tenantId, requester) {
  const propertyIds = await scopedPropertyIds(tenantId, requester);
  const leads = await inquiryRepository
    .find(tenantId, { property: { $in: propertyIds } })
    .populate('property', 'title city')
    .sort({ score: -1, createdAt: -1 });

  return toCsv(leads, [
    { label: 'Customer', value: (l) => l.customer.name },
    { label: 'Email', value: (l) => l.customer.email },
    { label: 'Phone', value: (l) => l.customer.phone },
    { label: 'Property', value: (l) => l.property?.title },
    { label: 'City', value: (l) => l.property?.city },
    { label: 'Budget', value: (l) => l.budget },
    { label: 'Score', value: (l) => l.score },
    { label: 'Status', value: (l) => l.status },
    { label: 'Pipeline Stage', value: (l) => l.pipelineStage },
    { label: 'Move Timeline', value: (l) => l.moveTimeline },
    { label: 'Created', value: (l) => l.createdAt.toISOString() },
  ]);
}

async function dashboardSummaryReport(tenantId, requester) {
  const summary = await dashboardService.getSummary(tenantId, requester);
  const rows = [
    { metric: 'Total Properties', value: summary.cards.totalProperties },
    { metric: 'Total Inquiries', value: summary.cards.totalInquiries },
    { metric: 'Hot Leads', value: summary.cards.hotLeads },
    { metric: 'Average Lead Score', value: summary.cards.averageLeadScore },
    { metric: 'Most Viewed Property', value: summary.cards.mostViewedProperty?.title || '' },
    { metric: 'Most Viewed Property Views', value: summary.cards.mostViewedProperty?.views ?? '' },
  ];

  return toCsv(rows, [
    { label: 'Metric', value: (r) => r.metric },
    { label: 'Value', value: (r) => r.value },
  ]);
}

module.exports = { propertiesReport, leadsReport, dashboardSummaryReport };
