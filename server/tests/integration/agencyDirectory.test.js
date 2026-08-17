const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const Agency = require('../../src/features/agency/agency.model');
const { unique } = require('../helpers/factories');

const app = buildTestApp();

describe('Public agency profile - field exposure', () => {
  it('never leaks verification documents or internal billing/approval metadata to anonymous visitors', async () => {
    const agency = await Agency.create({
      companyName: 'Directory Test Agency',
      slug: unique('directory-agency'),
      contactEmail: `contact-${unique('a')}@example.com`,
      address: '123 Main Street',
      status: 'active',
      subscriptionPlan: 'starter',
      subscriptionStatus: 'trialing',
      billingCycle: 'monthly',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentStatus: 'unpaid',
      customDomain: null,
      verificationDocuments: [
        { docType: 'cnic', name: 'owner-cnic.pdf', url: 'https://example.com/private/owner-cnic.pdf' },
      ],
    });

    const res = await request(app).get(`/api/agencies/${agency.slug}`);
    expect(res.status).toBe(200);

    // Real, public-facing fields must still be present (this is what
    // AgencyProfile.jsx actually renders - the fix must not break it).
    expect(res.body.companyName).toBe('Directory Test Agency');
    expect(res.body.address).toBe('123 Main Street');

    // Internal/sensitive fields must never reach an anonymous visitor.
    expect(res.body.verificationDocuments).toBeUndefined();
    expect(res.body.paymentStatus).toBeUndefined();
    expect(res.body.subscriptionStatus).toBeUndefined();
    expect(res.body.billingCycle).toBeUndefined();
    expect(res.body.trialEndsAt).toBeUndefined();
    expect(res.body.customDomain).toBeUndefined();
    expect(res.body.rejectionReason).toBeUndefined();
    expect(res.body.approvedBy).toBeUndefined();
  });
});
