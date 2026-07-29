const crypto = require('crypto');

function isConfigured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET
  );
}

async function upload(buffer, originalName, mimeType) {
  if (!isConfigured()) {
    const err = new Error('S3 is not configured. Add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET (and AWS_REGION) to enable it.');
    err.status = 503;
    throw err;
  }

  // Lazy-required: the SDK is installed regardless (this provider is
  // real, not a stub), but only instantiated when actually configured.
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
  const key = `dreamhomes/${crypto.randomBytes(16).toString('hex')}${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const region = process.env.AWS_REGION || 'us-east-1';
  const url = `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
  return { url, provider: 's3' };
}

module.exports = { upload, isConfigured, name: 's3' };
