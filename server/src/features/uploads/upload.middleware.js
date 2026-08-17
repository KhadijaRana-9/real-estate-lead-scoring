const multer = require('multer');

// memoryStorage - the buffer is handed to whichever storage provider is
// active (local/Cloudinary/S3) rather than always writing to disk here,
// so this middleware doesn't need to know which provider is in use.
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_FILES = 20;
const MAX_VIDEO_FILES = 5; // videos are large - a bulk upload of 20 at once isn't reasonable

const imagesUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: MAX_FILES },
}).array('images', MAX_FILES);

const documentsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_SIZE, files: MAX_FILES },
}).array('documents', MAX_FILES);

const videosUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_SIZE, files: MAX_VIDEO_FILES },
}).array('videos', MAX_VIDEO_FILES);

// Wraps multer so its errors (file too large, too many files) become the
// same { message } JSON shape as every other error response, instead of
// multer's raw error object.
function handle(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
      }
      next(err);
    });
  };
}

module.exports = {
  imagesUpload: handle(imagesUpload),
  documentsUpload: handle(documentsUpload),
  videosUpload: handle(videosUpload),
  // Exported (not just the pre-built single-field middlewares above) so
  // a route needing a custom multer config - e.g. agencyRegistration's
  // `.fields()` with several distinct named files in one request - still
  // gets the same JSON error shape instead of multer's raw error object.
  handle,
  MAX_DOCUMENT_SIZE,
};
