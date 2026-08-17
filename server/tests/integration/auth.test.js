const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, unique, createRoleUser } = require('../helpers/factories');
const User = require('../../src/features/auth/auth.model');

const app = buildTestApp();

describe('Auth: signup / login / refresh rotation / logout', () => {
  let agency;

  beforeAll(async () => {
    agency = await createAgency();
  });

  describe('validation', () => {
    it('rejects signup with invalid email, short password, and a forged privileged role', async () => {
      const res = await request(app)
        .post(`/api/auth/signup?workspace=${agency.slug}`)
        .send({ name: 'A', email: 'not-an-email', password: '123', role: 'super_admin' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      const paths = res.body.errors.map((e) => e.path);
      expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'password', 'role']));
    });

    it('rejects login with missing password', async () => {
      const res = await request(app).post(`/api/auth/login?workspace=${agency.slug}`).send({ email: 'a@b.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('signup + login', () => {
    it('signs up a customer and returns access + refresh tokens', async () => {
      const email = `${unique('customer')}@example.com`;
      const res = await request(app)
        .post(`/api/auth/signup?workspace=${agency.slug}`)
        .send({ name: 'New Customer', email, password: 'Password123!' });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email, role: 'customer', agencyId: agency._id.toString() });
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    // Public self-signup must never create an agent: that would let
    // anyone list themselves as a real agent of any agency with no
    // invite, no admin approval, and no seat-limit check (see
    // agency.service.js's createActiveMembership, which is the only
    // path that's actually allowed to do that).
    it('rejects public self-signup with role: agent', async () => {
      const res = await request(app)
        .post(`/api/auth/signup?workspace=${agency.slug}`)
        .send({ name: 'Test User', email: `${unique('agent')}@example.com`, password: 'Password123!', role: 'agent' });
      expect(res.status).toBe(400);
    });

    it('ignores a client-supplied agencyId and scopes the new user to the resolved workspace instead', async () => {
      const otherAgency = await createAgency();
      const email = `${unique('forged')}@example.com`;
      const res = await request(app)
        .post(`/api/auth/signup?workspace=${agency.slug}`)
        .send({ name: 'Test User', email, password: 'Password123!', agencyId: otherAgency._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.user.agencyId).toBe(agency._id.toString());
    });

    it('rejects duplicate signup within the same agency', async () => {
      const email = `${unique('dup')}@example.com`;
      await request(app).post(`/api/auth/signup?workspace=${agency.slug}`).send({ name: 'Test User', email, password: 'Password123!' });
      const second = await request(app).post(`/api/auth/signup?workspace=${agency.slug}`).send({ name: 'Test User Two', email, password: 'Password123!' });
      expect(second.status).toBe(409);
    });

    it('allows the SAME email to sign up in a DIFFERENT agency (per-tenant email uniqueness)', async () => {
      const otherAgency = await createAgency();
      const email = `${unique('shared')}@example.com`;
      const first = await request(app).post(`/api/auth/signup?workspace=${agency.slug}`).send({ name: 'Test User', email, password: 'Password123!' });
      const second = await request(app).post(`/api/auth/signup?workspace=${otherAgency.slug}`).send({ name: 'Test User', email, password: 'Password123!' });
      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.user.agencyId).not.toBe(second.body.user.agencyId);
    });

    it('self-signup cannot escalate role to agency_admin or super_admin', async () => {
      const res = await request(app)
        .post(`/api/auth/signup?workspace=${agency.slug}`)
        .send({ name: 'Test User', email: `${unique('esc')}@example.com`, password: 'Password123!', role: 'agency_admin' });
      // Zod schema only allows 'customer' at the HTTP boundary.
      expect(res.status).toBe(400);
    });

    it('rejects login with wrong password without revealing whether the account exists', async () => {
      const email = `${unique('wrongpw')}@example.com`;
      await request(app).post(`/api/auth/signup?workspace=${agency.slug}`).send({ name: 'Test User', email, password: 'Password123!' });
      const wrongPw = await request(app).post(`/api/auth/login?workspace=${agency.slug}`).send({ email, password: 'WrongPassword1!' });
      const noSuchUser = await request(app).post(`/api/auth/login?workspace=${agency.slug}`).send({ email: 'nobody@example.com', password: 'WrongPassword1!' });
      expect(wrongPw.status).toBe(401);
      expect(noSuchUser.status).toBe(401);
      expect(wrongPw.body.message).toBe(noSuchUser.body.message);
    });
  });

  // FIND-05 regression: resolveFromRequest() used to fall through to the
  // DEFAULT_AGENCY_SLUG bridge even when an explicit ?workspace= slug was
  // given but matched no agency - a typo'd workspace on signup silently
  // created the account under the wrong (default) agency with zero
  // indication. testEnv.js deliberately clears DEFAULT_AGENCY_SLUG for
  // every other test in this file, so the bridge itself is exercised here
  // by setting it just for these tests, mirroring aiLlmEscalation.test.js's
  // own established pattern of scoping an env var to one file/block.
  describe('invalid ?workspace= is rejected instead of silently falling back (FIND-05 regression)', () => {
    afterEach(() => {
      delete process.env.DEFAULT_AGENCY_SLUG;
    });

    it('signup with a nonexistent workspace slug is rejected, not silently created under the default agency', async () => {
      const defaultAgency = await createAgency();
      process.env.DEFAULT_AGENCY_SLUG = defaultAgency.slug;

      const email = `${unique('badworkspace')}@example.com`;
      const res = await request(app)
        .post('/api/auth/signup?workspace=totally-nonexistent-slug-xyz')
        .send({ name: 'Test', email, password: 'Password123!' });

      expect(res.status).toBe(404);
      const created = await User.findOne({ email: email.toLowerCase() });
      expect(created).toBeNull();
    });

    it('signup with NO ?workspace= param at all still uses the default-agency bridge (unaffected - only an explicit bad slug is rejected)', async () => {
      const defaultAgency = await createAgency();
      process.env.DEFAULT_AGENCY_SLUG = defaultAgency.slug;

      const email = `${unique('noworkspaceslug')}@example.com`;
      const res = await request(app).post('/api/auth/signup').send({ name: 'Test', email, password: 'Password123!' });

      expect(res.status).toBe(201);
      expect(res.body.user.agencyId).toBe(defaultAgency._id.toString());
    });

    it('signup with a VALID explicit workspace slug still succeeds under that real agency (regression, unaffected)', async () => {
      const email = `${unique('validworkspace')}@example.com`;
      const res = await request(app)
        .post(`/api/auth/signup?workspace=${agency.slug}`)
        .send({ name: 'Test', email, password: 'Password123!' });
      expect(res.status).toBe(201);
      expect(res.body.user.agencyId).toBe(agency._id.toString());
    });
  });

  // BUG-001 regression: login reached with no ?workspace= param at all
  // (e.g. the real Navbar/Footer/agency-profile links, none of which carry
  // one - see resolveTenant.js's allowDefaultFallback and auth.routes.js's
  // /login route) used to silently fall back to DEFAULT_AGENCY_SLUG and
  // search the WRONG agency's users, reporting a 100%-correct password as
  // "Invalid email or password". testEnv.js deliberately never sets
  // DEFAULT_AGENCY_SLUG, so every request below that omits ?workspace=
  // exercises exactly the "nothing resolved" path the real bug hit.
  describe('login without an explicit workspace (BUG-001 regression)', () => {
    it('resolves the correct agency by identity when the email is unambiguous', async () => {
      const email = `${unique('noworkspace')}@example.com`;
      const signupRes = await request(app)
        .post(`/api/auth/signup?workspace=${agency.slug}`)
        .send({ name: 'No Workspace User', email, password: 'Password123!' });
      expect(signupRes.status).toBe(201);

      const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.accessToken).toEqual(expect.any(String));
      expect(loginRes.body.user.agencyId).toBe(agency._id.toString());
    });

    it('still rejects a wrong password with the same generic message', async () => {
      const email = `${unique('noworkspace-wrongpw')}@example.com`;
      await request(app).post(`/api/auth/signup?workspace=${agency.slug}`).send({ name: 'Test', email, password: 'Password123!' });

      const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPassword1!' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('still rejects a nonexistent email with the same generic message (no account-existence leak)', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'truly-nobody-qa@example.com', password: 'WrongPassword1!' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('an explicit ?workspace= login is completely unaffected', async () => {
      const email = `${unique('explicit-workspace')}@example.com`;
      await request(app).post(`/api/auth/signup?workspace=${agency.slug}`).send({ name: 'Test', email, password: 'Password123!' });
      const res = await request(app).post(`/api/auth/login?workspace=${agency.slug}`).send({ email, password: 'Password123!' });
      expect(res.status).toBe(200);
      expect(res.body.user.agencyId).toBe(agency._id.toString());
    });

    it('returns a clear 409 instead of guessing when the same email exists in two different agencies, and each still logs in correctly with its own workspace', async () => {
      const otherAgency = await createAgency();
      const email = `${unique('ambiguous')}@example.com`;
      await request(app).post(`/api/auth/signup?workspace=${agency.slug}`).send({ name: 'Test A', email, password: 'PasswordA1!' });
      await request(app).post(`/api/auth/signup?workspace=${otherAgency.slug}`).send({ name: 'Test B', email, password: 'PasswordB1!' });

      const noWorkspace = await request(app).post('/api/auth/login').send({ email, password: 'PasswordA1!' });
      expect(noWorkspace.status).toBe(409);

      const withWorkspaceA = await request(app).post(`/api/auth/login?workspace=${agency.slug}`).send({ email, password: 'PasswordA1!' });
      expect(withWorkspaceA.status).toBe(200);
      expect(withWorkspaceA.body.user.agencyId).toBe(agency._id.toString());

      const withWorkspaceB = await request(app).post(`/api/auth/login?workspace=${otherAgency.slug}`).send({ email, password: 'PasswordB1!' });
      expect(withWorkspaceB.status).toBe(200);
      expect(withWorkspaceB.body.user.agencyId).toBe(otherAgency._id.toString());
    });

    it("a pending agency's owner gets the pending-approval message (not a false 'invalid password') - proves the password WAS verified before the tenant-status gate ran", async () => {
      const { createRoleUser } = require('../helpers/factories');
      const pendingAgency = await createAgency({ status: 'pending' });
      const email = `${unique('pending-owner')}@example.com`;
      await createRoleUser(pendingAgency._id, 'agency_admin', { email, password: 'Password123!' });

      const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Your agency registration is still pending admin approval. Please check back soon.');
    });

    it('a different agency cannot authenticate using another agency\'s credentials, with or without a workspace param', async () => {
      const otherAgency = await createAgency();
      const email = `${unique('crosstenant')}@example.com`;
      await request(app).post(`/api/auth/signup?workspace=${agency.slug}`).send({ name: 'Test', email, password: 'Password123!' });

      const wrongWorkspace = await request(app).post(`/api/auth/login?workspace=${otherAgency.slug}`).send({ email, password: 'Password123!' });
      expect(wrongWorkspace.status).toBe(401);
      expect(wrongWorkspace.body.message).toBe('Invalid email or password');
    });
  });

  // FIND-01 regression: resolveTenant() used to 403 "This workspace has
  // been suspended" the instant ?workspace= resolved to a suspended agency
  // - before /login ever checked a password. That let anyone probe whether
  // an arbitrary workspace slug was suspended with zero valid credentials.
  // auth.service.js's login() already has the correct pattern (agency
  // status checked only after bcrypt.compare succeeds) - these tests prove
  // that's the code path that actually runs now, and that suspended-
  // blocking is unchanged everywhere else.
  describe('suspended-agency login (FIND-01 regression)', () => {
    it('fake credentials against a suspended workspace get the generic invalid-credentials message, never a suspended-specific one', async () => {
      const suspendedAgency = await createAgency({ status: 'suspended' });
      const res = await request(app)
        .post(`/api/auth/login?workspace=${suspendedAgency.slug}`)
        .send({ email: 'no-such-user@example.com', password: 'WhateverPassword1!' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('a wrong password against a real account in a suspended workspace still gets the generic message, not the suspended one', async () => {
      const suspendedAgency = await createAgency({ status: 'suspended' });
      const email = `${unique('suspended-wrongpw')}@example.com`;
      await createRoleUser(suspendedAgency._id, 'agency_admin', { email, password: 'Password123!' });

      const res = await request(app)
        .post(`/api/auth/login?workspace=${suspendedAgency.slug}`)
        .send({ email, password: 'WrongPassword1!' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('correct credentials against a suspended workspace get the suspended message only after the password is verified', async () => {
      const suspendedAgency = await createAgency({ status: 'suspended' });
      const email = `${unique('suspended-correctpw')}@example.com`;
      await createRoleUser(suspendedAgency._id, 'agency_admin', { email, password: 'Password123!' });

      const res = await request(app)
        .post(`/api/auth/login?workspace=${suspendedAgency.slug}`)
        .send({ email, password: 'Password123!' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('This workspace has been suspended.');
    });

    it('correct credentials against a pending workspace still get the pending message (regression, unaffected by the suspended-check change)', async () => {
      const pendingAgency = await createAgency({ status: 'pending' });
      const email = `${unique('pending-correctpw')}@example.com`;
      await createRoleUser(pendingAgency._id, 'agency_admin', { email, password: 'Password123!' });

      const res = await request(app)
        .post(`/api/auth/login?workspace=${pendingAgency.slug}`)
        .send({ email, password: 'Password123!' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Your agency registration is still pending admin approval. Please check back soon.');
    });

    it('correct credentials against a normal active workspace still log in successfully (regression, unaffected)', async () => {
      const email = `${unique('active-normal')}@example.com`;
      await request(app).post(`/api/auth/signup?workspace=${agency.slug}`).send({ name: 'Test', email, password: 'Password123!' });

      const res = await request(app).post(`/api/auth/login?workspace=${agency.slug}`).send({ email, password: 'Password123!' });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('an already-authenticated user of a since-suspended agency is still blocked immediately on other tenant-scoped routes (suspended-blocking NOT weakened elsewhere)', async () => {
      const suspendedAgency = await createAgency({ status: 'active' });
      const { accessToken } = await createRoleUser(suspendedAgency._id, 'agent', { password: 'Password123!' });

      // Suspend AFTER minting the token, mirroring a real admin suspending
      // an agency mid-session.
      suspendedAgency.status = 'suspended';
      await suspendedAgency.save();

      const res = await request(app)
        .get('/api/properties/mine')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('This workspace has been suspended');
    });
  });

  describe('refresh token rotation and reuse detection', () => {
    async function freshSession() {
      const email = `${unique('rot')}@example.com`;
      const res = await request(app).post(`/api/auth/signup?workspace=${agency.slug}`).send({ name: 'Test User', email, password: 'Password123!' });
      if (res.status !== 201) throw new Error(`freshSession signup failed: ${res.status} ${JSON.stringify(res.body)}`);
      return res.body;
    }

    it('rotates: the old refresh token stops working, the new one works', async () => {
      const { refreshToken } = await freshSession();
      const rotated = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(rotated.status).toBe(200);
      expect(rotated.body.refreshToken).not.toBe(refreshToken);

      const reuseOld = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(reuseOld.status).toBe(401);
    });

    it('reusing an already-rotated token revokes the entire token family', async () => {
      const { refreshToken } = await freshSession();
      const rotated = await request(app).post('/api/auth/refresh').send({ refreshToken });
      const newToken = rotated.body.refreshToken;

      // Replay the original (already-consumed) token - triggers family revocation.
      await request(app).post('/api/auth/refresh').send({ refreshToken });

      // The token that rotation legitimately issued should ALSO now be dead.
      const attemptWithRotatedToken = await request(app).post('/api/auth/refresh').send({ refreshToken: newToken });
      expect(attemptWithRotatedToken.status).toBe(401);
    });

    it('logout revokes the refresh token', async () => {
      const { refreshToken } = await freshSession();
      const logout = await request(app).post('/api/auth/logout').send({ refreshToken });
      expect(logout.status).toBe(204);

      const attempt = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(attempt.status).toBe(401);
    });

    it('rejects an unknown/garbage refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'not-a-real-token' });
      expect(res.status).toBe(401);
    });
  });

  describe('access token behavior', () => {
    it('rejects requests with no token', async () => {
      const res = await request(app).get('/api/properties/mine');
      expect(res.status).toBe(401);
    });

    it('rejects a token signed with the wrong secret (forgery)', async () => {
      const jwt = require('jsonwebtoken');
      const forged = jwt.sign({ id: 'x', role: 'agent', agencyId: agency._id.toString() }, 'wrong-secret', { expiresIn: '15m' });
      const res = await request(app).get('/api/properties/mine').set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(401);
    });
  });
});
