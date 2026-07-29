const mongoose = require('mongoose');

const SUBSCRIPTION_PLANS = ['starter', 'professional', 'enterprise'];
const SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due', 'canceled'];

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
    primaryColor: { type: String, default: '#4F46E5' },
    secondaryColor: { type: String, default: '#0EA5E9' },

    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },

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

module.exports = mongoose.model('Agency', agencySchema);
