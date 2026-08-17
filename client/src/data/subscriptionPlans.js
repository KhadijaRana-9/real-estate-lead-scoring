// Single source of truth on the client for plan/payment display data -
// mirrors server/src/features/billing/billing.constants.js's real PLANS
// exactly (label/prices/limits). There's no public "list plans" endpoint
// (pricing changes rarely enough that duplicating these static values
// isn't worth adding one), so this one module is imported by both
// Pricing.jsx (the new plan-selection entry point) and anywhere else
// that needs to render plan/payment info, instead of each page
// hand-rolling its own copy.
export const PAID_PLANS = [
  { key: 'starter', label: 'Starter', priceMonthly: 4999, priceYearly: 49999, maxProperties: 50, maxAgents: 3 },
  { key: 'professional', label: 'Professional', priceMonthly: 14999, priceYearly: 149999, maxProperties: 500, maxAgents: 15 },
  { key: 'enterprise', label: 'Enterprise', priceMonthly: 39999, priceYearly: 399999, maxProperties: null, maxAgents: null },
]

// Only 'card' is real - it goes through the existing Stripe Checkout
// redirect. The others have no backend gateway integration anywhere in
// this codebase - shown but honestly disabled ("Coming soon") rather
// than omitted or faked, matching billing.service.js's own "not
// configured yet" pattern for Stripe itself. iconKey is resolved to a
// real icon component by whichever page renders this list (keeps this
// module framework-agnostic data, not JSX).
export const PAYMENT_METHODS = [
  { key: 'card', label: 'Credit / Debit Card', iconKey: 'card', available: true, note: 'Secure checkout via Stripe' },
  { key: 'jazzcash', label: 'JazzCash', iconKey: 'mobile', available: false },
  { key: 'easypaisa', label: 'Easypaisa', iconKey: 'mobile', available: false },
  { key: 'bank_transfer', label: 'Bank Transfer', iconKey: 'clock', available: false },
]

export function money(n) {
  return `PKR ${n.toLocaleString('en-PK')}`
}
