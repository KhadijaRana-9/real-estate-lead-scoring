const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency } = require('../helpers/factories');
const Agency = require('../../src/features/agency/agency.model');
const billingService = require('../../src/features/billing/billing.service');

const app = buildTestApp();

// checkout.session.completed's plan-persistence logic (handleCheckoutCompleted)
// is exercised directly with a constructed, already-"verified" session object
// - exactly the shape billing.webhook.routes.js hands it once Stripe's
// signature check has already passed, so this tests the same trust boundary
// the real webhook operates under. Signature verification itself (whether an
// unverified payload can reach that boundary at all) is covered separately
// below, through the real HTTP route with real Stripe signature math.
describe('Billing: checkout.session.completed plan persistence', () => {
  function completedSession(agencyId, targetPlan) {
    return {
      metadata: {
        agencyId: agencyId.toString(),
        ...(targetPlan !== undefined ? { targetPlan } : {}),
      },
    };
  }

  it('Starter -> Professional: subscriptionPlan is updated on upgrade', async () => {
    const agency = await createAgency({ subscriptionPlan: 'starter' });
    await billingService.handleCheckoutCompleted(completedSession(agency._id, 'professional'));

    const updated = await Agency.findById(agency._id);
    expect(updated.subscriptionPlan).toBe('professional');
    expect(updated.paymentStatus).toBe('paid');
    expect(updated.subscriptionStatus).toBe('active');
  });

  it('Professional -> Enterprise: subscriptionPlan is updated on a second upgrade', async () => {
    const agency = await createAgency({ subscriptionPlan: 'professional' });
    await billingService.handleCheckoutCompleted(completedSession(agency._id, 'enterprise'));

    const updated = await Agency.findById(agency._id);
    expect(updated.subscriptionPlan).toBe('enterprise');
    expect(updated.paymentStatus).toBe('paid');
    expect(updated.subscriptionStatus).toBe('active');
  });

  it('invalid targetPlan: subscriptionPlan is left unchanged, payment status still updates', async () => {
    const agency = await createAgency({ subscriptionPlan: 'starter' });
    await billingService.handleCheckoutCompleted(completedSession(agency._id, 'not-a-real-plan'));

    const updated = await Agency.findById(agency._id);
    expect(updated.subscriptionPlan).toBe('starter');
    expect(updated.paymentStatus).toBe('paid');
    expect(updated.subscriptionStatus).toBe('active');
  });

  it('missing targetPlan metadata: subscriptionPlan is left unchanged, payment status still updates', async () => {
    const agency = await createAgency({ subscriptionPlan: 'starter' });
    await billingService.handleCheckoutCompleted(completedSession(agency._id, undefined));

    const updated = await Agency.findById(agency._id);
    expect(updated.subscriptionPlan).toBe('starter');
    expect(updated.paymentStatus).toBe('paid');
    expect(updated.subscriptionStatus).toBe('active');
  });

  it('missing agencyId metadata: no-op, matches pre-existing behavior for an unidentifiable session', async () => {
    await expect(
      billingService.handleCheckoutCompleted({ metadata: { targetPlan: 'professional' } })
    ).resolves.toBeUndefined();
  });
});

// Full HTTP round trip through the real webhook route, using the real
// `stripe` package's own local (no-network) signature helpers rather than
// mocking anything away - genuinely exercises constructWebhookEvent's
// signature check, matching this codebase's existing preference for real
// integration points over mocks (see aiLlmEscalation.test.js's fake LLM
// server). Fake key/secret only ever touch local HMAC math, never Stripe's
// servers.
describe('Billing webhook: signature verification (real route, real Stripe crypto)', () => {
  const FAKE_SECRET_KEY = 'sk_test_fake_key_for_local_signature_math_only';
  const FAKE_WEBHOOK_SECRET = 'whsec_fake_test_secret_for_local_signature_math_only';
  let stripeForTestSigning;

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = FAKE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = FAKE_WEBHOOK_SECRET;
    const Stripe = require('stripe');
    stripeForTestSigning = new Stripe(FAKE_SECRET_KEY);
  });

  afterAll(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  function buildPayload(agencyId, targetPlan) {
    return JSON.stringify({
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: { object: { metadata: { agencyId: agencyId.toString(), targetPlan } } },
    });
  }

  it('rejects a request with an invalid/forged signature', async () => {
    const agency = await createAgency({ subscriptionPlan: 'starter' });
    const payload = buildPayload(agency._id, 'professional');

    const res = await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=not-a-real-signature')
      .send(payload);

    expect(res.status).toBe(400);

    const unchanged = await Agency.findById(agency._id);
    expect(unchanged.subscriptionPlan).toBe('starter');
    expect(unchanged.paymentStatus).not.toBe('paid');
  });

  it('accepts a genuinely-signed event and applies the target plan end to end', async () => {
    const agency = await createAgency({ subscriptionPlan: 'starter' });
    const payload = buildPayload(agency._id, 'professional');
    const signature = stripeForTestSigning.webhooks.generateTestHeaderString({
      payload,
      secret: FAKE_WEBHOOK_SECRET,
    });

    const res = await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });

    const updated = await Agency.findById(agency._id);
    expect(updated.subscriptionPlan).toBe('professional');
    expect(updated.paymentStatus).toBe('paid');
    expect(updated.subscriptionStatus).toBe('active');
  });
});
