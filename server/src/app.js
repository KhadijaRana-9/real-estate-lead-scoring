const express = require('express');
const cors = require('cors');

const authRoutes = require('./features/auth/auth.routes');
const propertyRoutes = require('./features/property/property.routes');
const inquiryRoutes = require('./features/inquiry/inquiry.routes');
const dashboardRoutes = require('./features/dashboard/dashboard.routes');
const { notFound, errorHandler } = require('./shared/middleware/error');

function createApp(env) {
  const app = express();

  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/inquiries', inquiryRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
