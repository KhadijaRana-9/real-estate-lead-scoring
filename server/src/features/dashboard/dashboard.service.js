const propertyRepository = require('../property/property.repository');
const inquiryRepository = require('../inquiry/inquiry.repository');
const User = require('../auth/auth.model');
const { buildMonthlyTrend } = require('../../shared/utils/monthlyTrend');

async function getPublicStats(tenantId) {
  const [properties, cities, agents] = await Promise.all([
    propertyRepository.countDocuments(tenantId, { status: 'available' }),
    propertyRepository.distinctCities(tenantId),
    User.countDocuments({ agencyId: tenantId, role: 'agent' }),
  ]);

  return { properties, cities: cities.length, agents };
}

async function getSummary(tenantId, requester) {
  const propertyFilter = requester.role === 'agency_admin' ? {} : { agent: requester.id };
  const properties = await propertyRepository.find(tenantId, propertyFilter).select('_id title views');
  const propertyIds = properties.map((p) => p._id);

  const [totalProperties, totalInquiries, inquiries] = await Promise.all([
    propertyRepository.countDocuments(tenantId, propertyFilter),
    inquiryRepository.countDocuments(tenantId, { property: { $in: propertyIds } }),
    inquiryRepository.find(tenantId, { property: { $in: propertyIds } }).select('score status property createdAt'),
  ]);

  const hotLeads = inquiries.filter((i) => i.status === 'hot').length;
  const avgScore = inquiries.length
    ? Math.round(inquiries.reduce((sum, i) => sum + i.score, 0) / inquiries.length)
    : 0;

  const topInquiry = inquiries.reduce(
    (best, current) => (!best || current.score > best.score ? current : best),
    null
  );

  const topProperty = properties.reduce(
    (best, current) => (!best || current.views > best.views ? current : best),
    null
  );

  const statusBreakdown = ['hot', 'warm', 'cold'].map((status) => ({
    status,
    count: inquiries.filter((i) => i.status === status).length,
  }));

  const monthlyInquiries = buildMonthlyTrend(inquiries);

  const topProperties = [...properties]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((p) => ({ title: p.title, views: p.views }));

  let highestScoringLead = null;
  if (topInquiry) {
    const inquiryWithLead = await inquiryRepository.findById(tenantId, topInquiry._id).select('customer score');
    highestScoringLead = { name: inquiryWithLead.customer.name, score: inquiryWithLead.score };
  }

  return {
    cards: {
      totalProperties,
      totalInquiries,
      hotLeads,
      averageLeadScore: avgScore,
      highestScoringLead,
      mostViewedProperty: topProperty ? { title: topProperty.title, views: topProperty.views } : null,
    },
    charts: {
      monthlyInquiries,
      leadStatusBreakdown: statusBreakdown,
      topProperties,
    },
  };
}

module.exports = { getSummary, getPublicStats };
