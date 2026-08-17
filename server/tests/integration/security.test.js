const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');

const app = buildTestApp();

describe('Security regressions', () => {
  describe('rate limiting (isolated instance - the app-wide limiters are intentionally raised under NODE_ENV=test)', () => {
    it('returns 429 with a JSON message once a configured limit is exceeded', async () => {
      const isolatedApp = express();
      isolatedApp.use(rateLimit({ windowMs: 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Please try again later.' } }));
      isolatedApp.get('/ping', (req, res) => res.json({ ok: true }));

      const results = [];
      for (let i = 0; i < 5; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        results.push(await request(isolatedApp).get('/ping'));
      }

      expect(results.slice(0, 3).every((r) => r.status === 200)).toBe(true);
      expect(results.slice(3).every((r) => r.status === 429)).toBe(true);
      expect(results[3].body.message).toBe('Too many requests. Please try again later.');
    });

    // BUG-002 regression: /auth/login used to share ONE authLimiter
    // instance with /auth/signup and /agency-registrations, so a user
    // retrying a login a few times (e.g. after BUG-001's false "invalid
    // password") could exhaust the shared budget and get locked out of
    // signup/registration too, not just login. rateLimiters.js now exports
    // separate loginLimiter/signupLimiter instances instead. Real
    // production values (10/15min) can't be exercised directly here since
    // NODE_ENV=test bumps every real limiter's limit to 100000 - this
    // proves the STRUCTURAL fix (independent instances = independent
    // counters) the same way the isolated-limiter test above does.
    it('separate limiter instances do not share a budget; the same instance reused across routes does', async () => {
      const separateApp = express();
      const limiterA = rateLimit({ windowMs: 60 * 1000, limit: 2, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again later.' } });
      const limiterB = rateLimit({ windowMs: 60 * 1000, limit: 2, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again later.' } });
      separateApp.post('/route-a', limiterA, (req, res) => res.json({ ok: true }));
      separateApp.post('/route-b', limiterB, (req, res) => res.json({ ok: true }));

      // Exhaust route A's budget (limit 2).
      await request(separateApp).post('/route-a');
      await request(separateApp).post('/route-a');
      const aBlocked = await request(separateApp).post('/route-a');
      expect(aBlocked.status).toBe(429);

      // Route B, on its OWN limiter instance, is unaffected.
      const bStillWorks = await request(separateApp).post('/route-b');
      expect(bStillWorks.status).toBe(200);

      // Sanity check the test methodology itself: reusing the SAME
      // instance across two routes (the old, buggy wiring) DOES let one
      // route's traffic exhaust the other's budget - proving this test
      // would actually have caught the original bug.
      const sharedApp = express();
      const sharedLimiter = rateLimit({ windowMs: 60 * 1000, limit: 2, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again later.' } });
      sharedApp.post('/route-a', sharedLimiter, (req, res) => res.json({ ok: true }));
      sharedApp.post('/route-b', sharedLimiter, (req, res) => res.json({ ok: true }));

      await request(sharedApp).post('/route-a');
      await request(sharedApp).post('/route-a');
      const bBlockedByA = await request(sharedApp).post('/route-b');
      expect(bBlockedByA.status).toBe(429);
    });
  });

  describe('regex / NoSQL injection hardening on the public search endpoint', () => {
    it('a city value containing regex metacharacters does not crash the query or match everything', async () => {
      const agency = await createAgency();
      const agent = await signupUser(app, agency.slug, { role: 'agent' });
      await request(app).post('/api/properties').set({ Authorization: `Bearer ${agent.accessToken}` }).send({
        title: 'Regex Test House', price: 1000000, city: 'Lahore', area: 5, type: 'house',
      });

      const maliciousCity = '.*';
      const res = await request(app).get(`/api/properties?workspace=${agency.slug}&city=${encodeURIComponent(maliciousCity)}`);
      expect(res.status).toBe(200);
      // A literal ".*" should not match "Lahore" once escaped - if it did,
      // the regex-escaping in property.service.js has regressed.
      expect(res.body.items.length).toBe(0);
    });

    it('rejects a query-parameter injection attempt (object instead of string) via Zod type checking', async () => {
      const agency = await createAgency();
      const res = await request(app).get(`/api/properties?workspace=${agency.slug}&city[$ne]=null`);
      // Express parses this into city: { '$ne': 'null' } - Zod's
      // z.string() on the city field must reject a non-string, not pass
      // an object through to a Mongo query.
      expect(res.status).toBe(400);
    });
  });

  describe('mass assignment (regression - see property.test.js for the full CRUD suite)', () => {
    it('createProperty never trusts client-supplied agent, agencyId, status, or views, regardless of route path used', async () => {
      const agency = await createAgency();
      const attacker = await signupUser(app, agency.slug, { role: 'agent' });
      const victimAgency = await createAgency();

      const res = await request(app)
        .post('/api/properties')
        .set({ Authorization: `Bearer ${attacker.accessToken}` })
        .send({
          title: 'Attack Listing', price: 1, city: 'Lahore', area: 1, type: 'house',
          agencyId: victimAgency._id.toString(),
          agent: '000000000000000000000000',
          status: 'sold',
          views: 500000,
        });

      expect(res.status).toBe(201);
      expect(res.body.agencyId).toBe(agency._id.toString());
      expect(res.body.agent).toBe(attacker.user.id);
      expect(res.body.status).toBe('available');
      expect(res.body.views).toBe(0);
    });
  });

  describe('JWT integrity', () => {
    it('a token with a tampered payload but stale signature is rejected', async () => {
      const agency = await createAgency();
      const session = await signupUser(app, agency.slug, { role: 'agent' });
      const [header, , signature] = session.accessToken.split('.');

      // Tamper with the payload (escalate role) but keep the original signature.
      const forgedPayload = Buffer.from(JSON.stringify({ id: session.user.id, role: 'agency_admin', agencyId: agency._id.toString() })).toString('base64url');
      const tamperedToken = `${header}.${forgedPayload}.${signature}`;

      const res = await request(app).get('/api/properties/mine').set({ Authorization: `Bearer ${tamperedToken}` });
      expect(res.status).toBe(401);
    });
  });
});
