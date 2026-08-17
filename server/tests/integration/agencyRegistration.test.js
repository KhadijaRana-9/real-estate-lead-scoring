const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createSuperAdmin, createAgency, unique } = require('../helpers/factories');
const Agency = require('../../src/features/agency/agency.model');

const app = buildTestApp();

function buildRegistration(overrides = {}) {
  const slug = overrides.slug || unique('regagency');
  return {
    companyName: 'Test Registration Agency',
    slug,
    city: 'Lahore',
    country: 'Pakistan',
    ownerName: 'Owner Person',
    ownerEmail: `${slug}@example.com`,
    password: 'Password123!',
    subscriptionPlan: 'starter',
    ...overrides,
  };
}

// A tiny real buffer stands in for each uploaded file - supertest's
// .attach() accepts a Buffer directly, no file needs to exist on disk.
function attachRequiredDocs(req) {
  return req
    .attach('registrationCertificate', Buffer.from('cert'), 'cert.pdf')
    .attach('businessLicense', Buffer.from('license'), 'license.pdf')
    .attach('cnicDocument', Buffer.from('cnic'), 'cnic.jpg')
    .attach('officeProof', Buffer.from('proof'), 'proof.jpg');
}

function submitRegistration(overrides = {}) {
  const payload = buildRegistration(overrides);
  let req = request(app).post('/api/agency-registrations');
  Object.entries(payload).forEach(([key, value]) => {
    req = req.field(key, String(value));
  });
  return attachRequiredDocs(req);
}

describe('Agency self-registration -> pending approval -> login gate', () => {
  it('a full submission creates a real pending Agency + agency_admin owner, unpaid (Stripe not configured in this env)', async () => {
    const res = await submitRegistration();

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.paymentConfigured).toBe(false);
    expect(res.body.checkoutUrl).toBeNull();

    const agency = await Agency.findById(res.body.agencyId);
    expect(agency.status).toBe('pending');
    expect(agency.paymentStatus).toBe('unpaid');
    expect(agency.verificationDocuments).toHaveLength(4);
    expect(agency.verificationDocuments.map((d) => d.docType).sort()).toEqual(
      ['business_license', 'cnic', 'office_proof', 'registration_certificate'].sort()
    );
  });

  it('rejects a duplicate workspace slug', async () => {
    const slug = unique('dupe-agency');
    await submitRegistration({ slug });
    const second = await submitRegistration({ slug });
    expect(second.status).toBe(409);
  });

  it('rejects a submission missing a required verification document', async () => {
    const payload = buildRegistration();
    let req = request(app).post('/api/agency-registrations');
    Object.entries(payload).forEach(([key, value]) => {
      req = req.field(key, String(value));
    });
    // Only 3 of the 4 required documents attached.
    req = req
      .attach('registrationCertificate', Buffer.from('cert'), 'cert.pdf')
      .attach('businessLicense', Buffer.from('license'), 'license.pdf')
      .attach('cnicDocument', Buffer.from('cnic'), 'cnic.jpg');

    const res = await req;
    expect(res.status).toBe(400);
  });

  it('the owner cannot log in while the agency is pending, with a clear message', async () => {
    const payload = buildRegistration();
    const reg = await submitRegistration(payload);

    const login = await request(app)
      .post(`/api/auth/login?workspace=${payload.slug}`)
      .send({ email: payload.ownerEmail, password: payload.password });

    expect(login.status).toBe(401);
    expect(login.body.message).toMatch(/pending admin approval/i);
    expect(reg.status).toBe(201); // sanity: registration itself succeeded
  });

  it('super_admin sees it under status=pending, approves it, and the owner can then log in', async () => {
    const { user: superAdmin, password: superAdminPassword } = await createSuperAdmin();
    const platformLogin = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const superToken = platformLogin.body.accessToken;

    const payload = buildRegistration();
    const reg = await submitRegistration(payload);

    const pendingList = await request(app).get('/api/platform/agencies?status=pending').set({ Authorization: `Bearer ${superToken}` });
    expect(pendingList.body.items.some((a) => a._id === reg.body.agencyId)).toBe(true);

    const approve = await request(app)
      .patch(`/api/platform/agencies/${reg.body.agencyId}/approve`)
      .set({ Authorization: `Bearer ${superToken}` });
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe('active');
    expect(approve.body.approvedAt).toBeTruthy();

    const login = await request(app)
      .post(`/api/auth/login?workspace=${payload.slug}`)
      .send({ email: payload.ownerEmail, password: payload.password });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('agency_admin');
  });

  it('super_admin can reject a pending agency with a reason, and login stays blocked', async () => {
    const { user: superAdmin, password: superAdminPassword } = await createSuperAdmin();
    const platformLogin = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const superToken = platformLogin.body.accessToken;

    const payload = buildRegistration();
    const reg = await submitRegistration(payload);

    const reject = await request(app)
      .patch(`/api/platform/agencies/${reg.body.agencyId}/reject`)
      .set({ Authorization: `Bearer ${superToken}` })
      .send({ reason: 'Documents did not match business records' });
    expect(reject.status).toBe(200);
    expect(reject.body.status).toBe('rejected');
    expect(reject.body.rejectionReason).toBe('Documents did not match business records');

    const login = await request(app)
      .post(`/api/auth/login?workspace=${payload.slug}`)
      .send({ email: payload.ownerEmail, password: payload.password });
    expect(login.status).toBe(401);
    expect(login.body.message).toMatch(/not approved/i);
  });

  it('cannot approve/reject an agency that is not pending (e.g. already active)', async () => {
    const { user: superAdmin, password: superAdminPassword } = await createSuperAdmin();
    const platformLogin = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const superToken = platformLogin.body.accessToken;

    const active = await Agency.create({
      companyName: 'Already Active Agency',
      slug: unique('already-active'),
      contactEmail: 'contact@example.com',
      status: 'active',
    });

    const approve = await request(app)
      .patch(`/api/platform/agencies/${active._id}/approve`)
      .set({ Authorization: `Bearer ${superToken}` });
    expect(approve.status).toBe(400);
  });
});

