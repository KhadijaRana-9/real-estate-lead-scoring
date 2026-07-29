const mongoose = require('mongoose');

const agencyInviteSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: ['agent', 'agency_admin'], default: 'agent' },
    // Only the hash is stored, same rationale as refreshToken.model.js -
    // the raw token exists only in the invite link sent to the invitee.
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// TTL index: same pattern as refreshToken.model.js - MongoDB deletes the
// document once the stored expiresAt value itself passes.
agencyInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AgencyInvite', agencyInviteSchema);
