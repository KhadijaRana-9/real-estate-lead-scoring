// FIND-06 regression: on tenant-scoped, role-gated routes, resolveTenant()
// used to run BEFORE requireRole() in several places. Since resolveTenant
// explicitly sets req.tenant = null for an authenticated super_admin (by
// design - no agency) and `required` defaults to true, super_admin got a
// 404 "Unable to resolve a workspace for this request" instead of the 403
// "Forbidden: insufficient role" requireRole would give - inconsistent
// with routes that only used requireRole (no resolveTenant in the chain),
// which already correctly 403'd. This sweep proves the fix (requireRole
// now runs first everywhere) without changing any legitimately-allowed
// role's behavior.
const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser, createRoleUser, createSuperAdmin } = require('../helpers/factories');

const app = buildTestApp();

describe('super_admin gets a consistent 403 (not 404) on tenant-scoped role-gated routes (FIND-06 regression)', () => {
  let agency, agentToken, adminToken, customerToken, superAdminToken;

  beforeAll(async () => {
    agency = await createAgency();
    const agent = await createRoleUser(agency._id, 'agent', { password: 'Password123!' });
    agentToken = agent.accessToken;
    const admin = await createRoleUser(agency._id, 'agency_admin', { password: 'Password123!' });
    adminToken = admin.accessToken;
    const customer = await signupUser(app, agency.slug, { role: 'customer' });
    customerToken = customer.accessToken;

    const { user: superAdmin, password } = await createSuperAdmin();
    const login = await request(app).post('/api/platform/login').send({ email: superAdmin.email, password });
    superAdminToken = login.body.accessToken;
  });

  const routes = [
    { method: 'get', path: '/api/properties/mine', allowed: ['agent', 'admin'] },
    { method: 'get', path: '/api/inquiries', allowed: ['agent', 'admin'] },
    { method: 'get', path: '/api/dashboard/summary', allowed: ['agent', 'admin'] },
    { method: 'get', path: '/api/crm/tasks', allowed: ['agent', 'admin'] },
    { method: 'get', path: '/api/reports/properties.csv', allowed: ['agent', 'admin'] },
    { method: 'get', path: '/api/billing/subscription', allowed: ['admin'] },
  ];

  it.each(routes)('$path: super_admin gets 403, never 404', async ({ method, path }) => {
    const res = await request(app)[method](path).set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden: insufficient role');
  });

  it.each(routes)('$path: customer (never an allowed role here) still gets 403, same as before', async ({ method, path }) => {
    const res = await request(app)[method](path).set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it.each(routes)('$path: an allowed role still succeeds (no isolation bypass, no regression)', async ({ method, path, allowed }) => {
    const token = allowed.includes('agent') ? agentToken : adminToken;
    const res = await request(app)[method](path).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBeLessThan(400);
  });

  it('agent (not in billing\'s allowed list) still gets 403 on /api/billing/subscription, same as before', async () => {
    const res = await request(app).get('/api/billing/subscription').set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(403);
  });

  // marketplace.routes.js's reply-to-review route is a multi-line
  // router.post() call the earlier single-line grep missed - confirmed
  // fixed via a full re-read of every routes file, not just the grep hits.
  // Mounted at /api/agencies (see app.js), not /api/marketplace.
  it('POST /api/agencies/reviews/:reviewId/reply: super_admin gets 403 (not 404), before a valid reviewId is even needed', async () => {
    const res = await request(app)
      .post('/api/agencies/reviews/000000000000000000000000/reply')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ text: 'thanks' });
    expect(res.status).toBe(403);
  });

  it('an unauthenticated request to a fixed route still gets 401, not 403 or 404 (auth middleware still runs first)', async () => {
    const res = await request(app).get('/api/properties/mine');
    expect(res.status).toBe(401);
  });
});
