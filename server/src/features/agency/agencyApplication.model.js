const mongoose = require('mongoose');

const APPLICATION_STATUSES = ['pending', 'approved', 'rejected'];

// The agent-applies-to-agency counterpart to agencyInvite.model.js's
// agency-invites-agent flow. Unlike an invite (which only creates a User
// once the emailed token is accepted), an application collects the
// applicant's credentials up front - there's no email round-trip to
// carry them across, so the password is hashed and held here until an
// agency_admin approves, at which point approveApplication() in
// agency.service.js creates the real User from these fields.
const agencyApplicationSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, required: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, trim: true, default: '' },
    experienceYears: { type: Number, default: null },
    message: { type: String, trim: true, default: '', maxlength: 1000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: '' },
    createdUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

agencyApplicationSchema.index({ agencyId: 1, status: 1, createdAt: -1 });

// Only one outstanding pending application per (agency, email) - a
// rejected application doesn't match this partial filter, so re-applying
// after rejection is always allowed.
agencyApplicationSchema.index(
  { agencyId: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('AgencyApplication', agencyApplicationSchema);
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
