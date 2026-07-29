// Extracted from dashboard.service.js - now used by both the per-tenant
// dashboard and the platform-wide dashboard, so it lives in shared/.
function buildMonthlyTrend(items, dateField = 'createdAt') {
  const buckets = new Map();
  for (const item of items) {
    const date = new Date(item[dateField]);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([month, count]) => ({ month, count }));
}

module.exports = { buildMonthlyTrend };
