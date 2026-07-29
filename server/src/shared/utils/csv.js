// Minimal, dependency-free CSV writer - no new package needed for
// something this small, and it avoids trusting a third-party lib with
// arbitrary agency/customer data formatting.
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows, columns) {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvEscape(c.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}

module.exports = { toCsv };
