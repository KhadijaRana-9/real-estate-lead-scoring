const SearchLog = require('./searchLog.model');

// Fire-and-forget by design (see searchLog.controller.js callers) - a
// logging failure must never break the actual search request it's
// observing.
async function record({ term, scope = 'global', city = '', resultCount = null }) {
  const trimmed = (term || '').trim();
  if (trimmed.length < 2) return;
  try {
    await SearchLog.create({ term: trimmed, scope, city, resultCount });
  } catch {
    // Logging is best-effort - never surface a search-log write failure
    // to the user who was just trying to search.
  }
}

async function trending({ scope, limit = 8, sinceDays = 14 } = {}) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const match = { createdAt: { $gte: since } };
  if (scope) match.scope = scope;
  return SearchLog.aggregate([
    { $match: match },
    { $group: { _id: '$term', count: { $sum: 1 }, lastSearchedAt: { $max: '$createdAt' } } },
    { $sort: { count: -1, lastSearchedAt: -1 } },
    { $limit: limit },
    { $project: { _id: 0, term: '$_id', count: 1 } },
  ]);
}

async function popular({ scope, limit = 8 } = {}) {
  const match = {};
  if (scope) match.scope = scope;
  return SearchLog.aggregate([
    { $match: match },
    { $group: { _id: '$term', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, term: '$_id', count: 1 } },
  ]);
}

module.exports = { record, trending, popular };
