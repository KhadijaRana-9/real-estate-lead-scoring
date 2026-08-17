const mongoose = require('mongoose');

// Mirrors features/review/review.model.js's agency-review shape exactly,
// scoped to a property instead of an agency - a distinct entity (a
// customer might review the agency overall AND separately rate a
// specific property they toured), not an extension of the agency
// version, since the unique-review-per-author constraint is keyed
// differently (per property, not per agency).
const propertyReviewSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    author: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '', maxlength: 2000 },
    // "Verified" = this reviewer actually submitted a real inquiry for
    // THIS property before reviewing - see propertyReview.service.js's
    // upsertReview. Never set true without checking.
    verifiedInquiry: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One review per user per property - resubmitting updates the existing
// review rather than stacking duplicates, same discipline as the agency
// review model.
propertyReviewSchema.index({ property: 1, 'author.id': 1 }, { unique: true });
propertyReviewSchema.index({ property: 1, createdAt: -1 });

module.exports = mongoose.model('PropertyReview', propertyReviewSchema);
