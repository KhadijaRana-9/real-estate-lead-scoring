const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // null only for a super_admin's token. Lets a suspended agency's
    // sessions be cascade-revoked in one query instead of joining
    // through User for every refresh token.
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', default: null, index: true },
    // Only the SHA-256 hash is ever stored - the raw token exists only in
    // the response body and the client's storage, never at rest here.
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String, default: null },
  },
  { timestamps: true }
);

// TTL index: MongoDB automatically deletes the document once expiresAt
// passes, so expired tokens don't need a manual cleanup job.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
