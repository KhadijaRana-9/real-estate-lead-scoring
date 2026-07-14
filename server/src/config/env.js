const REQUIRED_VARS = ['MONGO_URI', 'JWT_SECRET'];

function loadEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Application failed to start: Missing ${missing.join(', ')}`);
    console.error('Copy server/.env.example to server/.env and fill in the values.');
    process.exit(1);
  }

  return {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  };
}

module.exports = loadEnv;
