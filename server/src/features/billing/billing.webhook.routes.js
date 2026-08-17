const express = require('express');
const stripeProvider = require('./providers/stripeProvider');
const billingService = require('./billing.service');

const router = express.Router();

// Mounted in app.js BEFORE the global express.json() parser - Stripe's
// signature verification needs the exact raw request bytes, which
// express.json() would have already consumed and reserialized (breaking
// the signature check) if this ran after it. express.raw() here is
// scoped to just this route, so every other route is unaffected.
router.post('/', express.raw({ type: 'application/json' }), async (req, res, next) => {
  let event;
  try {
    event = stripeProvider.constructWebhookEvent(req.body, req.headers['stripe-signature']);
  } catch (err) {
    return res.status(400).json({ message: `Webhook signature verification failed: ${err.message}` });
  }

  // Express 4 does not catch a rejection from an async handler - left
  // unguarded, a transient DB error here would hang the request and
  // crash the process as an unhandled rejection instead of surfacing as
  // a normal 500 through errorHandler (see app.js).
  try {
    if (event.type === 'checkout.session.completed') {
      await billingService.handleCheckoutCompleted(event.data.object);
    }
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
