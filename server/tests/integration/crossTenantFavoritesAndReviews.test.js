// Regression test for a real bug found during a live QA pass: the public
// marketplace (Listings.jsx, GET /api/properties with no auth) is
// explicitly cross-tenant - any visitor sees the same resolved
// host/workspace/default agency's properties regardless of which agency
// their own account belongs to. But POST/DELETE /:id/favorite and
// POST/DELETE /:id/reviews are auth-gated, and resolveTenant() prioritizes
// the caller's OWN agencyId (from their JWT) over the tenant they were
// actually browsing. A customer whose account belongs to Agency B,
// favoriting/reviewing a property that belongs to Agency A (which is
// exactly what happens browsing the public marketplace under an
// unrelated login), got a hard 404 "Property not found" - even though
// the property genuinely exists and they were just looking straight at
// it. See favorite.service.js/propertyReview.service.js for the fix:
// both now resolve the acted-on property's own real agency instead of
// trusting the caller's tenant.
const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');

const app = buildTestApp();

describe('Cross-tenant favorites and reviews (marketplace customer, different login agency)', () => {
  let agencyA;
  let agencyB;
  let agentA;
  let customerB;
  let propertyA;

  beforeAll(async () => {
    agencyA = await createAgency();
    agencyB = await createAgency();
    agentA = await signupUser(app, agencyA.slug, { role: 'agent' });
    // customerB's own account belongs to Agency B, not Agency A - but
    // they're about to act on one of Agency A's properties, exactly as
    // they would after browsing the public marketplace.
    customerB = await signupUser(app, agencyB.slug, { role: 'customer' });

    const res = await request(app)
      .post(`/api/properties?workspace=${agencyA.slug}`)
      .set({ Authorization: `Bearer ${agentA.accessToken}` })
      .send({ title: 'Marketplace House', price: 9000000, city: 'Lahore', area: 8, type: 'house', bedrooms: 3, bathrooms: 2 });
    propertyA = res.body;
    await request(app)
      .patch(`/api/properties/${propertyA._id}/publish?workspace=${agencyA.slug}`)
      .set({ Authorization: `Bearer ${agentA.accessToken}` });
  });

  it('a customer can favorite a property that belongs to a different agency than their own account', async () => {
    const add = await request(app)
      .post(`/api/properties/${propertyA._id}/favorite`)
      .set({ Authorization: `Bearer ${customerB.accessToken}` });

    expect(add.status).toBe(201);
    expect(add.body.favorited).toBe(true);
  });

  it('that cross-tenant favorite shows up in "my favorites"', async () => {
    await request(app)
      .post(`/api/properties/${propertyA._id}/favorite`)
      .set({ Authorization: `Bearer ${customerB.accessToken}` });

    const mine = await request(app)
      .get('/api/properties/favorites/mine')
      .set({ Authorization: `Bearer ${customerB.accessToken}` });

    expect(mine.status).toBe(200);
    expect(mine.body.properties.some((p) => p._id === propertyA._id)).toBe(true);
  });

  it('a customer can remove a cross-tenant favorite', async () => {
    await request(app)
      .post(`/api/properties/${propertyA._id}/favorite`)
      .set({ Authorization: `Bearer ${customerB.accessToken}` });

    const remove = await request(app)
      .delete(`/api/properties/${propertyA._id}/favorite`)
      .set({ Authorization: `Bearer ${customerB.accessToken}` });
    expect(remove.status).toBe(200);
    expect(remove.body.favorited).toBe(false);

    const mine = await request(app)
      .get('/api/properties/favorites/mine')
      .set({ Authorization: `Bearer ${customerB.accessToken}` });
    expect(mine.body.properties.some((p) => p._id === propertyA._id)).toBe(false);
  });

  it('a customer can submit a review on a property that belongs to a different agency than their own account', async () => {
    const review = await request(app)
      .post(`/api/properties/${propertyA._id}/reviews`)
      .set({ Authorization: `Bearer ${customerB.accessToken}` })
      .send({ rating: 5, comment: 'Great place, wrong tenant, worked anyway.' });

    expect(review.status).toBe(201);
    expect(review.body.rating).toBe(5);

    const listed = await request(app).get(`/api/properties/${propertyA._id}/reviews?workspace=${agencyA.slug}`);
    expect(listed.status).toBe(200);
    expect(listed.body.items.some((r) => r._id === review.body._id)).toBe(true);
  });

  it('a customer can delete their own cross-tenant review', async () => {
    await request(app)
      .post(`/api/properties/${propertyA._id}/reviews`)
      .set({ Authorization: `Bearer ${customerB.accessToken}` })
      .send({ rating: 4, comment: 'Updating my review.' });

    const del = await request(app)
      .delete(`/api/properties/${propertyA._id}/reviews`)
      .set({ Authorization: `Bearer ${customerB.accessToken}` });
    expect(del.status).toBe(204);

    const listed = await request(app).get(`/api/properties/${propertyA._id}/reviews?workspace=${agencyA.slug}`);
    expect(listed.body.items.some((r) => r.author.id === customerB.user.id)).toBe(false);
  });
});
