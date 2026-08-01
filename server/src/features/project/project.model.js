const mongoose = require('mongoose');

const STATUSES = ['upcoming', 'under_construction', 'launched', 'completed'];
const CATEGORIES = ['residential', 'commercial', 'mixed_use'];

const floorPlanSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 100 },
    bedrooms: { type: Number, default: 0, min: 0 },
    area: { type: Number, default: 0, min: 0 },
    areaUnit: { type: String, enum: ['marla', 'sqft'], default: 'sqft' },
    imageUrl: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// Tenant-scoped like Property - the agency actively marketing this
// project on the platform owns the listing. `developerId` is the
// platform-wide company that's actually building it (see
// ../developer/developer.model.js); a project can exist without one
// (agency-led development) since forcing the link would be fabricating
// a relationship that may not be real.
const projectSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    developerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Developer', default: null, index: true },

    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'],
    },
    description: { type: String, trim: true, default: '', maxlength: 5000 },

    category: { type: String, enum: CATEGORIES, default: 'residential' },
    status: { type: String, enum: STATUSES, default: 'upcoming' },

    city: { type: String, trim: true, default: '', index: true },
    address: { type: String, trim: true, default: '' },
    location: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },

    launchDate: { type: Date, default: null },
    estimatedCompletionDate: { type: Date, default: null },

    // Planned total, entered by the agency - distinct from the real,
    // computed unit/availability/price-range numbers derived from actual
    // linked Property documents (see project.service.js attachStats).
    plannedTotalUnits: { type: Number, default: null, min: 0 },

    amenities: { type: [String], default: [] },
    logo: { type: String, default: '' },
    coverBanner: { type: String, default: '' },
    gallery: { type: [String], default: [] },
    floorPlans: { type: [floorPlanSchema], default: [] },
    brochureUrl: { type: String, trim: true, default: '' },
    videoUrl: { type: String, trim: true, default: '' },

    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

projectSchema.index({ agencyId: 1, status: 1, createdAt: -1 });
projectSchema.index({ status: 1, city: 1, featured: 1 });
projectSchema.index({ name: 'text', city: 'text', description: 'text' });

module.exports = mongoose.model('Project', projectSchema);
module.exports.STATUSES = STATUSES;
module.exports.CATEGORIES = CATEGORIES;
