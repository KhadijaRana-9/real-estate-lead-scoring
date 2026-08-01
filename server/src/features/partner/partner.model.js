const mongoose = require('mongoose');

// Real business partners/integrations (banks, payment providers, MLS
// networks, etc.) whose logo the platform has actual permission to
// display. Same integrity posture as Award: platform-wide, starts empty,
// super_admin-only writes - see award.model.js for the full rationale.
const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    logo: { type: String, required: true, trim: true },
    website: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '', maxlength: 100 },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'hidden'], default: 'active' },
  },
  { timestamps: true }
);

partnerSchema.index({ status: 1, order: 1 });

module.exports = mongoose.model('Partner', partnerSchema);
