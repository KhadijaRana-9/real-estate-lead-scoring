const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    // The property's own tenant - every query is scoped through this,
    // same discipline as every other tenant-owned collection.
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One favorite per user per property - favoriting twice is a no-op, not
// a duplicate row (same discipline as follow.model.js's unique index).
favoriteSchema.index({ property: 1, user: 1 }, { unique: true });
favoriteSchema.index({ agencyId: 1, user: 1, createdAt: -1 });

module.exports = mongoose.model('Favorite', favoriteSchema);
