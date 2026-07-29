const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', '..', 'uploads');

// The only provider that always works with zero configuration - real
// disk storage, served via express.static in app.js. This is what
// backs "Local Upload / Drag & Drop / Browse Files" today, and is the
// default MEDIA_PROVIDER.
function isConfigured() {
  return true;
}

async function upload(buffer, originalName, _mimeType) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(originalName).toLowerCase();
  const safeName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, safeName), buffer);

  const base = process.env.SERVER_PUBLIC_URL || 'http://localhost:5000';
  return { url: `${base}/uploads/${safeName}`, provider: 'local' };
}

module.exports = { upload, isConfigured, name: 'local' };
