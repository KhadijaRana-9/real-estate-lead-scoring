const mongoose = require('mongoose');

// Room/area categories a property's media can be organized under. 'other'
// is the catch-all for anything that doesn't fit, and is also what
// pre-existing flat images/videos get migrated into (see
// src/migrations/002_categorize_media.js) since there's no way to know
// which room an old, uncategorized photo actually shows.
const MEDIA_CATEGORIES = [
  'exterior',
  'living_room',
  'kitchen',
  'master_bedroom',
  'bedroom_2',
  'bedroom_3',
  'bathrooms',
  'dining_room',
  'tv_lounge',
  'office_room',
  'study_room',
  'gym',
  'swimming_pool',
  'garden',
  'garage',
  'terrace',
  'basement',
  'balcony',
  'other',
];

const MEDIA_PROVIDERS = ['local', 'cloudinary', 's3', 'url', 'google_drive', 'dropbox', 'onedrive'];

const mediaImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    caption: { type: String, trim: true, default: '', maxlength: 300 },
    category: { type: String, enum: MEDIA_CATEGORIES, default: 'other' },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    provider: { type: String, enum: MEDIA_PROVIDERS, default: 'local' },
    isCover: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const mediaVideoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    title: { type: String, trim: true, default: '', maxlength: 200 },
    caption: { type: String, trim: true, default: '', maxlength: 300 },
    duration: { type: Number, default: null }, // seconds, when known
    category: { type: String, enum: MEDIA_CATEGORIES, default: 'other' },
    provider: { type: String, enum: MEDIA_PROVIDERS, default: 'local' },
    order: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const propertySchema = new mongoose.Schema(
  {
    // Contract step complete: every write path (property.repository.js,
    // seed.js) now sets this via a resolved tenant, so it's safe to
    // enforce. See git history for the expand/backfill phase.
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    // Optional link to a development project this unit belongs to (see
    // ../project/project.model.js). A project's price range / unit
    // counts / availability are always computed live from the properties
    // that point back at it here, never manually duplicated on the
    // project document itself.
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    // price/city/area are NOT required at the schema level (relaxed from
    // the original required:true) so a wizard draft can exist after only
    // Step 1 (title) is filled in, before Location/Pricing steps run.
    // Full completeness is enforced at publish time in property.service.js
    // (publishProperty), not here - a draft is allowed to be incomplete
    // by definition; a published listing is not.
    price: { type: Number, default: 0, min: 0 },
    city: { type: String, trim: true, default: '' },
    area: { type: Number, default: 0, min: 0 },
    areaUnit: { type: String, enum: ['marla', 'sqft'], default: 'marla' },
    type: {
      type: String,
      enum: ['house', 'flat', 'plot', 'farmhouse', 'office', 'shop', 'warehouse'],
      default: 'house',
    },
    category: { type: String, enum: ['residential', 'commercial'], default: 'residential' },
    locality: { type: String, trim: true, default: '' },
    bedrooms: { type: Number, default: 0, min: 0 },
    bathrooms: { type: Number, default: 0, min: 0 },
    floors: { type: Number, default: 0, min: 0 },
    constructionYear: { type: Number, default: null },
    condition: { type: String, enum: ['ready', 'under_construction', 'new', 'used', ''], default: '' },
    amenities: { type: [String], default: [] },
    location: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    // Legacy flat mirrors - kept in sync by property.service.js's media
    // functions (syncFlatMediaArrays) every time `media` changes below.
    // Every existing reader (PropertyCard, Home, Listings, AI tools,
    // dashboards) keeps working unchanged; new categorized UI reads/
    // writes `media` directly. Cover image is always images[0].
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    // The real, categorized media record - see mediaImageSchema/
    // mediaVideoSchema above. Source of truth; `images`/`videos` above
    // are derived from this.
    media: {
      images: { type: [mediaImageSchema], default: [] },
      videos: { type: [mediaVideoSchema], default: [] },
    },
    virtualTourUrl: { type: String, trim: true, default: '' },
    documents: {
      type: [
        {
          name: { type: String, trim: true, required: true },
          url: { type: String, required: true },
          type: { type: String, trim: true, default: '' },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    negotiable: { type: Boolean, default: false },
    maintenanceCharges: { type: Number, default: 0, min: 0 },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // 'draft' = created by the wizard but not yet published; excluded
    // from every public/listing query (see property.service.js) exactly
    // like the existing status values already are.
    status: { type: String, enum: ['draft', 'available', 'sold'], default: 'available' },
    publishedAt: { type: Date, default: null },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// agencyId leads every compound index - it's the prefix on every
// tenant-scoped query the repository layer issues.
propertySchema.index({ agencyId: 1, status: 1, city: 1, price: 1, type: 1 });
propertySchema.index({ agencyId: 1, status: 1, featured: 1, createdAt: -1 });

module.exports = mongoose.model('Property', propertySchema);
module.exports.MEDIA_CATEGORIES = MEDIA_CATEGORIES;
module.exports.MEDIA_PROVIDERS = MEDIA_PROVIDERS;
