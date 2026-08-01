const Property = require('../property/property.model');

// Every number here is a live aggregation over real, currently-listed
// Property documents - never a stored/precomputed "market data" table
// that could go stale or be seeded with invented figures. A city/type
// with too few listings to be statistically meaningful is filtered out
// rather than shown with a misleadingly precise average.
const MIN_SAMPLE_SIZE = 3;

async function overview() {
  const [byCity, byType, totals] = await Promise.all([
    Property.aggregate([
      { $match: { status: { $in: ['available', 'sold'] }, price: { $gt: 0 } } },
      {
        $group: {
          _id: '$city',
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          listingCount: { $sum: 1 },
          avgPricePerAreaUnit: { $avg: { $cond: [{ $gt: ['$area', 0] }, { $divide: ['$price', '$area'] }, null] } },
        },
      },
      { $match: { listingCount: { $gte: MIN_SAMPLE_SIZE } } },
      { $sort: { listingCount: -1 } },
      { $limit: 12},
    ]),
    Property.aggregate([
      { $match: { status: { $in: ['available', 'sold'] }, price: { $gt: 0 } } },
      { $group: { _id: '$type', avgPrice: { $avg: '$price' }, listingCount: { $sum: 1 } } },
      { $match: { listingCount: { $gte: MIN_SAMPLE_SIZE } } },
      { $sort: { listingCount: -1 } },
    ]),
    Property.aggregate([
      { $match: { status: 'available' } },
      { $group: { _id: null, totalActive: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
    ]),
  ]);

  return {
    byCity: byCity.map((c) => ({
      city: c._id,
      avgPrice: Math.round(c.avgPrice),
      minPrice: c.minPrice,
      maxPrice: c.maxPrice,
      avgPricePerAreaUnit: c.avgPricePerAreaUnit ? Math.round(c.avgPricePerAreaUnit) : null,
      listingCount: c.listingCount,
    })),
    byType: byType.map((t) => ({ type: t._id, avgPrice: Math.round(t.avgPrice), listingCount: t.listingCount })),
    totals: totals[0] ? { totalActiveListings: totals[0].totalActive, avgPrice: Math.round(totals[0].avgPrice) } : { totalActiveListings: 0, avgPrice: 0 },
  };
}

// Month-over-month average asking price, derived from each listing's own
// real createdAt+price - a genuine historical signal already sitting in
// the data, not a separate fabricated time-series.
async function priceTrend({ city, months = 6 } = {}) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const match = { createdAt: { $gte: since }, price: { $gt: 0 } };
  if (city) match.city = new RegExp(`^${city}$`, 'i');

  const rows = await Property.aggregate([
    { $match: match },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        avgPrice: { $avg: '$price' },
        listingCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return rows
    .filter((r) => r.listingCount >= MIN_SAMPLE_SIZE)
    .map((r) => ({ year: r._id.year, month: r._id.month, avgPrice: Math.round(r.avgPrice), listingCount: r.listingCount }));
}

async function cityInsight(city) {
  const match = { city: new RegExp(`^${city}$`, 'i'), price: { $gt: 0 }, status: { $in: ['available', 'sold'] } };
  const [stats] = await Property.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        listingCount: { $sum: 1 },
        soldCount: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
      },
    },
  ]);

  if (!stats || stats.listingCount < MIN_SAMPLE_SIZE) {
    return { city, available: false, reason: 'Not enough listing data yet for a reliable insight.' };
  }

  const trend = await priceTrend({ city, months: 6 });
  return {
    city,
    available: true,
    avgPrice: Math.round(stats.avgPrice),
    minPrice: stats.minPrice,
    maxPrice: stats.maxPrice,
    listingCount: stats.listingCount,
    soldCount: stats.soldCount,
    priceTrend: trend,
  };
}

module.exports = { overview, priceTrend, cityInsight, MIN_SAMPLE_SIZE };
