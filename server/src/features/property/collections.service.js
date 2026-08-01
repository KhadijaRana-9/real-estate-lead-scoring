// Cross-tenant homepage collections (Luxury / Commercial / Investment /
// New Launches) - deliberately bypasses the tenant-scoped
// property.repository.js (which always requires a single agencyId) and
// queries Property directly, the same cross-tenant posture as the agency
// marketplace directory and the Developer/Project/Blog directories: a
// real multi-tenant marketplace's homepage discovers listings across
// every agency, not just one workspace.
//
// Every classification below is a real, documented rule computed from
// data that already exists on the Property document - never a manually
// tagged "isLuxury" flag an agent could set arbitrarily, and never a
// fabricated number. Same honesty discipline as Trust Score (see
// marketplace/agencyDirectory.service.js computeTrustScore).
const Property = require('./property.model');

const CARD_FIELDS = 'title slug price city area areaUnit type category bedrooms bathrooms images media agencyId agent status views createdAt condition';

function withAgency(query) {
  return query.populate('agencyId', 'companyName slug logo verified');
}

// Luxury: priced in the top 10% for its own city, so "luxury" adapts to
// what each city actually costs instead of one fixed, arbitrary global
// number that would call a PKR 8M house in one city luxury and a
// perfectly comparable PKR 8M house in a pricier city ordinary.
async function luxuryCollection(limit = 8) {
  const cityThresholds = await Property.aggregate([
    { $match: { status: 'available', price: { $gt: 0 } } },
    { $group: { _id: '$city', prices: { $push: '$price' } } },
    { $match: { $expr: { $gte: [{ $size: '$prices' }, 5] } } },
  ]);

  const thresholdByCity = new Map();
  for (const c of cityThresholds) {
    const sorted = [...c.prices].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.9);
    thresholdByCity.set(c._id, sorted[Math.min(idx, sorted.length - 1)]);
  }
  if (thresholdByCity.size === 0) return [];

  const orClauses = [...thresholdByCity.entries()].map(([city, minPrice]) => ({ city, price: { $gte: minPrice } }));
  const items = await withAgency(
    Property.find({ status: 'available', $or: orClauses }).select(CARD_FIELDS).sort({ price: -1 }).limit(limit)
  );
  return items;
}

// Commercial: Property already has a real `category` field for this -
// no new classification needed, just the query.
async function commercialCollection(limit = 8) {
  return withAgency(
    Property.find({ status: 'available', category: 'commercial' }).select(CARD_FIELDS).sort({ createdAt: -1 }).limit(limit)
  );
}

// Investment: a documented, real formula - not a fabricated "hot deal"
// label. Scores price-per-area against the city's own average (lower is
// more attractively priced) combined with view velocity (views per day
// since listed, a genuine interest signal already on the document).
// Both factors are real; the score itself is just their combination, not
// an invented number.
async function investmentCollection(limit = 8) {
  const cityAverages = await Property.aggregate([
    { $match: { status: 'available', price: { $gt: 0 }, area: { $gt: 0 } } },
    { $group: { _id: '$city', avgPricePerArea: { $avg: { $divide: ['$price', '$area'] } }, count: { $sum: 1 } } },
    { $match: { count: { $gte: 5 } } },
  ]);
  if (cityAverages.length === 0) return [];
  const avgByCity = new Map(cityAverages.map((c) => [c._id, c.avgPricePerArea]));

  const candidates = await Property.find({
    status: 'available',
    price: { $gt: 0 },
    area: { $gt: 0 },
    city: { $in: [...avgByCity.keys()] },
  })
    .select(CARD_FIELDS)
    .limit(500);

  const now = Date.now();
  const scored = candidates.map((p) => {
    const pricePerArea = p.price / p.area;
    const cityAvg = avgByCity.get(p.city);
    const valueScore = cityAvg ? Math.max(0, (cityAvg - pricePerArea) / cityAvg) : 0; // 0..1, higher = better value
    const ageDays = Math.max(1, (now - p.createdAt.getTime()) / 86400000);
    const viewVelocity = p.views / ageDays; // real interest signal
    return { property: p, investmentScore: valueScore * 0.7 + Math.min(viewVelocity / 5, 1) * 0.3 };
  });

  return scored
    .filter((s) => s.investmentScore > 0.15)
    .sort((a, b) => b.investmentScore - a.investmentScore)
    .slice(0, limit)
    .map((s) => s.property);
}

// New Launches: a real, existing signal (`condition: 'under_construction'`
// or `'new'`) rather than a new field, restricted to recently listed so
// "new" stays honest over time.
async function newLaunchesCollection(limit = 8) {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  return withAgency(
    Property.find({
      status: 'available',
      condition: { $in: ['under_construction', 'new'] },
      createdAt: { $gte: since },
    })
      .select(CARD_FIELDS)
      .sort({ createdAt: -1 })
      .limit(limit)
  );
}

module.exports = { luxuryCollection, commercialCollection, investmentCollection, newLaunchesCollection };