describe('Free Trial plan', () => {
  it('registering with plan=trial sets a real 7-day trialEndsAt, needs no payment, and still requires admin approval', async () => {
    const payload = buildRegistration({ subscriptionPlan: 'trial' });
    const res = await submitRegistration(payload);

    expect(res.status).toBe(201);
    expect(res.body.checkoutUrl).toBeNull();

    const agency = await Agency.findById(res.body.agencyId);
    expect(agency.subscriptionPlan).toBe('trial');
    expect(agency.paymentStatus).toBe('not_required');
    expect(agency.status).toBe('pending'); // same review gate as every other plan
    expect(agency.trialEndsAt).toBeTruthy();
    const daysUntilExpiry = (agency.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysUntilExpiry).toBeGreaterThan(6.9);
    expect(daysUntilExpiry).toBeLessThan(7.1);

    // Blocked until approved, exactly like every other plan.
    const login = await request(app)
      .post(`/api/auth/login?workspace=${payload.slug}`)
      .send({ email: payload.ownerEmail, password: payload.password });
    expect(login.status).toBe(401);
  });

  it('once approved, a trial agency has full working access (properties, dashboard) with no payment gate', async () => {
    const { user: superAdmin, password: superAdminPassword } = await createSuperAdmin();
    const platformLogin = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const superToken = platformLogin.body.accessToken;

    const payload = buildRegistration({ subscriptionPlan: 'trial' });
    const reg = await submitRegistration(payload);
    await request(app).patch(`/api/platform/agencies/${reg.body.agencyId}/approve`).set({ Authorization: `Bearer ${superToken}` });

    const login = await request(app)
      .post(`/api/auth/login?workspace=${payload.slug}`)
      .send({ email: payload.ownerEmail, password: payload.password });
    expect(login.status).toBe(200);
    const ownerToken = login.body.accessToken;

    const createProperty = await request(app)
      .post(`/api/properties?workspace=${payload.slug}`)
      .set({ Authorization: `Bearer ${ownerToken}` })
      .send({ title: 'Trial Agency House', price: 5000000, city: 'Lahore', area: 5, type: 'house', bedrooms: 3, bathrooms: 2 });
    expect(createProperty.status).toBe(201);

    const dashboard = await request(app).get('/api/dashboard/summary').set({ Authorization: `Bearer ${ownerToken}` });
    expect(dashboard.status).toBe(200);
  });

  it('once trialEndsAt has passed, feature routes 402 but billing/auth stay reachable', async () => {
    const { user: superAdmin, password: superAdminPassword } = await createSuperAdmin();
    const platformLogin = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const superToken = platformLogin.body.accessToken;

    const payload = buildRegistration({ subscriptionPlan: 'trial' });
    const reg = await submitRegistration(payload);
    await request(app).patch(`/api/platform/agencies/${reg.body.agencyId}/approve`).set({ Authorization: `Bearer ${superToken}` });
    await Agency.findByIdAndUpdate(reg.body.agencyId, { trialEndsAt: new Date(Date.now() - 1000) });

    const login = await request(app)
      .post(`/api/auth/login?workspace=${payload.slug}`)
      .send({ email: payload.ownerEmail, password: payload.password });
    expect(login.status).toBe(200); // /auth is exempt - they can still log in to see the upgrade prompt
    const ownerToken = login.body.accessToken;

    const blocked = await request(app)
      .get(`/api/properties/mine?workspace=${payload.slug}`)
      .set({ Authorization: `Bearer ${ownerToken}` });
    expect(blocked.status).toBe(402);
    expect(blocked.body.message).toMatch(/free trial has ended/i);

    const billingStillWorks = await request(app)
      .get(`/api/billing/subscription?workspace=${payload.slug}`)
      .set({ Authorization: `Bearer ${ownerToken}` });
    expect(billingStillWorks.status).toBe(200);
  });

  it('an agency that never signed up as a trial (trialEndsAt null) is never blocked by the trial-expiry check', async () => {
    const { user: superAdmin, password: superAdminPassword } = await createSuperAdmin();
    const platformLogin = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const superToken = platformLogin.body.accessToken;

    const payload = buildRegistration({ subscriptionPlan: 'starter' });
    const reg = await submitRegistration(payload);
    await request(app).patch(`/api/platform/agencies/${reg.body.agencyId}/approve`).set({ Authorization: `Bearer ${superToken}` });

    const login = await request(app)
      .post(`/api/auth/login?workspace=${payload.slug}`)
      .send({ email: payload.ownerEmail, password: payload.password });
    const ownerToken = login.body.accessToken;

    const res = await request(app).get(`/api/properties/mine?workspace=${payload.slug}`).set({ Authorization: `Bearer ${ownerToken}` });
    expect(res.status).toBe(200); // still 'trialing' status by default, but trialEndsAt is null -> no-op
  });
});

