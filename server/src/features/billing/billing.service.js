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

async function getCurrentSubscription(tenantId) {
  const agency = await Agency.findById(tenantId);
  if (!agency) throw notFound();

  const plan = PLANS[agency.subscriptionPlan];
  const usage = await computeUsage(tenantId);

  return {
    plan: agency.subscriptionPlan,
    status: agency.subscriptionStatus,
    trialEndsAt: agency.trialEndsAt,
    priceMonthly: plan.priceMonthly,
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

async function requestUpgrade(tenantId, targetPlan, { successUrl, cancelUrl }) {
  const plan = PLANS[targetPlan];
  if (!plan) {
    const err = new Error(`Unknown plan "${targetPlan}"`);
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
    priceMonthly: plan.priceMonthly,
    currency: plan.currency,
    successUrl,
    cancelUrl,
  });

  return { configured: true, checkoutUrl: session.url };
}

module.exports = {
  getCurrentSubscription,
  computeUsage,
  generateInvoiceForCurrentPeriod,
  listInvoices,
  requestUpgrade,
};
