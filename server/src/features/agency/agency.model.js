const mongoose = require('mongoose');

// 'trial' is a real plan (Free Trial), not just a status - see
// billing.constants.js's PLANS.trial (unlimited properties/agents,
// price 0) and agencyRegistration.service.js (7-day trialEndsAt, no
// Stripe checkout at all). subscriptionStatus 'trialing' is shared by
// both this AND any paid tier's initial pre-payment state - trialEndsAt
// being set is what distinguishes an actual Free Trial from a paid
// signup still waiting on its first Stripe checkout.
const SUBSCRIPTION_PLANS = ['trial', 'starter', 'professional', 'enterprise'];
const SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due', 'canceled'];
const BILLING_CYCLES = ['monthly', 'yearly'];
const AGENCY_STATUSES = ['pending', 'active', 'suspended', 'rejected'];
const PAYMENT_STATUSES = ['unpaid', 'paid', 'not_required'];

const verificationDocumentSchema = new mongoose.Schema(
  {
    docType: { type: String, enum: ['registration_certificate', 'business_license', 'cnic', 'office_proof'], required: true },
    name: { type: String, trim: true, required: true },
    url: { type: String, required: true },
    type: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

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

const timelineEventSchema = new mongoose.Schema(
  { year: { type: Number, required: true }, title: { type: String, trim: true, required: true, maxlength: 200 } },
  { _id: false }
);

const awardSchema = new mongoose.Schema(
  { title: { type: String, trim: true, required: true, maxlength: 200 }, year: { type: Number, default: null }, issuer: { type: String, trim: true, default: '', maxlength: 200 } },
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

    // Company-microsite narrative content - all optional, all rendered
    // only when an admin actually fills them in (see AgencyProfile.jsx).
    // Never pre-filled with placeholder/marketing copy.
    ceoMessage: { type: String, trim: true, default: '', maxlength: 2000 },
    mission: { type: String, trim: true, default: '', maxlength: 1000 },
    vision: { type: String, trim: true, default: '', maxlength: 1000 },
    timeline: { type: [timelineEventSchema], default: [] },
    awards: { type: [awardSchema], default: [] },
    officeGallery: { type: [String], default: [] },
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
    billingCycle: { type: String, enum: BILLING_CYCLES, default: 'monthly' },
    trialEndsAt: { type: Date, default: null },

    // Platform lifecycle - lets Super Admin suspend an agency without
    // deleting its data (Feature 5). Self-registered agencies now start
    // 'pending' (see agencyRegistration feature) instead of 'active';
    // every pre-existing caller that creates an agency directly
    // (platform/agencies.service.js's createAgency, test factories) still
    // defaults to 'active' since they're explicit admin actions, not
    // self-service signups awaiting review.
    status: { type: String, enum: AGENCY_STATUSES, default: 'active' },

    // Self-registration only - set once at registration, read by
    // auth.service.js's login() to gate access before an admin approves,
    // and by the Stripe webhook (billing.service.js) once payment
    // actually completes. 'not_required' covers agencies created
    // directly by a super_admin (CreateAgencyModal), which were never
    // meant to go through checkout at all.
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'not_required' },
    verificationDocuments: { type: [verificationDocumentSchema], default: [] },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: '' },
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
module.exports.AGENCY_STATUSES = AGENCY_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.SUBSCRIPTION_PLANS = SUBSCRIPTION_PLANS;
module.exports.BILLING_CYCLES = BILLING_CYCLES;