describe('Public registration status check (RegistrationPending.jsx polling)', () => {
  it('reports pending, then active after approval, with no auth required', async () => {
    const { user: superAdmin, password: superAdminPassword } = await createSuperAdmin();
    const platformLogin = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const superToken = platformLogin.body.accessToken;

    const payload = buildRegistration();
    const reg = await submitRegistration(payload);

    const beforeApproval = await request(app).get(`/api/agency-registrations/${reg.body.agencyId}/status`);
    expect(beforeApproval.status).toBe(200);
    expect(beforeApproval.body.status).toBe('pending');
    expect(beforeApproval.body.companyName).toBe(payload.companyName);

    await request(app).patch(`/api/platform/agencies/${reg.body.agencyId}/approve`).set({ Authorization: `Bearer ${superToken}` });

    const afterApproval = await request(app).get(`/api/agency-registrations/${reg.body.agencyId}/status`);
    expect(afterApproval.body.status).toBe('active');
  });

  it('reports rejected with the real reason, and 404s for a nonexistent id', async () => {
    const { user: superAdmin, password: superAdminPassword } = await createSuperAdmin();
    const platformLogin = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const superToken = platformLogin.body.accessToken;

    const reg = await submitRegistration(buildRegistration());
    await request(app)
      .patch(`/api/platform/agencies/${reg.body.agencyId}/reject`)
      .set({ Authorization: `Bearer ${superToken}` })
      .send({ reason: 'Incomplete documents' });

    const status = await request(app).get(`/api/agency-registrations/${reg.body.agencyId}/status`);
    expect(status.body.status).toBe('rejected');
    expect(status.body.rejectionReason).toBe('Incomplete documents');

    const missing = await request(app).get('/api/agency-registrations/507f1f77bcf86cd799439011/status');
    expect(missing.status).toBe(404);
  });

  it('never leaks sensitive fields (contact email, verification documents, etc) through the public status check', async () => {
    const reg = await submitRegistration(buildRegistration());
    const status = await request(app).get(`/api/agency-registrations/${reg.body.agencyId}/status`);
    expect(status.body.contactEmail).toBeUndefined();
    expect(status.body.verificationDocuments).toBeUndefined();
    expect(Object.keys(status.body).sort()).toEqual(['companyName', 'rejectionReason', 'slug', 'status'].sort());
  });
});

describe('Login/Signup accept an explicit ?workspace= to resolve the right tenant', () => {
  // Updated for BUG-001's fix (see auth.routes.js/auth.service.js): a bare
  // login with no ?workspace= at all used to 404 (or, in production where
  // DEFAULT_AGENCY_SLUG IS set, silently search the WRONG agency and report
  // a correct password as invalid - the actual reported bug). It now
  // resolves the account by identity instead, so this agency's own correct
  // owner login succeeds with no workspace param needed. Genuine tenant
  // isolation - a DIFFERENT, real agency's workspace must not authenticate
  // this account - is asserted separately below and still holds.
  it('logging in with no workspace resolves by identity and succeeds; a wrong explicit workspace still correctly fails', async () => {
    const { user: superAdmin, password: superAdminPassword } = await createSuperAdmin();
    const platformLogin = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const superToken = platformLogin.body.accessToken;

    const payload = buildRegistration();
    const reg = await submitRegistration(payload);
    await request(app).patch(`/api/platform/agencies/${reg.body.agencyId}/approve`).set({ Authorization: `Bearer ${superToken}` });

    const noWorkspace = await request(app).post('/api/auth/login').send({ email: payload.ownerEmail, password: payload.password });
    expect(noWorkspace.status).toBe(200);
    expect(noWorkspace.body.user.agencyId).toBe(reg.body.agencyId);

    const otherAgency = await createAgency();
    const wrongWorkspace = await request(app)
      .post(`/api/auth/login?workspace=${otherAgency.slug}`)
      .send({ email: payload.ownerEmail, password: payload.password });
    expect(wrongWorkspace.status).toBe(401);
    expect(wrongWorkspace.body.message).toBe('Invalid email or password');

    const rightWorkspace = await request(app)
      .post(`/api/auth/login?workspace=${payload.slug}`)
      .send({ email: payload.ownerEmail, password: payload.password });
    expect(rightWorkspace.status).toBe(200);
  });
});
