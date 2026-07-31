const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./features/auth/auth.routes');
const propertyRoutes = require('./features/property/property.routes');
const inquiryRoutes = require('./features/inquiry/inquiry.routes');
const dashboardRoutes = require('./features/dashboard/dashboard.routes');
const platformRoutes = require('./features/platform/platform.routes');
const agencyRoutes = require('./features/agency/agency.routes');
const marketplaceRoutes = require('./features/marketplace/marketplace.routes');
const aiRoutes = require('./features/ai/ai.routes');
const uploadsRoutes = require('./features/uploads/uploads.routes');
const crmRoutes = require('./features/crm/crm.routes');
const billingRoutes = require('./features/billing/billing.routes');
const reportsRoutes = require('./features/reports/reports.routes');
const auditRoutes = require('./features/audit/audit.routes');
const opsRoutes = require('./features/ops/ops.routes');
const { notFound, errorHandler } = require('./shared/middleware/error');
const { apiLimiter } = require('./shared/middleware/rateLimiters');

function createApp(env) {
  const app = express();

  // Required for express-rate-limit to see the real client IP behind
  // Vercel's proxy instead of throttling the proxy's own address.
  app.set('trust proxy', 1);

  const allowedOrigins = env.clientOrigin.split(',').map((origin) => origin.trim());
  app.use(cors({ origin: allowedOrigins }));
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
  app.use('/api/agencies', marketplaceRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/ops', opsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
