const mongoose = require('mongoose');
const { PIPELINE_STAGES } = require('./pipelineStages');

const inquirySchema = new mongoose.Schema(
  {
    // Contract step complete - see property.model.js.
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
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
    // CRM pipeline stage - independent of the hot/warm/cold score-derived
    // status above. Score reflects lead quality; pipelineStage reflects
    // where the agent's own follow-up process actually is.
    pipelineStage: {
      type: String,
      enum: PIPELINE_STAGES,
      default: 'new',
    },
  },
  { timestamps: true }
);

inquirySchema.index({ agencyId: 1, createdAt: -1 });
inquirySchema.index({ agencyId: 1, property: 1, score: -1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
