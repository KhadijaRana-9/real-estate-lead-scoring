const mongoose = require('mongoose');

const ROLES = ['super_admin', 'agency_admin', 'agent', 'customer'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'customer' },
    // Agent-facing contact info, surfaced on Property Details "Call
    // Agent"/"WhatsApp" buttons. Optional - empty until an agent fills
    // it in; the frontend falls back to the agency's contact info
    // rather than showing a broken button when absent.
    phone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    avatar: { type: String, trim: true, default: '' },
    // Set only for an agency's registering owner (see agencyRegistration
    // feature) - part of the verification packet a super_admin reviews
    // before approval, not collected for ordinary agent/customer signup.
    cnic: { type: String, trim: true, default: '' },
    // Full invariant now enforced: null only for super_admin, set for
    // every other role. Safe now that resolveTenant + auth.service.js
    // populate agencyId on every signup.
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency',
      default: null,
      validate: {
        validator: function isAgencyIdConsistentWithRole(value) {
          return this.role === 'super_admin' ? value == null : value != null;
        },
        message: 'agencyId must be null for super_admin and set for every other role',
      },
    },
  },
  { timestamps: true }
);

// Email is unique per agency (an agent at Agency A and a customer at
// Agency B can share an email - they're unrelated accounts), except for
// super_admin, which has no agency and must be globally unique instead.
userSchema.index(
  { agencyId: 1, email: 1 },
  { unique: true, partialFilterExpression: { agencyId: { $type: 'objectId' } } }
);
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { role: 'super_admin' } });

module.exports = mongoose.model('User', userSchema);
