// Real, product-decided plan pricing - not a placeholder. This is the
// single source of truth for both usage-limit enforcement (Agency
// dashboard) and invoice amount computation (billing.service.js),
// so a price change here is reflected everywhere at once.
const PLANS = {
  starter: { label: 'Starter', priceMonthly: 4999, currency: 'PKR', maxProperties: 50, maxAgents: 3 },
  professional: { label: 'Professional', priceMonthly: 14999, currency: 'PKR', maxProperties: 500, maxAgents: 15 },
  enterprise: { label: 'Enterprise', priceMonthly: 39999, currency: 'PKR', maxProperties: Infinity, maxAgents: Infinity },
};

module.exports = { PLANS };
