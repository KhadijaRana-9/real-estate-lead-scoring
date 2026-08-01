const mongoose = require('mongoose');

// Developers are platform-wide entities (e.g. "Bahria Town", "Emaar") -
// unlike Agency/Property, NOT tenant-scoped, because a real estate
// developer is a company whose projects can be marketed by many different
// agencies on the platform. Mirrors Agency's ownership-integrity pattern:
// `verified`/`featured` are only ever set by a super_admin (see
// developer.service.js setVerified/setFeatured), never self-declared, so
// the badges shown on the public directory actually mean something.

const developerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'],
    },

    logo: { type: String, default: '' },
    coverBanner: { type: String, default: '' },

    description: { type: String, trim: true, default: '', maxlength: 3000 },
    establishedYear: { type: Number, default: null },
    headquartersCity: { type: String, trim: true, default: '', index: true },
    website: { type: String, trim: true, default: '' },
    contactEmail: { type: String, trim: true, default: '', lowercase: true },
    phone: { type: String, trim: true, default: '' },
    specializations: { type: [String], default: [] },
    socialMedia: {
      facebook: { type: String, trim: true, default: '' },
      instagram: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
      youtube: { type: String, trim: true, default: '' },
    },

    // Who first added this developer profile - an agency_admin onboarding
    // a partner, or a super_admin curating the directory directly. Purely
    // informational; does not gate who can subsequently edit it (any
    // agency_admin/super_admin can, same trust level as the rest of the
    // marketplace's shared reference data).
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Integrity-gated badges - see class comment above.
    verified: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },

    status: { type: String, enum: ['active', 'hidden'], default: 'active' },
  },
  { timestamps: true }
);

developerSchema.index({ status: 1, featured: 1, verified: 1 });
developerSchema.index({ name: 'text', headquartersCity: 'text' });

module.exports = mongoose.model('Developer', developerSchema);
