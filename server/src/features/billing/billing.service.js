const Agency = require('../agency/agency.model');
const Property = require('../property/property.model');
const User = require('../auth/auth.model');
const Invoice = require('./invoice.model');
const stripeProvider = require('./providers/stripeProvider');
const { PLANS } = require('./billing.constants');

function notFound() {
  const err = new Error('Agency not found');
  err.status = 404;
  return err;
}

async function computeUsage(tenantId) {
  const [properties, agents] = await Promise.all([
    Property.countDocuments({ agencyId: tenantId }),
    User.countDocuments({ agencyId: tenantId, role: 'agent' }),
  ]);
  return { properties, agents };
}

// Single real enforcement point for both maxProperties and maxAgents -
// called from property.service.js (createProperty/createDraftProperty)
// and agency.service.js (inviteUser pre-check, acceptInvite/
// approveApplication authoritative check at the moment a seat is
// actually consumed). Previously computeUsage only ever fed display
// numbers (subscription page, invoices) - this is what makes the
// billing.constants.js header comment about "usage-limit enforcement"
// actually true.
const LIMIT_FIELDS = { properties: 'maxProperties', agents: 'maxAgents' };

async function assertWithinLimit(tenantId, resource) {
  const field = LIMIT_FIELDS[resource];
  if (!field) throw new Error(`Unknown limit resource "${resource}"`);

  const agency = await Agency.findById(tenantId).select('subscriptionPlan');
  if (!agency) throw notFound();

  const plan = PLANS[agency.subscriptionPlan];
  const usage = await computeUsage(tenantId);
  const max = plan[field];

  if (usage[resource] >= max) {
    const err = new Error(
      `Your ${plan.label} plan allows up to ${max} ${resource}. Upgrade your subscription to add more.`
    );
    err.status = 403;
    err.limitReached = { resource, plan: agency.subscriptionPlan, max, current: usage[resource] };
    throw err;
  }
}

async function getCurrentSubscription(tenantId) {
  const agency = await Agency.findById(tenantId);
  if (!agency) throw notFound();

  const plan = PLANS[agency.subscriptionPlan];
  const usage = await computeUsage(tenantId);

  return {
    plan: agency.subscriptionPlan,
    status: agency.subscriptionStatus,
    billingCycle: agency.billingCycle,
    trialEndsAt: agency.trialEndsAt,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    currency: plan.currency,
    limits: { maxProperties: plan.maxProperties, maxAgents: plan.maxAgents },
    usage,
    usagePercent: {
      properties: plan.maxProperties === Infinity ? 0 : Math.round((usage.properties / plan.maxProperties) * 100),
      agents: plan.maxAgents === Infinity ? 0 : Math.round((usage.agents / plan.maxAgents) * 100),
    },
    availablePlans: Object.entries(PLANS).map(([key, value]) => ({ key, ...value })),
  };
}

function currentPeriod() {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { periodStart, periodEnd };
}

// Idempotent per calendar month: re-running this for the same agency in
// the same month updates the existing draft's usage snapshot instead of
// creating a duplicate invoice, thanks to the unique compound index on
// (agencyId, periodStart, periodEnd).
async function generateInvoiceForCurrentPeriod(tenantId) {
  const agency = await Agency.findById(tenantId);
  if (!agency) throw notFound();

  const plan = PLANS[agency.subscriptionPlan];
  const usage = await computeUsage(tenantId);
  const { periodStart, periodEnd } = currentPeriod();

  return Invoice.findOneAndUpdate(
    { agencyId: tenantId, periodStart, periodEnd },
    {
      agencyId: tenantId,
      plan: agency.subscriptionPlan,
      periodStart,
      periodEnd,
      amount: plan.priceMonthly,
      currency: plan.currency,
      usageSnapshot: usage,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function listInvoices(tenantId) {
  return Invoice.find({ agencyId: tenantId }).sort({ periodStart: -1 });
}

async function requestUpgrade(tenantId, targetPlan, { successUrl, cancelUrl, billingCycle = 'monthly' }) {
  const plan = PLANS[targetPlan];
  if (!plan) {
    const err = new Error(`Unknown plan "${targetPlan}"`);
    err.status = 400;
    throw err;
  }
  if (targetPlan === 'trial') {
    const err = new Error('Cannot upgrade to the Free Trial plan - it is only available at initial registration.');
    err.status = 400;
    throw err;
  }

  if (!stripeProvider.isConfigured()) {
    return {
      configured: false,
      message:
        'Payment processing is not configured yet. Add STRIPE_SECRET_KEY to the server environment to enable real checkout - the upgrade flow, pricing, and invoicing are already fully built.',
    };
  }

  const session = await stripeProvider.createCheckoutSession({
    agencyId: tenantId,
    plan: targetPlan,
    price: billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly,
    interval: billingCycle === 'yearly' ? 'year' : 'month',
    currency: plan.currency,
    successUrl,
    cancelUrl,
  });

  await Agency.findByIdAndUpdate(tenantId, { billingCycle });

  return { configured: true, checkoutUrl: session.url };
}

// Called only after stripeProvider.constructWebhookEvent has already
// verified the payload's signature (see billing.webhook.routes.js) -
// this function trusts `session` completely, it never re-validates it.
// agencyId/targetPlan both come from session.metadata, which is set
// server-side at checkout-session creation (stripeProvider.js's
// createCheckoutSession) from the authenticated tenant's own request -
// never client-editable, and covered by the same Stripe signature.
//
// Flips `paymentStatus`/`subscriptionStatus` exactly as before, and
// additionally persists the purchased plan so assertWithinLimit
// enforces the NEW plan's limits, not the one the agency upgraded from.
// targetPlan is only ever applied if it's a real key in PLANS - missing
// or unrecognized metadata leaves subscriptionPlan untouched rather than
// ever being set to undefined or an invalid value. Deliberately leaves
// `status` (the pending/active/rejected admin-approval gate) untouched -
// a paid agency still can't log in until a super_admin approves it
// separately (see auth.service.js's login), matching the registration
// flow's own ordering (payment happens before admin review, not instead
// of it).
async function handleCheckoutCompleted(session) {
  const agencyId = session.metadata?.agencyId;
  if (!agencyId) return;

  const agency = await Agency.findById(agencyId);
  if (!agency) return;

  agency.paymentStatus = 'paid';
  agency.subscriptionStatus = 'active';

  const targetPlan = session.metadata?.targetPlan;
  if (targetPlan && Object.prototype.hasOwnProperty.call(PLANS, targetPlan)) {
    agency.subscriptionPlan = targetPlan;
  }

  await agency.save();
}

module.exports = {
  getCurrentSubscription,
  computeUsage,
  assertWithinLimit,
  generateInvoiceForCurrentPeriod,
  listInvoices,
  requestUpgrade,
  handleCheckoutCompleted,
};
