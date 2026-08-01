const mongoose = require('mongoose');

// One row per real search a visitor actually performed (property search,
// agency directory search, or navbar global search) - never
// pre-populated or fabricated. Trending/Popular Searches homepage
// sections are pure aggregations over this collection (see
// searchLog.service.js); with zero real searches yet, they correctly
// show an empty state instead of invented terms.
const searchLogSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    scope: { type: String, enum: ['properties', 'agencies', 'global'], default: 'global' },
    city: { type: String, trim: true, default: '' },
    resultCount: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

searchLogSchema.index({ term: 1, createdAt: -1 });
searchLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SearchLog', searchLogSchema);
