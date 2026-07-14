const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, trim: true },
    },
    message: { type: String, default: '' },
    budget: { type: Number, required: true, min: 0 },
    moveTimeline: {
      type: String,
      enum: ['immediate', '1-3m', '3-6m', 'exploring'],
      default: 'exploring',
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    status: { type: String, enum: ['hot', 'warm', 'cold'], required: true },
    scoreBreakdown: {
      budgetMatch: Number,
      urgency: Number,
      interest: Number,
      popularity: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inquiry', inquirySchema);
