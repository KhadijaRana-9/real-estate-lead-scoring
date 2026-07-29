const Agency = require('../agency/agency.model');
const Property = require('../property/property.model');
const Inquiry = require('../inquiry/inquiry.model');
const User = require('../auth/auth.model');
const { buildMonthlyTrend } = require('../../shared/utils/monthlyTrend');

async function getPlatformSummary() {
  const [
    totalAgencies,
    activeAgencies,
    trialAgencies,
    suspendedAgencies,
    totalProperties,
    totalLeads,
    hotLeads,
    totalUsers,
    planBreakdownRaw,
    newestAgencies,
    agenciesForGrowth,
    topAgenciesByProperties,
  ] = await Promise.all([
    Agency.countDocuments({}),
    Agency.countDocuments({ subscriptionStatus: 'active' }),
    Agency.countDocuments({ subscriptionStatus: 'trialing' }),
    Agency.countDocuments({ status: 'suspended' }),
    Property.countDocuments({}),
    Inquiry.countDocuments({}),
    Inquiry.countDocuments({ status: 'hot' }),
    User.countDocuments({ role: { $ne: 'super_admin' } }),
    Agency.aggregate([{ $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } }]),
    Agency.find().sort({ createdAt: -1 }).limit(5).select('companyName slug subscriptionPlan subscriptionStatus createdAt'),
    Agency.find().select('createdAt'),
    Property.aggregate([
      { $group: { _id: '$agencyId', propertyCount: { $sum: 1 } } },
      { $sort: { propertyCount: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const topAgencyDocs = await Agency.find({
    _id: { $in: topAgenciesByProperties.map((p) => p._id) },
  }).select('companyName slug');
  const agencyById = new Map(topAgencyDocs.map((a) => [a._id.toString(), a]));

  const mostActiveAgencies = topAgenciesByProperties.map((p) => ({
    agencyId: p._id,
    companyName: agencyById.get(p._id.toString())?.companyName || 'Unknown',
    propertyCount: p.propertyCount,
  }));

  return {
    cards: {
      totalAgencies,
      activeAgencies,
      trialAgencies,
      suspendedAgencies,
      totalProperties,
      totalLeads,
      hotLeads,
      totalUsers,
    },
    // Plan counts, not revenue - there's no per-plan price anywhere yet
    // (billing is a separate, not-yet-built phase). This becomes a real
    // MRR figure the moment a price is attached to each plan; reporting
    // a dollar amount today would be fabricating a number, not computing one.
    subscriptionBreakdown: planBreakdownRaw.map((p) => ({ plan: p._id, count: p.count })),
    platformGrowth: buildMonthlyTrend(agenciesForGrowth),
    newestAgencies,
    mostActiveAgencies,
  };
}

module.exports = { getPlatformSummary };
