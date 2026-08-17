const request = require('supertest');
const jwt = require('jsonwebtoken');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');

const app = buildTestApp();

const propertyPayload = { title: 'Tenant Isolation House', price: 5000000, city: 'Karachi', area: 6, type: 'house', bedrooms: 4, bathrooms: 3 };

describe('Cross-tenant isolation (formalizes the manual verification run earlier in development)', () => {
  let tenant1, tenant2, agent1, agent2, p1, p2;

  beforeAll(async () => {
    tenant1 = await createAgency();
    tenant2 = await createAgency();
    agent1 = await signupUser(app, tenant1.slug, { role: 'agent' });
    agent2 = await signupUser(app, tenant2.slug, { role: 'agent' });

    const c1 = await request(app).post('/api/properties').set({ Authorization: `Bearer ${agent1.accessToken}` }).send(propertyPayload);
    const c2 = await request(app).post('/api/properties').set({ Authorization: `Bearer ${agent2.accessToken}` }).send(propertyPayload);
    p1 = c1.body;
    p2 = c2.body;
  });

  it('signups in different workspaces land in different agencies', () => {
    expect(agent1.user.agencyId).not.toBe(agent2.user.agencyId);
  });

  it('/mine never includes the other tenant\'s properties', async () => {
    const mine1 = await request(app).get('/api/properties/mine').set({ Authorization: `Bearer ${agent1.accessToken}` });
    const mine2 = await request(app).get('/api/properties/mine').set({ Authorization: `Bearer ${agent2.accessToken}` });
    expect(mine1.body.some((p) => p._id === p2._id)).toBe(false);
    expect(mine2.body.some((p) => p._id === p1._id)).toBe(false);
  });

  it('public listing scoped by workspace never crosses tenants', async () => {
    const list1 = await request(app).get(`/api/properties?workspace=${tenant1.slug}&limit=50`);
    const list2 = await request(app).get(`/api/properties?workspace=${tenant2.slug}&limit=50`);
    expect(list1.body.items.some((p) => p._id === p2._id)).toBe(false);
    expect(list2.body.items.some((p) => p._id === p1._id)).toBe(false);
  });

  it('fetching another tenant\'s property by ID 404s instead of leaking it', async () => {
    const res = await request(app).get(`/api/properties/${p2._id}?workspace=${tenant1.slug}`);
    expect(res.status).toBe(404);
  });

  it('a valid, legitimately-issued token from tenant1 cannot write to tenant2\'s property', async () => {
    const update = await request(app).put(`/api/properties/${p2._id}`).set({ Authorization: `Bearer ${agent1.accessToken}` }).send({ title: 'HACKED' });
    const del = await request(app).delete(`/api/properties/${p2._id}`).set({ Authorization: `Bearer ${agent1.accessToken}` });
    expect(update.status).toBe(404);
    expect(del.status).toBe(404);

    const stillThere = await request(app).get(`/api/properties/${p2._id}?workspace=${tenant2.slug}`);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.title).toBe(propertyPayload.title);
  });

  it('dashboard summary counts never include the other tenant\'s data', async () => {
    await request(app).post(`/api/inquiries?workspace=${tenant1.slug}`).send({ propertyId: p1._id, name: 'Tenant1 Lead', email: 't1@example.com', budget: 5000000 });
    await request(app).post(`/api/inquiries?workspace=${tenant2.slug}`).send({ propertyId: p2._id, name: 'Tenant2 Lead', email: 't2@example.com', budget: 5000000 });

    const summary1 = await request(app).get('/api/dashboard/summary').set({ Authorization: `Bearer ${agent1.accessToken}` });
    const summary2 = await request(app).get('/api/dashboard/summary').set({ Authorization: `Bearer ${agent2.accessToken}` });
    expect(summary1.body.cards.totalInquiries).toBe(1);
    expect(summary2.body.cards.totalInquiries).toBe(1);
  });

  it('a JWT forged with a different tenant\'s agencyId but the wrong signature is rejected', async () => {
    const forged = jwt.sign(
      { id: agent1.user.id, role: 'agent', agencyId: tenant2._id.toString(), name: 'Forged', email: 'forged@example.com' },
      'an-attacker-guessed-secret-not-the-real-one',
      { expiresIn: '15m' }
    );
    const res = await request(app).get('/api/properties/mine').set({ Authorization: `Bearer ${forged}` });
    expect(res.status).toBe(401);
  });
});

describe('DreamHomes default-tenant data never appears as another agency\'s private listings', () => {
  it('an agency named/slugged like the real default tenant is still an ordinary, isolated tenant', async () => {
    // Simulates the real seeded default tenant (server/.env's
    // DEFAULT_AGENCY_SLUG=dreamhomes, server/src/seed/seed.js) inside
    // the isolated test database, to prove Agency A's private "My
    // Listings" view can never surface DreamHomes' own marketplace
    // properties - not because DreamHomes is special-cased anywhere,
    // but because it isn't: it's scoped by the exact same agencyId
        // filter as any other agency.
    const dreamhomes = await createAgency({ slug: 'dreamhomes', companyName: 'DreamHomes' });
    const agencyA = await createAgency();
    const dreamhomesAgent = await signupUser(app, dreamhomes.slug, { role: 'agent' });
    const agentA = await signupUser(app, agencyA.slug, { role: 'agent' });

    const dhProp = await request(app)
      .post('/api/properties')
      .set({ Authorization: `Bearer ${dreamhomesAgent.accessToken}` })
      .send(propertyPayload);

    const mineA = await request(app).get('/api/properties/mine').set({ Authorization: `Bearer ${agentA.accessToken}` });
    expect(mineA.body.some((p) => p._id === dhProp.body._id)).toBe(false);
  });
});

