const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');
const { createFakeLlmServer, textResponse, toolCallResponse } = require('../helpers/fakeLlmServer');

const app = buildTestApp();

async function chat(token, message, conversationId = null) {
  return request(app)
    .post('/api/ai/chat')
    .set({ Authorization: `Bearer ${token}` })
    .send({ message, conversationId });
}

describe('AI NLU expansion - deterministic coverage (Pre-Phase 7)', () => {
  let tenant;
  let agent;

  beforeAll(async () => {
    tenant = await createAgency();
    agent = await signupUser(app, tenant.slug, { role: 'agent' });

    // A real, varied set of properties so range/bedroom filters have
    // something meaningful to prove against, not just an empty result.
    const properties = [
      { title: 'Budget House', price: 30000000, city: 'Lahore', area: 5, type: 'house', bedrooms: 2, bathrooms: 1 },
      { title: 'Mid Range House', price: 50000000, city: 'Lahore', area: 6, type: 'house', bedrooms: 4, bathrooms: 3 },
      { title: 'Premium House', price: 90000000, city: 'Lahore', area: 8, type: 'house', bedrooms: 6, bathrooms: 5, featured: true },
      { title: 'Small Flat', price: 15000000, city: 'Lahore', area: 3, type: 'flat', bedrooms: 1, bathrooms: 1 },
    ];
    for (const p of properties) {
      // eslint-disable-next-line no-await-in-loop
      await request(app).post(`/api/properties?workspace=${tenant.slug}`).set({ Authorization: `Bearer ${agent.accessToken}` }).send(p);
    }
  });

  describe('price range / proximity phrasing resolves deterministically with correct real results', () => {
    it('"properties between 3 crore and 6 crore" returns only the properties in that real price band', async () => {
      const res = await chat(agent.accessToken, 'properties between 3 crore and 6 crore');
      expect(res.status).toBe(200);
      const titles = res.body.attachments[0].data.properties.map((p) => p.title);
      expect(titles).toEqual(expect.arrayContaining(['Mid Range House']));
      expect(titles).not.toContain('Premium House'); // 9 crore, above the range
      expect(titles).not.toContain('Small Flat'); // 1.5 crore, below the range
    });

    it('"houses from 2 crore to 4 crore" (a different connector) resolves the same way', async () => {
      const res = await chat(agent.accessToken, 'houses from 2 crore to 4 crore');
      expect(res.status).toBe(200);
      const titles = res.body.attachments[0].data.properties.map((p) => p.title);
      expect(titles).toContain('Budget House'); // 3 crore
      expect(titles).not.toContain('Premium House');
    });

    it('"homes around 5 crore" resolves to a real proximity band, not an exact match only', async () => {
      const res = await chat(agent.accessToken, 'homes around 5 crore');
      expect(res.status).toBe(200);
      const titles = res.body.attachments[0].data.properties.map((p) => p.title);
      expect(titles).toContain('Mid Range House'); // exactly 5 crore
    });
  });

  describe('bedroom synonym phrasing resolves deterministically with correct real results', () => {
    it('"minimum 4 bedrooms" only returns properties meeting that real floor', async () => {
      const res = await chat(agent.accessToken, 'minimum 4 bedrooms');
      expect(res.status).toBe(200);
      const props = res.body.attachments[0].data.properties;
      expect(props.every((p) => p.bedrooms >= 4)).toBe(true);
      expect(props.some((p) => p.title === 'Mid Range House')).toBe(true);
      expect(props.some((p) => p.title === 'Small Flat')).toBe(false);
    });

    it('"at least 4 bedrooms" (a different synonym) resolves the same real way', async () => {
      const res = await chat(agent.accessToken, 'at least 4 bedrooms');
      const props = res.body.attachments[0].data.properties;
      expect(props.every((p) => p.bedrooms >= 4)).toBe(true);
    });
  });

  it('an unsupported filter (bedroom upper bound) is stated honestly, not silently dropped - real search still runs', async () => {
    const res = await chat(agent.accessToken, 'houses with less than 3 bedrooms');
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/couldn't apply.*fewer than 3 bedrooms.*isn't currently supported/i);
    // The search itself still ran for real - not a refusal, not an error.
    expect(res.body.attachments).toHaveLength(1);
    expect(res.body.attachments[0].tool).toBe('search_properties');
  });

  describe('analytics synonym phrasing resolves deterministically to the real analytics tool', () => {
    it.each(['cheapest properties', 'most expensive houses', 'newest listings', 'top viewed properties'])('"%s" routes to get_property_analytics with real data', async (message) => {
      const res = await chat(agent.accessToken, message);
      expect(res.status).toBe(200);
      expect(res.body.attachments[0].tool).toBe('get_property_analytics');
      expect(res.body.attachments[0].data.totalAvailable).toBeGreaterThan(0);
    });
  });

  it('no regression: a plain existing search phrase still works exactly as before', async () => {
    const res = await chat(agent.accessToken, 'houses in Lahore');
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/^Found \d+ propert/);
    expect(res.body.attachments[0].tool).toBe('search_properties');
  });
});

describe('AI NLU expansion - LLM escalation preserved for genuinely out-of-coverage queries', () => {
  let fakeLlm;
  let tenant;
  let agent;

  beforeAll(async () => {
    fakeLlm = createFakeLlmServer();
    const url = await fakeLlm.start();
    process.env.LLM_BASE_URL = url;
    process.env.LLM_API_KEY = 'fake-test-key';
    process.env.LLM_MODEL = 'fake-model';

    tenant = await createAgency();
    agent = await signupUser(app, tenant.slug, { role: 'agent' });
  });

  afterAll(async () => {
    await fakeLlm.close();
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
  });

  afterEach(() => {
    fakeLlm.reset();
  });

  it('a business-reasoning query ("today\'s priorities") still escalates to the LLM, unaffected by the new deterministic coverage', async () => {
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'get_lead_pipeline', arguments: {} }]), textResponse('Here are your priorities today.'));
    const res = await chat(agent.accessToken, "today's priorities");
    expect(fakeLlm.requests.length).toBeGreaterThan(0);
    expect(res.body.reply).toBe('Here are your priorities today.');
  });

  it('a bare area-range query resolves deterministically and now applies a real area filter, rather than escalating', async () => {
    const res = await chat(agent.accessToken, 'between 5 and 10 marla');
    expect(fakeLlm.requests).toHaveLength(0); // resolved on the fast path, never reached the LLM
    expect(res.body.reply).toMatch(/found|didn't find/i);
    expect(res.body.reply).not.toMatch(/isn't currently supported/i);
    expect(res.body.attachments[0]?.tool).toBe('search_properties');
  });
});
