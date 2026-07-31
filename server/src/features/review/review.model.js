const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    author: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '', maxlength: 2000 },
    images: { type: [String], default: [] },
    // "Verified" here means the reviewer actually submitted a real
    // inquiry to this agency before reviewing - not a fabricated badge.
    // See review.service.js's upsertReview.
    verifiedInquiry: { type: Boolean, default: false },
    reply: {
      text: { type: String, trim: true, default: '', maxlength: 1000 },
      repliedAt: { type: Date, default: null },
    },
    helpfulUserIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  },
  { timestamps: true }
);

// One review per user per agency - resubmitting updates the existing
// review (see review.service.js) rather than stacking duplicates, same
// way most real marketplaces treat a second submission.
reviewSchema.index({ agencyId: 1, 'author.id': 1 }, { unique: true });
reviewSchema.index({ agencyId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
