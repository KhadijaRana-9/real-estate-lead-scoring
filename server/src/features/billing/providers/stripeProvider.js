// Same gated-provider contract as shared/storage/providers/* - never
// throws for "not configured", always returns isConfigured():false and
// lets the caller decide how to respond honestly. Adding
// STRIPE_SECRET_KEY to the environment is the only step left to make
// checkout sessions real; nothing else in this file needs to change.
let stripeClient = null;

function isConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function getClient() {
  if (!isConfigured()) return null;
  if (!stripeClient) {
    const Stripe = require('stripe');
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// `interval` is 'month' or 'year' - Stripe's own recurring-interval
// vocabulary, reused as-is rather than translating 'monthly'/'yearly'
// here so this stays a thin, honest wrapper around the real Stripe API
// shape (the monthly/yearly naming lives in Agency.billingCycle and the
// registration/upgrade layer that calls this).
async function createCheckoutSession({ agencyId, plan, price, interval = 'month', currency, successUrl, cancelUrl }) {
  const client = getClient();
  if (!client) {
    const err = new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to enable real checkout.');
    err.status = 503;
    throw err;
  }

  return client.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: Math.round(price * 100),
          recurring: { interval },
          product_data: { name: `DreamHomes ${plan} plan (${interval === 'year' ? 'yearly' : 'monthly'})` },
        },
        quantity: 1,
      },
    ],
    client_reference_id: String(agencyId),
    // Carried through to the checkout.session.completed webhook event
    // (billing.service.js's handleCheckoutCompleted) so it knows which
    // plan was actually purchased - metadata is set here, server-side,
    // at session-creation time, and is covered by Stripe's webhook
    // signature, so the webhook can trust it completely.
    metadata: { agencyId: String(agencyId), targetPlan: plan },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

// Verifies a webhook payload really came from Stripe (HMAC signature
// check against STRIPE_WEBHOOK_SECRET) before any handler trusts its
// contents - constructEvent throws on a bad/missing signature, which the
// caller (billing.webhook.routes.js) turns into a 400 rather than ever
// processing an unverified event.
function constructWebhookEvent(rawBody, signature) {
  const client = getClient();
  if (!client) {
    const err = new Error('Stripe is not configured.');
    err.status = 503;
    throw err;
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    const err = new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    err.status = 503;
    throw err;
  }
  return client.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = { isConfigured, createCheckoutSession, constructWebhookEvent, name: 'stripe' };
