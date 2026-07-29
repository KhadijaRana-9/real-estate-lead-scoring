const reportsService = require('./reports.service');

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

async function properties(req, res, next) {
  try {
    const csv = await reportsService.propertiesReport(req.tenant._id, req.user);
    sendCsv(res, 'properties-report.csv', csv);
  } catch (err) {
    next(err);
  }
}

async function leads(req, res, next) {
  try {
    const csv = await reportsService.leadsReport(req.tenant._id, req.user);
    sendCsv(res, 'leads-report.csv', csv);
  } catch (err) {
    next(err);
  }
}

async function dashboardSummary(req, res, next) {
  try {
    const csv = await reportsService.dashboardSummaryReport(req.tenant._id, req.user);
    sendCsv(res, 'dashboard-summary.csv', csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { properties, leads, dashboardSummary };
