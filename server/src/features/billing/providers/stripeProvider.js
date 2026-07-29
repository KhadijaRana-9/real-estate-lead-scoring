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

async function createCheckoutSession({ agencyId, plan, priceMonthly, currency, successUrl, cancelUrl }) {
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
          unit_amount: Math.round(priceMonthly * 100),
          recurring: { interval: 'month' },
          product_data: { name: `DreamHomes ${plan} plan` },
        },
        quantity: 1,
      },
    ],
    client_reference_id: String(agencyId),
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

module.exports = { isConfigured, createCheckoutSession, name: 'stripe' };
