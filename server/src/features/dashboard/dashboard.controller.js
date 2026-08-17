const dashboardService = require('./dashboard.service');

async function summary(req, res, next) {
  try {
    const result = await dashboardService.getSummary(req.tenant._id, req.user);
    // Lets the dashboard link to this agency's own public profile
    // (/agencies/:slug) as a "View as Customer" preview, and lets the
    // header/footer chrome show the logged-in user's own agency branding
    // instead of the generic platform brand - req.tenant is already the
    // resolved Agency doc from resolveTenant(), so this is free, no extra
    // query.
    res.json({ ...result, agencySlug: req.tenant.slug, agencyName: req.tenant.companyName, agencyLogo: req.tenant.logo });
  } catch (err) {
    next(err);
  }
}

async function publicStats(req, res, next) {
  try {
    const result = await dashboardService.getPublicStats(req.tenant._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, publicStats };
