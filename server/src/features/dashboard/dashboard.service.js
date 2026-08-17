const propertyRepository = require('../property/property.repository');
const inquiryRepository = require('../inquiry/inquiry.repository');
const User = require('../auth/auth.model');
const AgencyInvite = require('../agency/agencyInvite.model');
const AgencyApplication = require('../agency/agencyApplication.model');
const { buildMonthlyTrend } = require('../../shared/utils/monthlyTrend');
const propertyReviewService = require('../propertyReview/propertyReview.service');

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

  // Real, review-based ranking - a different dimension than topProperties
  // above (which is view-count only) - see propertyReview.service.js.
  // agency_admin sees the whole agency's top listings; an agent sees only
  // their own, same scoping the rest of this function already uses.
  const topRatedListings = await propertyReviewService.getTopRatedProperties(tenantId, {
    limit: 5,
    agentId: requester.role === 'agency_admin' ? undefined : requester.id,
  });

  let highestScoringLead = null;
  if (topInquiry) {
    const inquiryWithLead = await inquiryRepository.findById(tenantId, topInquiry._id).select('customer score');
    highestScoringLead = { name: inquiryWithLead.customer.name, score: inquiryWithLead.score };
  }

  // Team figures are agency_admin-only (matches the Team tab itself,
  // which is only shown to agency_admin in AgentDashboard.jsx) - null
  // for a plain agent rather than real-but-irrelevant numbers, so the
  // frontend can tell "not applicable" apart from "zero".
  let team = null;
  if (requester.role === 'agency_admin') {
    const [totalAgents, pendingInvitations, pendingApplications] = await Promise.all([
      User.countDocuments({ agencyId: tenantId, role: 'agent' }),
      AgencyInvite.countDocuments({ agencyId: tenantId, revokedAt: null, acceptedAt: null, expiresAt: { $gt: new Date() } }),
      AgencyApplication.countDocuments({ agencyId: tenantId, status: 'pending' }),
    ]);
    team = { totalAgents, pendingInvitations, pendingApplications };
  }

  return {
    cards: {
      totalProperties,
      totalInquiries,
      hotLeads,
      averageLeadScore: avgScore,
      highestScoringLead,
      mostViewedProperty: topProperty ? { title: topProperty.title, views: topProperty.views } : null,
      team,
    },
    charts: {
      monthlyInquiries,
      leadStatusBreakdown: statusBreakdown,
      topProperties,
    },
    topRatedListings,
  };
}

module.exports = { getSummary, getPublicStats };
