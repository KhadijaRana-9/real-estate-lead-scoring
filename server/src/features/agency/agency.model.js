const mongoose = require('mongoose');

const SUBSCRIPTION_PLANS = ['starter', 'professional', 'enterprise'];
const SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due', 'canceled'];

const officeLocationSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  { _id: false }
);

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const businessHoursSchema = new mongoose.Schema(
  {
    day: { type: String, enum: DAYS, required: true },
    open: { type: String, trim: true, default: '' }, // '09:00'
    close: { type: String, trim: true, default: '' }, // '18:00'
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const agencySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'],
    },

    // Branding (white-labeling target - consumed in Feature 7)
    logo: { type: String, default: '' },
    favicon: { type: String, default: '' },
    coverBanner: { type: String, default: '' },
    primaryColor: { type: String, default: '#4F46E5' },
    secondaryColor: { type: String, default: '#0EA5E9' },

    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '', index: true },
    country: { type: String, trim: true, default: '' },

    // Marketplace profile content - all agency_admin-editable, all
    // genuinely empty until an admin fills it in (see agency.service.js
    // updateProfile). Never pre-filled with placeholder copy.
    description: { type: String, trim: true, default: '', maxlength: 3000 },
    licenseNumber: { type: String, trim: true, default: '' },
    establishedYear: { type: Number, default: null },
    languages: { type: [String], default: [] },
    specializations: { type: [String], default: [] },
    officeLocations: { type: [officeLocationSchema], default: [] },
    businessHours: { type: [businessHoursSchema], default: [] },
    socialMedia: {
      facebook: { type: String, trim: true, default: '' },
      instagram: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
      youtube: { type: String, trim: true, default: '' },
    },

    // Set only by super_admin (see platform/agencies.service.js) - never
    // agency-self-declared, so these badges on the public marketplace
    // card actually mean something.
    verified: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },

    // Workspace resolution (Feature 2 consumes this)
    customDomain: { type: String, trim: true, lowercase: true, default: null },

    // Subscription shape only - no payment gateway wired yet (Feature 6)
    subscriptionPlan: { type: String, enum: SUBSCRIPTION_PLANS, default: 'starter' },
    subscriptionStatus: { type: String, enum: SUBSCRIPTION_STATUSES, default: 'trialing' },
    trialEndsAt: { type: Date, default: null },

    // Platform lifecycle - lets Super Admin suspend an agency without
    // deleting its data (Feature 5).
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  { timestamps: true }
);

// Not `sparse: true` - customDomain defaults to null rather than being
// absent, and sparse indexes only exclude genuinely-missing fields, not
// present-but-null ones. A plain sparse unique index would treat every
// agency's shared `null` as a duplicate (this failed exactly that way
// during verification). A partial index scoped to actual strings avoids it.
agencySchema.index(
  { customDomain: 1 },
  { unique: true, partialFilterExpression: { customDomain: { $type: 'string' } } }
);

// Public marketplace directory filters on these together (status, city,
// verified) and free-text searches company name / city.
agencySchema.index({ status: 1, city: 1, verified: 1 });
agencySchema.index({ companyName: 'text', city: 'text' });

module.exports = mongoose.model('Agency', agencySchema);
module.exports.DAYS = DAYS;
