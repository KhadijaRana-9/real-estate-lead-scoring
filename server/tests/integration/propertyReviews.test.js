const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');

const app = buildTestApp();

async function createProperty(agent, tenant, overrides = {}) {
  const res = await request(app)
    .post(`/api/properties?workspace=${tenant.slug}`)
    .set({ Authorization: `Bearer ${agent.accessToken}` })
    .send({ title: 'Review Test House', price: 6000000, city: 'Lahore', area: 5, type: 'house', bedrooms: 3, bathrooms: 2, ...overrides });
  return res.body;
}

describe('Property ratings & reviews', () => {
  let tenant;
  let agent;
  let customer;
  let property;

  beforeAll(async () => {
    tenant = await createAgency();
    agent = await signupUser(app, tenant.slug, { role: 'agent' });
    customer = await signupUser(app, tenant.slug, { role: 'customer' });
    property = await createProperty(agent, tenant);
  });

  it('a customer can submit a real, persisted review', async () => {
    const res = await request(app)
      .post(`/api/properties/${property._id}/reviews?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${customer.accessToken}` })
      .send({ rating: 5, comment: 'Loved it' });

    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
    expect(res.body.author.name).toBe(customer.user.name);
  });

  it('getPropertyById returns the real, aggregated rating summary, not a fabricated number', async () => {
    const res = await request(app).get(`/api/properties/${property._id}?workspace=${tenant.slug}`);
    expect(res.body.rating).toEqual({ average: 5, count: 1 });
  });

  it('resubmitting a review updates the existing one (upsert), not a duplicate', async () => {
    await request(app)
      .post(`/api/properties/${property._id}/reviews?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${customer.accessToken}` })
      .send({ rating: 3, comment: 'Actually just okay' });

    const list = await request(app).get(`/api/properties/${property._id}/reviews?workspace=${tenant.slug}`);
    expect(list.body.pagination.total).toBe(1);
    expect(list.body.items[0].rating).toBe(3);
    expect(list.body.items[0].comment).toBe('Actually just okay');
  });

  it('verifiedInquiry is only true when the reviewer really submitted an inquiry for this exact property', async () => {
    const propB = await createProperty(agent, tenant, { title: 'Unverified Review House' });
    const res = await request(app)
      .post(`/api/properties/${propB._id}/reviews?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${customer.accessToken}` })
      .send({ rating: 4 });
    expect(res.body.verifiedInquiry).toBe(false);

    await request(app)
      .post(`/api/inquiries?workspace=${tenant.slug}`)
      .send({ propertyId: propB._id, name: customer.user.name, email: customer.user.email, budget: 6000000, moveTimeline: 'immediate' });

    const verified = await request(app)
      .post(`/api/properties/${propB._id}/reviews?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${customer.accessToken}` })
      .send({ rating: 4 });
    expect(verified.body.verifiedInquiry).toBe(true);
  });

  it('only a customer role can submit a property review (RBAC unchanged for agents/admins)', async () => {
    const res = await request(app)
      .post(`/api/properties/${property._id}/reviews?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ rating: 5 });
    expect(res.status).toBe(403);
  });

  it('a customer can delete their own review', async () => {
    const res = await request(app)
      .delete(`/api/properties/${property._id}/reviews?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${customer.accessToken}` });
    expect(res.status).toBe(204);

    const after = await request(app).get(`/api/properties/${property._id}?workspace=${tenant.slug}`);
    expect(after.body.rating).toEqual({ average: 0, count: 0 });
  });

  describe('top-rated / most-reviewed ranking (real aggregation, minimum sample size)', () => {
    let lowSampleProp;
    let wellReviewedProp;

    beforeAll(async () => {
      lowSampleProp = await createProperty(agent, tenant, { title: 'One Great Review House' });
      wellReviewedProp = await createProperty(agent, tenant, { title: 'Consistently Rated House' });

      // One single 5-star review - must NOT count as "top rated" (below
      // MIN_REVIEW_SAMPLE_SIZE) even though its average is perfect.
      await request(app)
        .post(`/api/properties/${lowSampleProp._id}/reviews?workspace=${tenant.slug}`)
        .set({ Authorization: `Bearer ${customer.accessToken}` })
        .send({ rating: 5 });

      // Three real reviewers, real average - meets the sample-size floor.
      const reviewers = await Promise.all([1, 2, 3].map((n) => signupUser(app, tenant.slug, { role: 'customer', name: `Reviewer ${n}` })));
      for (const reviewer of reviewers) {
        // eslint-disable-next-line no-await-in-loop
        await request(app)
          .post(`/api/properties/${wellReviewedProp._id}/reviews?workspace=${tenant.slug}`)
          .set({ Authorization: `Bearer ${reviewer.accessToken}` })
          .send({ rating: 4 });
      }
    });

    it('a property with only 1 review is excluded from top-rated (statistical distortion guard)', async () => {
      const res = await request(app).get(`/api/properties/top-rated?workspace=${tenant.slug}`);
      expect(res.body.properties.some((p) => p.title === 'One Great Review House')).toBe(false);
    });

    it('a property meeting the real sample-size floor appears in top-rated with its real average', async () => {
      const res = await request(app).get(`/api/properties/top-rated?workspace=${tenant.slug}`);
      const found = res.body.properties.find((p) => p.title === 'Consistently Rated House');
      expect(found).toBeTruthy();
      expect(found.rating).toEqual({ average: 4, count: 3 });
    });

    it('AI: "top rated properties" resolves deterministically and returns the same real data', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set({ Authorization: `Bearer ${agent.accessToken}` })
        .send({ message: 'top rated properties', conversationId: null });

      expect(res.body.attachments[0].tool).toBe('get_property_analytics');
      const titles = res.body.attachments[0].data.topRated.map((p) => p.title);
      expect(titles).toContain('Consistently Rated House');
      expect(titles).not.toContain('One Great Review House');
    });

    it('AI: "most reviewed properties" has no sample-size floor - even a 1-review property can appear', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set({ Authorization: `Bearer ${agent.accessToken}` })
        .send({ message: 'most reviewed properties', conversationId: null });

      expect(res.body.attachments[0].tool).toBe('get_property_analytics');
      const titles = res.body.attachments[0].data.mostReviewed.map((p) => p.title);
      expect(titles).toContain('Consistently Rated House'); // 3 reviews - ranks above the 1-review property
      expect(titles.indexOf('Consistently Rated House')).toBeLessThan(titles.indexOf('One Great Review House'));
    });

    it('a customer can also ask analytics-style rating questions (role broadened for this read-only tool)', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set({ Authorization: `Bearer ${customer.accessToken}` })
        .send({ message: 'highest rated houses', conversationId: null });

      expect(res.body.attachments[0]?.tool).toBe('get_property_analytics');
    });

    it('Agent Dashboard summary includes real topRatedListings, scoped to the agent\'s own properties', async () => {
      const res = await request(app).get('/api/dashboard/summary').set({ Authorization: `Bearer ${agent.accessToken}` });
      const titles = res.body.topRatedListings.map((p) => p.title);
      expect(titles).toContain('Consistently Rated House');
    });
  });
});
