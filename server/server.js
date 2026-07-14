require('dotenv').config();

const loadEnv = require('./src/config/env');
const connectDB = require('./src/config/db');
const createApp = require('./src/app');

async function start() {
  const env = loadEnv();
  await connectDB(env.mongoUri);

  const app = createApp(env);
  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

start();
