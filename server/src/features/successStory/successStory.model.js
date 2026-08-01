const mongoose = require('mongoose');

// A Success Story can only ever be created from a real Inquiry that has
// actually reached pipelineStage 'closed_won' in this agency's own CRM
// (enforced in successStory.service.js, not just documented here) - there
// is no free-text "customer name" field an agent could type in from
// nowhere. This is the deliberate difference from a Review: a review is
// the customer's own words: a success story is the agency's account of a
// transaction it can prove actually closed.
const successStorySchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    inquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', required: true, unique: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Snapshot at submission time, not a live join to Inquiry.customer -
    // a customer's real first name/initial as agreed for public display.
    // Agencies are expected to have consent before publishing; enforcing
    // that consent process itself is outside what software can verify.
    customerDisplayName: { type: String, required: true, trim: true, maxlength: 100 },

    headline: { type: String, required: true, trim: true, maxlength: 200 },
    story: { type: String, required: true, trim: true, maxlength: 3000 },
    photos: { type: [String], default: [] },

    status: { type: String, enum: ['pending_review', 'published', 'rejected'], default: 'pending_review' },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

successStorySchema.index({ status: 1, publishedAt: -1 });
successStorySchema.index({ agencyId: 1, status: 1 });

module.exports = mongoose.model('SuccessStory', successStorySchema);
