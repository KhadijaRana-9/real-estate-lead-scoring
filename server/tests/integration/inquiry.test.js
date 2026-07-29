const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');

const app = buildTestApp();

const validProperty = {
  title: 'Modern Family House', price: 5000000, city: 'Lahore', area: 5, type: 'house', bedrooms: 3, bathrooms: 2,
};

describe('Inquiry (lead) submission and listing', () => {
  let agency;
  let otherAgency;
  let agent;
  let customer;
  let property;
  let otherAgencyProperty;

  beforeAll(async () => {
    agency = await createAgency();
    otherAgency = await createAgency();
    agent = await signupUser(app, agency.slug, { role: 'agent' });
    customer = await signupUser(app, agency.slug, { role: 'customer' });

    const created = await request(app)
      .post('/api/properties')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send(validProperty);
    property = created.body;

    const otherAgent = await signupUser(app, otherAgency.slug, { role: 'agent' });
    const createdOther = await request(app)
      .post('/api/properties')
      .set({ Authorization: `Bearer ${otherAgent.accessToken}` })
      .send(validProperty);
    otherAgencyProperty = createdOther.body;
  });

  describe('create (public endpoint)', () => {
    it('accepts a valid inquiry and computes a lead score', async () => {
      const res = await request(app)
        .post(`/api/inquiries?workspace=${agency.slug}`)
        .send({
          propertyId: property._id,
          name: 'Interested Buyer',
          email: 'buyer@example.com',
          phone: '03001234567',
          budget: 5000000,
          moveTimeline: 'immediate',
          message: 'Very interested, please call.',
        });

      expect(res.status).toBe(201);
      expect(res.body.score).toBeGreaterThanOrEqual(0);
      expect(res.body.score).toBeLessThanOrEqual(100);
      expect(['hot', 'warm', 'cold']).toContain(res.body.status);
      expect(res.body.agencyId).toBe(agency._id.toString());
    });

    it('rejects invalid input (bad email, bad propertyId, non-positive budget)', async () => {
      const res = await request(app)
        .post(`/api/inquiries?workspace=${agency.slug}`)
        .send({ propertyId: 'not-an-id', name: 'A', email: 'nope', budget: -5 });
      expect(res.status).toBe(400);
    });

    it('404s when the property belongs to a DIFFERENT tenant than the resolved workspace', async () => {
      const res = await request(app)
        .post(`/api/inquiries?workspace=${agency.slug}`)
        .send({ propertyId: otherAgencyProperty._id, name: 'Sneaky Buyer', email: 'sneaky@example.com', budget: 1000000 });
      expect(res.status).toBe(404);
    });

    it('404s for a well-formed but nonexistent propertyId', async () => {
      const res = await request(app)
        .post(`/api/inquiries?workspace=${agency.slug}`)
        .send({ propertyId: '507f1f77bcf86cd799439011', name: 'A Buyer', email: 'a@example.com', budget: 1000000 });
      expect(res.status).toBe(404);
    });
  });

  describe('list leads', () => {
    it('rejects unauthenticated access', async () => {
      const res = await request(app).get('/api/inquiries');
      expect(res.status).toBe(401);
    });

    it('rejects a customer role (not agent/agency_admin)', async () => {
      const res = await request(app).get('/api/inquiries').set({ Authorization: `Bearer ${customer.accessToken}` });
      expect(res.status).toBe(403);
    });

    it('an agent sees leads for their own properties, sorted by score descending', async () => {
      await request(app)
        .post(`/api/inquiries?workspace=${agency.slug}`)
        .send({ propertyId: property._id, name: 'Low Interest', email: 'low@example.com', budget: 100, moveTimeline: 'exploring' });
      await request(app)
        .post(`/api/inquiries?workspace=${agency.slug}`)
        .send({ propertyId: property._id, name: 'High Interest', email: 'high@example.com', budget: property.price, moveTimeline: 'immediate', phone: '0300', message: 'Ready to buy immediately, please call today.' });

      const res = await request(app).get('/api/inquiries').set({ Authorization: `Bearer ${agent.accessToken}` });
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      const scores = res.body.map((i) => i.score);
      const sorted = [...scores].sort((a, b) => b - a);
      expect(scores).toEqual(sorted);
    });

    it('does not leak leads belonging to a different tenant', async () => {
      await request(app)
        .post(`/api/inquiries?workspace=${otherAgency.slug}`)
        .send({ propertyId: otherAgencyProperty._id, name: 'Other Tenant Lead', email: 'other-tenant-lead@example.com', budget: 1000000 });

      const res = await request(app).get('/api/inquiries').set({ Authorization: `Bearer ${agent.accessToken}` });
      expect(res.body.some((i) => i.customer.email === 'other-tenant-lead@example.com')).toBe(false);
    });
  });
});
