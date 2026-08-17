// FIND-04 regression: POST /api/properties/estimate-price previously
// accepted unbounded area/bedrooms/bathrooms (e.g. area: 999999999),
// producing a meaningless estimate instead of a 400. This is a public,
// unauthenticated route (no workspace/tenant needed - it's a pure
// calculator), so no auth/workspace setup is required here.
const request = require('supertest');
const { buildTestApp } = require('../helpers/app');

const app = buildTestApp();

describe('POST /api/properties/estimate-price - input bounds (FIND-04)', () => {
  it('accepts the documented upper boundary values', async () => {
    const res = await request(app)
      .post('/api/properties/estimate-price')
      .send({ city: 'lahore', area: 50000, bedrooms: 50, bathrooms: 50 });
    expect(res.status).toBe(200);
  });

  it('rejects area just above the documented ceiling', async () => {
    const res = await request(app)
      .post('/api/properties/estimate-price')
      .send({ city: 'lahore', area: 50001, bedrooms: 3, bathrooms: 2 });
    expect(res.status).toBe(400);
  });

  it('rejects an absurdly large area outright', async () => {
    const res = await request(app)
      .post('/api/properties/estimate-price')
      .send({ city: 'lahore', area: 999999999, bedrooms: 3, bathrooms: 2 });
    expect(res.status).toBe(400);
  });

  it('rejects bedrooms just above the documented ceiling', async () => {
    const res = await request(app)
      .post('/api/properties/estimate-price')
      .send({ city: 'lahore', area: 5, bedrooms: 51 });
    expect(res.status).toBe(400);
  });

  it('rejects bathrooms just above the documented ceiling', async () => {
    const res = await request(app)
      .post('/api/properties/estimate-price')
      .send({ city: 'lahore', area: 5, bathrooms: 51 });
    expect(res.status).toBe(400);
  });

  it('still rejects the existing negative/zero-area cases (unaffected by the new upper bound)', async () => {
    const negative = await request(app).post('/api/properties/estimate-price').send({ city: 'lahore', area: -5 });
    const zero = await request(app).post('/api/properties/estimate-price').send({ city: 'lahore', area: 0 });
    expect(negative.status).toBe(400);
    expect(zero.status).toBe(400);
  });

  it('produces an unchanged estimate for a normal mid-range input (no calculation regression)', async () => {
    const res = await request(app)
      .post('/api/properties/estimate-price')
      .send({ city: 'lahore', area: 5, bedrooms: 3, bathrooms: 2 });
    expect(res.status).toBe(200);
    expect(res.body.estimate).toBe(2800000 * 5 + 300000 * 3 + 150000 * 2);
    expect(res.body.breakdown.ratePerMarla).toBe(2800000);
  });
});
