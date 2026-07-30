const express = require('express');
const auth = require('../../shared/middleware/auth');
const requireRole = require('../../shared/middleware/role');
const { uploadLimiter } = require('../../shared/middleware/rateLimiters');
const { imagesUpload, documentsUpload, videosUpload } = require('./upload.middleware');
const controller = require('./uploads.controller');

const router = express.Router();

router.use(auth, requireRole('agent', 'agency_admin'));

router.get('/availability', controller.availability);
router.post('/images', uploadLimiter, imagesUpload, controller.uploadImages);
router.post('/documents', uploadLimiter, documentsUpload, controller.uploadDocuments);
router.post('/videos', uploadLimiter, videosUpload, controller.uploadVideos);

module.exports = router;
