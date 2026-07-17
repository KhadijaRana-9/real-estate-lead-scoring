require('dotenv').config();

const loadEnv = require('../src/config/env');
const connectDB = require('../src/config/db');
const createApp = require('../src/app');

let cachedApp;

async function getApp() {
  if (!cachedApp) {
    const env = loadEnv();
    await connectDB(env.mongoUri);
    cachedApp = createApp(env);
  }
  return cachedApp;
}

module.exports = async (req, res) => {
  const app = await getApp();
  app(req, res);
};
