const mongoose = require('mongoose');

const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled'];

const appointmentSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30, min: 5, max: 480 },
    location: { type: String, trim: true, default: '', maxlength: 300 },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: 'scheduled' },
    notes: { type: String, trim: true, default: '', maxlength: 2000 },
    relatedProperty: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    relatedInquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', default: null },
    customer: {
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

appointmentSchema.index({ agencyId: 1, assignedTo: 1, scheduledAt: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
module.exports.APPOINTMENT_STATUSES = APPOINTMENT_STATUSES;
