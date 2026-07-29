const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, unique } = require('../helpers/factories');

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
    it('signs up an agent and returns access + refresh tokens', async () => {
      const email = `${unique('agent')}@example.com`;
      const res = await request(app)
        .post(`/api/auth/signup?workspace=${agency.slug}`)
        .send({ name: 'New Agent', email, password: 'Password123!', role: 'agent' });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email, role: 'agent', agencyId: agency._id.toString() });
      expect(res.body.user.passwordHash).toBeUndefined();
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
      // Zod schema only allows agent/customer at the HTTP boundary.
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

  describe('refresh token rotation and reuse detection', () => {
    async function freshSession() {
      const email = `${unique('rot')}@example.com`;
      const res = await request(app).post(`/api/auth/signup?workspace=${agency.slug}`).send({ name: 'Test User', email, password: 'Password123!', role: 'agent' });
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
