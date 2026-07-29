const mongoose = require('mongoose');

const TASK_STATUSES = ['pending', 'in_progress', 'done'];

const taskSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: '', maxlength: 2000 },
    status: { type: String, enum: TASK_STATUSES, default: 'pending' },
    dueDate: { type: Date, default: null },
    relatedInquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', default: null },
    relatedProperty: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ agencyId: 1, assignedTo: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
module.exports.TASK_STATUSES = TASK_STATUSES;
