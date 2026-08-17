const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./features/auth/auth.routes');
const propertyRoutes = require('./features/property/property.routes');
const inquiryRoutes = require('./features/inquiry/inquiry.routes');
const dashboardRoutes = require('./features/dashboard/dashboard.routes');
const platformRoutes = require('./features/platform/platform.routes');
const agencyRoutes = require('./features/agency/agency.routes');
const agencyRegistrationRoutes = require('./features/agencyRegistration/agencyRegistration.routes');
const marketplaceRoutes = require('./features/marketplace/marketplace.routes');
const aiRoutes = require('./features/ai/ai.routes');
const uploadsRoutes = require('./features/uploads/uploads.routes');
const crmRoutes = require('./features/crm/crm.routes');
const billingRoutes = require('./features/billing/billing.routes');
const billingWebhookRoutes = require('./features/billing/billing.webhook.routes');
const reportsRoutes = require('./features/reports/reports.routes');
const auditRoutes = require('./features/audit/audit.routes');
const developerRoutes = require('./features/developer/developer.routes');
const projectRoutes = require('./features/project/project.routes');
const blogRoutes = require('./features/blog/blog.routes');
const successStoryRoutes = require('./features/successStory/successStory.routes');
const awardRoutes = require('./features/award/award.routes');
const partnerRoutes = require('./features/partner/partner.routes');
const newsletterRoutes = require('./features/newsletter/newsletter.routes');
const searchLogRoutes = require('./features/searchLog/searchLog.routes');
const marketRoutes = require('./features/market/market.routes');
const { notFound, errorHandler } = require('./shared/middleware/error');
const { apiLimiter } = require('./shared/middleware/rateLimiters');

function createApp(env) {
  const app = express();

  // Required for express-rate-limit to see the real client IP behind
  // Vercel's proxy instead of throttling the proxy's own address.
  app.set('trust proxy', 1);

  const allowedOrigins = env.clientOrigin.split(',').map((origin) => origin.trim());
  app.use(cors({ origin: allowedOrigins }));

  // Mounted BEFORE express.json() - Stripe webhook signature
  // verification needs the untouched raw body (see billing.webhook.
  // routes.js), which express.json() below would otherwise consume
  // first for every request, this route included.
  app.use('/api/billing/webhook', billingWebhookRoutes);

  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Serves files written by the local storage provider
  // (shared/storage/providers/localProvider.js). Not rate-limited /
  // behind apiLimiter deliberately - these are static asset GETs, not
  // API calls.
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  app.use('/api', apiLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/inquiries', inquiryRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/platform', platformRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/uploads', uploadsRoutes);
  app.use('/api/crm', crmRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/agency', agencyRoutes);
  app.use('/api/agency-registrations', agencyRegistrationRoutes);
  app.use('/api/agencies', marketplaceRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/developers', developerRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/blog', blogRoutes);
  app.use('/api/success-stories', successStoryRoutes);
  app.use('/api/awards', awardRoutes);
  app.use('/api/partners', partnerRoutes);
  app.use('/api/newsletter', newsletterRoutes);
  app.use('/api/search-log', searchLogRoutes);
  app.use('/api/market', marketRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