describe('Dashboard team stats (Overview cards) are agency_admin-only and tenant-scoped', () => {
  it('agency_admin sees real counts scoped to their own agency; a plain agent sees null; counts never cross tenants', async () => {
    const { createRoleUser } = require('../helpers/factories');
    const agencyA = await createAgency();
    const agencyB = await createAgency();
    const adminA = await createRoleUser(agencyA._id, 'agency_admin');
    const agentA = await createRoleUser(agencyA._id, 'agent');
    await createRoleUser(agencyB._id, 'agent');
    await createRoleUser(agencyB._id, 'agent');

    const summaryAdminA = await request(app).get('/api/dashboard/summary').set({ Authorization: `Bearer ${adminA.accessToken}` });
    expect(summaryAdminA.body.cards.team).not.toBeNull();
    expect(summaryAdminA.body.cards.team.totalAgents).toBe(1);

    const summaryAgentA = await request(app).get('/api/dashboard/summary').set({ Authorization: `Bearer ${agentA.accessToken}` });
    expect(summaryAgentA.body.cards.team).toBeNull();
  });
});

describe('Super Admin platform surface and RBAC', () => {
  const { createSuperAdmin } = require('../helpers/factories');
  let superAdmin, superAdminPassword, tenant, agent;

  beforeAll(async () => {
    const created = await createSuperAdmin();
    superAdmin = created.user;
    superAdminPassword = created.password;
    tenant = await createAgency();
    agent = await signupUser(app, tenant.slug, { role: 'agent' });
  });

  it('super_admin logs in via /platform/login, not the tenant-scoped /auth/login', async () => {
    const platformLogin = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    expect(platformLogin.status).toBe(200);
    expect(platformLogin.body.user.role).toBe('super_admin');

    const tenantLoginAttempt = await request(app).post(`/api/auth/login?workspace=${tenant.slug}`).send({ email: superAdmin.email, password: superAdminPassword });
    expect(tenantLoginAttempt.status).toBe(401);
  });

  it('unauthenticated requests to platform routes are rejected', async () => {
    const res = await request(app).get('/api/platform/agencies');
    expect(res.status).toBe(401);
  });

  it('a regular agent (valid token, wrong role) cannot reach platform routes', async () => {
    const res = await request(app).get('/api/platform/agencies').set({ Authorization: `Bearer ${agent.accessToken}` });
    expect(res.status).toBe(403);
  });

  it('super_admin can list, create, suspend, and reactivate agencies', async () => {
    const login = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const token = login.body.accessToken;
    const authHeader = { Authorization: `Bearer ${token}` };

    const list = await request(app).get('/api/platform/agencies').set(authHeader);
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThan(0);

    const created = await request(app)
      .post('/api/platform/agencies')
      .set(authHeader)
      .send({ companyName: 'Newly Created Agency', slug: `new-agency-${Date.now()}`, contactEmail: 'new@example.com' });
    expect(created.status).toBe(201);

    const suspend = await request(app).patch(`/api/platform/agencies/${tenant._id}/suspend`).set(authHeader);
    expect(suspend.status).toBe(200);
    expect(suspend.body.status).toBe('suspended');

    const reactivate = await request(app).patch(`/api/platform/agencies/${tenant._id}/reactivate`).set(authHeader);
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.status).toBe('active');
  });

  it('suspending an agency blocks its members immediately, even with a still-valid access token', async () => {
    const login = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const authHeader = { Authorization: `Bearer ${login.body.accessToken}` };

    const before = await request(app).get('/api/properties/mine').set({ Authorization: `Bearer ${agent.accessToken}` });
    expect(before.status).toBe(200);

    await request(app).patch(`/api/platform/agencies/${tenant._id}/suspend`).set(authHeader);

    const after = await request(app).get('/api/properties/mine').set({ Authorization: `Bearer ${agent.accessToken}` });
    expect(after.status).toBe(403);

    await request(app).patch(`/api/platform/agencies/${tenant._id}/reactivate`).set(authHeader);
  });

  it('platform dashboard summary loads with the expected shape', async () => {
    const login = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password: superAdminPassword });
    const res = await request(app).get('/api/platform/dashboard/summary').set({ Authorization: `Bearer ${login.body.accessToken}` });
    expect(res.status).toBe(200);
    expect(res.body.cards).toEqual(
      expect.objectContaining({
        totalAgencies: expect.any(Number),
        activeAgencies: expect.any(Number),
        trialAgencies: expect.any(Number),
        totalProperties: expect.any(Number),
      })
    );
  });
});
