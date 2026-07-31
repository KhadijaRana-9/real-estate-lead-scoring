const mongoose = require('mongoose');

const followSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One follow per user per agency - following twice is a no-op, not a
// duplicate row.
followSchema.index({ agencyId: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Follow', followSchema);
