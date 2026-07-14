const Property = require('../property/property.model');
const Inquiry = require('../inquiry/inquiry.model');

async function getSummary(requester) {
  const propertyFilter = requester.role === 'admin' ? {} : { agent: requester.id };
  const properties = await Property.find(propertyFilter).select('_id title views');
  const propertyIds = properties.map((p) => p._id);

  const [totalProperties, totalInquiries, inquiries] = await Promise.all([
    Property.countDocuments(propertyFilter),
    Inquiry.countDocuments({ property: { $in: propertyIds } }),
    Inquiry.find({ property: { $in: propertyIds } }).select('score status property createdAt'),
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
    const inquiryWithLead = await Inquiry.findById(topInquiry._id).select('customer score');
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

function buildMonthlyTrend(inquiries) {
  const buckets = new Map();
  for (const inquiry of inquiries) {
    const date = new Date(inquiry.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([month, count]) => ({ month, count }));
}

module.exports = { getSummary };
