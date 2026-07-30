const { uploadFile, getAvailability } = require('../../shared/storage');

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);
const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

function availability(req, res) {
  res.json(getAvailability());
}

async function uploadImages(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'No files were uploaded.' });
    }

    const invalid = files.find((f) => !IMAGE_MIME_TYPES.has(f.mimetype));
    if (invalid) {
      return res.status(400).json({ message: `Unsupported image type: ${invalid.mimetype}. Use JPG, PNG, or WEBP.` });
    }

    const uploaded = await Promise.all(files.map((f) => uploadFile(f.buffer, f.originalname, f.mimetype)));
    res.status(201).json({ urls: uploaded.map((u) => u.url), provider: uploaded[0]?.provider });
  } catch (err) {
    next(err);
  }
}

async function uploadDocuments(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'No files were uploaded.' });
    }

    const invalid = files.find((f) => !DOCUMENT_MIME_TYPES.has(f.mimetype));
    if (invalid) {
      return res.status(400).json({ message: `Unsupported document type: ${invalid.mimetype}. Use PDF, DOC, DOCX, JPG, or PNG.` });
    }

    const uploaded = await Promise.all(
      files.map(async (f) => {
        const result = await uploadFile(f.buffer, f.originalname, f.mimetype);
        return { name: f.originalname, url: result.url, type: f.mimetype };
      })
    );
    res.status(201).json({ documents: uploaded });
  } catch (err) {
    next(err);
  }
}

async function uploadVideos(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'No files were uploaded.' });
    }

    const invalid = files.find((f) => !VIDEO_MIME_TYPES.has(f.mimetype));
    if (invalid) {
      return res.status(400).json({ message: `Unsupported video type: ${invalid.mimetype}. Use MP4, MOV, or WEBM.` });
    }

    const uploaded = await Promise.all(
      files.map(async (f) => {
        const result = await uploadFile(f.buffer, f.originalname, f.mimetype);
        return { url: result.url, provider: result.provider, originalName: f.originalname };
      })
    );
    res.status(201).json({ videos: uploaded, provider: uploaded[0]?.provider });
  } catch (err) {
    next(err);
  }
}

module.exports = { availability, uploadImages, uploadDocuments, uploadVideos };
