const mongoose = require('mongoose');

// Real-world facts about the platform itself (an award it actually won, a
// certification it actually holds) - not agency-level or property-level
// data, so this is platform-wide and, deliberately, starts completely
// empty. Only a super_admin can create one (see award.routes.js): this
// collection must never contain a claim nobody at the company actually
// verified, because "Awarded by X" on a public homepage is a factual
// claim about the real business, not decorative copy.
const awardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    issuer: { type: String, required: true, trim: true, maxlength: 200 },
    year: { type: Number, required: true, min: 1900, max: 2100 },
    description: { type: String, trim: true, default: '', maxlength: 1000 },
    imageUrl: { type: String, trim: true, default: '' },
    certificateUrl: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'hidden'], default: 'active' },
  },
  { timestamps: true }
);

awardSchema.index({ status: 1, order: 1, year: -1 });

module.exports = mongoose.model('Award', awardSchema);
