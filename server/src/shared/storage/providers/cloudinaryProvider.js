const cloudinary = require('cloudinary').v2;

function isConfigured() {
  return Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
}

function configure() {
  // CLOUDINARY_URL alone auto-configures the SDK; otherwise use the
  // three discrete vars.
  if (!process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

async function upload(buffer, originalName, _mimeType) {
  if (!isConfigured()) {
    const err = new Error('Cloudinary is not configured. Add CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) to enable it.');
    err.status = 503;
    throw err;
  }
  configure();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'dreamhomes', resource_type: 'auto' },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, provider: 'cloudinary' });
      }
    );
    stream.end(buffer);
  });
}

module.exports = { upload, isConfigured, name: 'cloudinary' };
