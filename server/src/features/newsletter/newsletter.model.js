const mongoose = require('mongoose');
const crypto = require('crypto');

// Capture-only: this stores real subscriber intent. Actually emailing
// this list requires an email service provider API key, which isn't
// configured (see newsletter.service.js/README note) - that's a genuine
// external-credential dependency, not something to fake with a
// console.log "email sent" stand-in.
const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    status: { type: String, enum: ['subscribed', 'unsubscribed'], default: 'subscribed' },
    unsubscribeToken: { type: String, required: true, default: () => crypto.randomBytes(24).toString('hex') },
    source: { type: String, trim: true, default: 'homepage' },
  },
  { timestamps: true }
);

newsletterSubscriberSchema.index({ status: 1 });

module.exports = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);
