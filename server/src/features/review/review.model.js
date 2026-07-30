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
  },
  { timestamps: true }
);

// One review per user per agency - resubmitting updates the existing
// review (see review.service.js) rather than stacking duplicates, same
// way most real marketplaces treat a second submission.
reviewSchema.index({ agencyId: 1, 'author.id': 1 }, { unique: true });
reviewSchema.index({ agencyId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
