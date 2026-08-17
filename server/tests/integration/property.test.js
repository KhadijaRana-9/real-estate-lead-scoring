const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');

const app = buildTestApp();

const validProperty = {
  title: 'Modern Family House',
  description: 'A lovely place',
  price: 5000000,
  city: 'Lahore',
  area: 5,
  type: 'house',
  bedrooms: 3,
  bathrooms: 2,
  images: ['https://images.example.com/a.jpg'],
};

describe('Property CRUD', () => {
  let agency;
  let agentA;
  let agentB;
  let agencyAdmin;

  beforeAll(async () => {
    agency = await createAgency();
    agentA = await signupUser(app, agency.slug, { role: 'agent' });
    agentB = await signupUser(app, agency.slug, { role: 'agent' });
    agencyAdmin = await signupUser(app, agency.slug, { role: 'agency_admin' });
  });

  function authHeader(session) {
    return { Authorization: `Bearer ${session.accessToken}` };
  }

  describe('create', () => {
    it('rejects unauthenticated create', async () => {
      const res = await request(app).post('/api/properties').send(validProperty);
      expect(res.status).toBe(401);
    });

    it('rejects create with invalid data (negative price, bad type enum)', async () => {
      const res = await request(app)
        .post('/api/properties')
        .set(authHeader(agentA))
        .send({ ...validProperty, price: -100, type: 'castle' });
      expect(res.status).toBe(400);
    });

    it('creates a property owned by the authenticated agent', async () => {
      const res = await request(app).post('/api/properties').set(authHeader(agentA)).send(validProperty);
      expect(res.status).toBe(201);
      expect(res.body.agent).toBe(agentA.user.id);
      expect(res.body.agencyId).toBe(agency._id.toString());
      expect(res.body.status).toBe('available');
      expect(res.body.views).toBe(0);
    });

    it('mass-assignment: forged privileged fields are silently dropped, not applied', async () => {
      const res = await request(app)
        .post('/api/properties')
        .set(authHeader(agentA))
        .send({
          ...validProperty,
          status: 'sold',
          views: 999999,
          agent: agentB.user.id,
          agencyId: 'attacker-controlled',
          role: 'admin',
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('available');
      expect(res.body.views).toBe(0);
      expect(res.body.agent).toBe(agentA.user.id);
      expect(res.body.agencyId).toBe(agency._id.toString());
    });
  });

  describe('read', () => {
    it('public listing only returns available properties for the resolved tenant', async () => {
      await request(app).post('/api/properties').set(authHeader(agentA)).send(validProperty);
      const res = await request(app).get(`/api/properties?workspace=${agency.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items.every((p) => p.status === 'available')).toBe(true);
    });

    it('fetching a single property increments its view count', async () => {
      const created = await request(app).post('/api/properties').set(authHeader(agentA)).send(validProperty);
      const id = created.body._id;
      const first = await request(app).get(`/api/properties/${id}?workspace=${agency.slug}`);
      const second = await request(app).get(`/api/properties/${id}?workspace=${agency.slug}`);
      expect(second.body.views).toBe(first.body.views + 1);
    });

    it('returns 400 (not a 500 crash) for a malformed id', async () => {
      const res = await request(app).get(`/api/properties/not-a-valid-id?workspace=${agency.slug}`);
      expect(res.status).toBe(400);
    });

    it('returns 404 for a well-formed but nonexistent id', async () => {
      const res = await request(app).get(`/api/properties/507f1f77bcf86cd799439011?workspace=${agency.slug}`);
      expect(res.status).toBe(404);
    });

    it('/mine returns only the authenticated agent\'s own listings', async () => {
      const created = await request(app).post('/api/properties').set(authHeader(agentB)).send(validProperty);
      const mineA = await request(app).get('/api/properties/mine').set(authHeader(agentA));
      const mineB = await request(app).get('/api/properties/mine').set(authHeader(agentB));
      expect(mineA.body.some((p) => p._id === created.body._id)).toBe(false);
      expect(mineB.body.some((p) => p._id === created.body._id)).toBe(true);
    });
  });

  describe('update', () => {
    it('owner can update their own listing', async () => {
      const created = await request(app).post('/api/properties').set(authHeader(agentA)).send(validProperty);
      const res = await request(app)
        .put(`/api/properties/${created.body._id}`)
        .set(authHeader(agentA))
        .send({ title: 'Updated Title' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
    });

    it('a different agent in the SAME agency cannot update someone else\'s listing', async () => {
      const created = await request(app).post('/api/properties').set(authHeader(agentA)).send(validProperty);
      const res = await request(app)
        .put(`/api/properties/${created.body._id}`)
        .set(authHeader(agentB))
        .send({ title: 'Hijacked' });
      expect(res.status).toBe(403);
    });

    it('agency_admin bypasses ownership and can update any agent\'s listing in their agency', async () => {
      const created = await request(app).post('/api/properties').set(authHeader(agentA)).send(validProperty);
      const res = await request(app)
        .put(`/api/properties/${created.body._id}`)
        .set(authHeader(agencyAdmin))
        .send({ title: 'Updated by admin' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated by admin');
    });

    it('mass-assignment on update: privileged fields cannot be forged', async () => {
      const created = await request(app).post('/api/properties').set(authHeader(agentA)).send(validProperty);
      const res = await request(app)
        .put(`/api/properties/${created.body._id}`)
        .set(authHeader(agentA))
        .send({ title: 'Legit Title Change', status: 'sold', views: 12345, agent: agentB.user.id });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Legit Title Change');
      expect(res.body.status).toBe('available');
      expect(res.body.views).toBe(0);
      expect(res.body.agent).toBe(agentA.user.id);
    });

    it('rejects an update with an empty body', async () => {
      const created = await request(app).post('/api/properties').set(authHeader(agentA)).send(validProperty);
      const res = await request(app).put(`/api/properties/${created.body._id}`).set(authHeader(agentA)).send({});
      expect(res.status).toBe(400);
    });
  });

  describe('delete', () => {
    it('a different agent cannot delete someone else\'s listing', async () => {
      const created = await request(app).post('/api/properties').set(authHeader(agentA)).send(validProperty);
      const res = await request(app).delete(`/api/properties/${created.body._id}`).set(authHeader(agentB));
      expect(res.status).toBe(403);
    });

    it('agency_admin bypasses ownership and can delete any agent\'s listing in their agency', async () => {
      const created = await request(app).post('/api/properties').set(authHeader(agentA)).send(validProperty);
      const res = await request(app).delete(`/api/properties/${created.body._id}`).set(authHeader(agencyAdmin));
      expect(res.status).toBe(204);
      const getRes = await request(app).get(`/api/properties/${created.body._id}?workspace=${agency.slug}`);
      expect(getRes.status).toBe(404);
    });

    it('owner can delete their own listing', async () => {
      const created = await request(app).post('/api/properties').set(authHeader(agentA)).send(validProperty);
      const res = await request(app).delete(`/api/properties/${created.body._id}`).set(authHeader(agentA));
      expect(res.status).toBe(204);

      const fetchAfterDelete = await request(app).get(`/api/properties/${created.body._id}?workspace=${agency.slug}`);
      expect(fetchAfterDelete.status).toBe(404);
    });
  });

  describe('publish (the wizard\'s Step 7 action)', () => {
    it('a complete draft publishes successfully: status flips to available, publishedAt is set, and it becomes publicly visible', async () => {
      const draft = await request(app).post('/api/properties/drafts').set(authHeader(agentA)).send(validProperty);
      expect(draft.body.status).toBe('draft');

      const res = await request(app).patch(`/api/properties/${draft.body._id}/publish`).set(authHeader(agentA));
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('available');
      expect(res.body.publishedAt).toBeTruthy();

      const publicView = await request(app).get(`/api/properties/${draft.body._id}?workspace=${agency.slug}`);
      expect(publicView.status).toBe(200);

      const listing = await request(app).get(`/api/properties?workspace=${agency.slug}`);
      expect(listing.body.items.some((p) => p._id === draft.body._id)).toBe(true);
    });

    it('rejects publishing a draft missing required fields, reports exactly which ones, and leaves it a draft', async () => {
      const draft = await request(app)
        .post('/api/properties/drafts')
        .set(authHeader(agentA))
        .send({ title: 'Incomplete Listing' });
      expect(draft.body.status).toBe('draft');

      const res = await request(app).patch(`/api/properties/${draft.body._id}/publish`).set(authHeader(agentA));
      expect(res.status).toBe(400);
      expect(res.body.missing).toEqual(expect.arrayContaining(['city', 'price', 'area']));

      // Still a draft - never leaked to the public browse/detail routes.
      const publicView = await request(app).get(`/api/properties/${draft.body._id}?workspace=${agency.slug}`);
      expect(publicView.status).toBe(404);
      const listing = await request(app).get(`/api/properties?workspace=${agency.slug}`);
      expect(listing.body.items.some((p) => p._id === draft.body._id)).toBe(false);
    });

    it('a different agent cannot publish someone else\'s draft', async () => {
      const draft = await request(app).post('/api/properties/drafts').set(authHeader(agentA)).send(validProperty);
      const res = await request(app).patch(`/api/properties/${draft.body._id}/publish`).set(authHeader(agentB));
      expect(res.status).toBe(403);
    });

    it('agency_admin can publish any agent\'s draft in their agency', async () => {
      const draft = await request(app).post('/api/properties/drafts').set(authHeader(agentA)).send(validProperty);
      const res = await request(app).patch(`/api/properties/${draft.body._id}/publish`).set(authHeader(agencyAdmin));
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('available');
    });

    it('editing an already-published listing does not unpublish it, and it can be published again (idempotent re-publish)', async () => {
      const draft = await request(app).post('/api/properties/drafts').set(authHeader(agentA)).send(validProperty);
      await request(app).patch(`/api/properties/${draft.body._id}/publish`).set(authHeader(agentA));

      const edited = await request(app)
        .put(`/api/properties/${draft.body._id}`)
        .set(authHeader(agentA))
        .send({ price: 7000000 });
      expect(edited.status).toBe(200);
      expect(edited.body.status).toBe('available');
      expect(edited.body.price).toBe(7000000);

      const republish = await request(app).patch(`/api/properties/${draft.body._id}/publish`).set(authHeader(agentA));
      expect(republish.status).toBe(200);
      expect(republish.body.status).toBe('available');
    });
  });
});
