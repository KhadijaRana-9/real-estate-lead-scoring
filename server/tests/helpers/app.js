const createApp = require('../../src/app');

function buildTestApp() {
  return createApp({ clientOrigin: process.env.CLIENT_ORIGIN });
}

module.exports = { buildTestApp };
