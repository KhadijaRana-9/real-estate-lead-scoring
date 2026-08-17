const express = require('express');
const multer = require('multer');
const { signupLimiter } = require('../../shared/middleware/rateLimiters');
const validate = require('../../shared/middleware/validate');
const { handle, MAX_DOCUMENT_SIZE } = require('../uploads/upload.middleware');
const { registerSchema, statusParamSchema } = require('./agencyRegistration.schema');
const controller = require('./agencyRegistration.controller');

const router = express.Router();

// Deliberately public - the whole point of this route is that no
// account/tenant exists yet (see auth.routes.js's /signup, which
// requires an already-resolved req.tenant; this is what creates that
// tenant in the first place). Shares signupLimiter (not authLimiter) with
// /auth/signup - same "anonymous, identity-creation, abuse-prone" risk
// profile, and deliberately NOT shared with /auth/login's separate budget
// (BUG-002 fix - see rateLimiters.js's loginLimiter/signupLimiter comment).
const registrationUpload = handle(
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_DOCUMENT_SIZE, files: 6 },
  }).fields([
    { name: 'logo', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 },
    { name: 'registrationCertificate', maxCount: 1 },
    { name: 'businessLicense', maxCount: 1 },
    { name: 'cnicDocument', maxCount: 1 },
    { name: 'officeProof', maxCount: 1 },
  ])
);

router.post('/', signupLimiter, registrationUpload, validate(registerSchema), controller.register);

// Public, minimal-data (see the service function's own comment) - lets
// RegistrationPending.jsx poll for approval instead of leaving an
// applicant stuck on a static "pending" page forever with no way to
// know they've actually been approved without manually retrying login.
router.get('/:agencyId/status', validate(statusParamSchema), controller.status);

module.exports = router;
