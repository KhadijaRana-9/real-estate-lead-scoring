const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    plan: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'PKR' },
    usageSnapshot: {
      properties: { type: Number, required: true },
      agents: { type: Number, required: true },
    },
    status: { type: String, enum: ['draft', 'paid', 'void'], default: 'draft' },
    paidAt: { type: Date, default: null },
    // Set once a real payment provider is wired up and actually charges
    // this invoice - stays null while STRIPE_SECRET_KEY is absent.
    paymentProviderRef: { type: String, default: null },
  },
  { timestamps: true }
);

invoiceSchema.index({ agencyId: 1, periodStart: -1 });
// One invoice per agency per billing period - generating twice for the
// same month should update the existing draft, not create a duplicate.
invoiceSchema.index({ agencyId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
