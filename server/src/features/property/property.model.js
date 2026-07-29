const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    // Contract step complete: every write path (property.repository.js,
    // seed.js) now sets this via a resolved tenant, so it's safe to
    // enforce. See git history for the expand/backfill phase.
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
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
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
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
