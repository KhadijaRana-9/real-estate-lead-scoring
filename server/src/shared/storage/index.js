const local = require('./providers/localProvider');
const cloudinary = require('./providers/cloudinaryProvider');
const s3 = require('./providers/s3Provider');

// Add new providers here (azureBlob.js, ...) implementing the same
// interface (see provider.interface.js), then register below. Switching
// the active upload provider is then a single env var (MEDIA_PROVIDER).
const PROVIDERS = { local, cloudinary, s3 };

function getActiveProvider() {
  const name = process.env.MEDIA_PROVIDER || 'local';
  return PROVIDERS[name] || local;
}

// Only the server-secret-backed providers belong here. Google
// Maps/Drive/Dropbox/OneDrive use PUBLIC client IDs meant to live in the
// browser bundle (VITE_* vars) - the frontend checks those directly
// rather than round-tripping to the backend to ask.
function getAvailability() {
  return {
    local: local.isConfigured(),
    cloudinary: cloudinary.isConfigured(),
    s3: s3.isConfigured(),
    activeProvider: getActiveProvider().name,
  };
}

async function uploadFile(buffer, originalName, mimeType) {
  return getActiveProvider().upload(buffer, originalName, mimeType);
}

module.exports = { uploadFile, getAvailability };
