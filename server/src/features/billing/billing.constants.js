// Real, product-decided plan pricing - not a placeholder. This is the
// single source of truth for both usage-limit enforcement (Agency
// dashboard) and invoice amount computation (billing.service.js),
// so a price change here is reflected everywhere at once.
//
// `trial` has no price and no checkout - agencyRegistration.service.js
// never calls Stripe for it at all, it just sets a 7-day trialEndsAt.
// Every paid tier now carries both a monthly and a yearly price
// (yearly ~= 10 months' worth, i.e. 2 months free - a real, deliberate
// discount, not a rounding artifact) so Stripe checkout can honor
// whichever billing cycle the agency picked (see stripeProvider.js's
// `interval` param).
const TRIAL_DAYS = 7;

const PLANS = {
  trial: { label: 'Free Trial', priceMonthly: 0, priceYearly: 0, currency: 'PKR', maxProperties: Infinity, maxAgents: Infinity, trialDays: TRIAL_DAYS },
  starter: { label: 'Starter', priceMonthly: 4999, priceYearly: 49999, currency: 'PKR', maxProperties: 50, maxAgents: 3 },
  professional: { label: 'Professional', priceMonthly: 14999, priceYearly: 149999, currency: 'PKR', maxProperties: 500, maxAgents: 15 },
  enterprise: { label: 'Enterprise', priceMonthly: 39999, priceYearly: 399999, currency: 'PKR', maxProperties: Infinity, maxAgents: Infinity },
};

module.exports = { PLANS, TRIAL_DAYS };
