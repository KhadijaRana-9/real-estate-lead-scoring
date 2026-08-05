const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');

const app = buildTestApp();

async function chat(token, message, conversationId = null) {
  const res = await request(app)
    .post('/api/ai/chat')
    .set({ Authorization: `Bearer ${token}` })
    .send({ message, conversationId });
  return res.body;
}

describe('AI conversation memory (Phase 2)', () => {
  let tenant, agent;

  beforeAll(async () => {
    tenant = await createAgency();
    agent = await signupUser(app, tenant.slug, { role: 'agent' });
    await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Memory Test House', price: 9000000, city: 'Lahore', area: 6, type: 'house', bedrooms: 3, bathrooms: 2 });
  });

  it('records a real tool execution as a compact summary, not the raw dataset', async () => {
    const r1 = await chat(agent.accessToken, 'houses in Lahore', null);
    const convo = await request(app)
      .get(`/api/ai/conversations/${r1.conversationId}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` });

    expect(convo.body.context.recentToolResults).toBeDefined();
    expect(convo.body.context.recentToolResults.length).toBe(1);
    const entry = convo.body.context.recentToolResults[0];
    expect(entry.tool).toBe('search_properties');
    expect(typeof entry.summary).toBe('string');
    expect(entry.summary.length).toBeLessThan(200); // a summary, not a dump
    expect(Array.isArray(entry.identifiers)).toBe(true);
    expect(convo.body.context.entities.propertyId).toBe(entry.identifiers[0]);
    expect(convo.body.context.lastFilters).toEqual(expect.objectContaining({ city: 'Lahore' }));
  });

  it('bounds recentToolResults to the last 5 entries (FIFO), never growing unboundedly', async () => {
    const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar'];
    // A real property in every city being searched, so each search
    // genuinely returns a distinct non-empty result - otherwise every
    // empty search shares the identical "No matching properties found"
    // summary and FIFO ordering can't be distinguished from the text.
    for (const city of cities) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post(`/api/properties?workspace=${tenant.slug}`)
        .set({ Authorization: `Bearer ${agent.accessToken}` })
        .send({ title: `${city} FIFO Test House`, price: 5000000, city, area: 5, type: 'house', bedrooms: 2, bathrooms: 1 });
    }

    let conversationId = null;
    for (const city of cities) {
      // eslint-disable-next-line no-await-in-loop
      const r = await chat(agent.accessToken, `houses in ${city}`, conversationId);
      conversationId = r.conversationId;
    }

    const convo = await request(app)
      .get(`/api/ai/conversations/${conversationId}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` });

    expect(convo.body.context.recentToolResults.length).toBe(5);
    // Oldest two (Lahore, Karachi) evicted - only the most recent 5 remain.
    const rememberedCities = convo.body.context.recentToolResults.map((e) => e.summary);
    expect(rememberedCities.some((s) => s.includes('Lahore'))).toBe(false);
    expect(rememberedCities.some((s) => s.includes('Multan'))).toBe(true);
    // The full transcript is NOT bounded the same way - every turn is
    // still there (no data loss from the existing transcript system).
    expect(convo.body.messages.length).toBe(cities.length * 2);
  });

  it('turnCount increments once per turn regardless of path (tool call, small talk, or help fallback)', async () => {
    let r = await chat(agent.accessToken, 'hello', null);
    const conversationId = r.conversationId;
    expect(r.attachments).toEqual([]); // small talk - no tool ran

    r = await chat(agent.accessToken, 'houses in Lahore', conversationId);
    r = await chat(agent.accessToken, 'asdkjfh nonsense not matching anything', conversationId);

    const convo = await request(app)
      .get(`/api/ai/conversations/${conversationId}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` });
    expect(convo.body.context.turnCount).toBe(3);
    expect(convo.body.context.needsSummarization).toBe(false);
  });

  it('a conversation with old (Phase 1 only) context shape still works with no migration', async () => {
    const Conversation = require('../../src/features/ai/conversation.model');
    const legacy = await Conversation.create({
      agencyId: tenant._id,
      user: agent.user.id,
      title: 'Legacy conversation',
      messages: [],
      context: { lastCity: 'Karachi', lastTool: 'search_properties' }, // no Phase 2 fields at all
    });

    const r = await chat(agent.accessToken, 'show me more options', legacy._id.toString());
    expect(r.reply).toBeDefined();

    const convo = await request(app)
      .get(`/api/ai/conversations/${legacy._id}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` });
    expect(convo.body.context.turnCount).toBe(1);
    expect(convo.body.context.lastCity).toBe('Karachi'); // old field preserved
    expect(convo.body.context.recentToolResults.length).toBe(1); // new field now populated
  });

  it('multiple simultaneous conversations for the same user stay independent - memory never crosses between them', async () => {
    const convo1 = await chat(agent.accessToken, 'houses in Lahore', null);
    const convo2 = await chat(agent.accessToken, 'houses in Karachi', null);
    expect(convo1.conversationId).not.toBe(convo2.conversationId);

    const [c1, c2] = await Promise.all([
      request(app).get(`/api/ai/conversations/${convo1.conversationId}`).set({ Authorization: `Bearer ${agent.accessToken}` }),
      request(app).get(`/api/ai/conversations/${convo2.conversationId}`).set({ Authorization: `Bearer ${agent.accessToken}` }),
    ]);

    expect(c1.body.context.lastFilters.city).toBe('Lahore');
    expect(c2.body.context.lastFilters.city).toBe('Karachi');
    expect(c1.body.context.turnCount).toBe(1);
    expect(c2.body.context.turnCount).toBe(1);
  });

  it('streaming mode produces the same memory shape as non-streaming', async () => {
    const res = await request(app)
      .post('/api/ai/chat/stream')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ message: 'houses in Lahore', conversationId: null });

    const metaMatch = res.text.match(/event: meta\ndata: ({.*})/);
    const conversationId = JSON.parse(metaMatch[1]).conversationId;

    const convo = await request(app)
      .get(`/api/ai/conversations/${conversationId}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` });
    expect(convo.body.context.recentToolResults.length).toBe(1);
    expect(convo.body.context.entities.propertyId).toBeDefined();
  });
});

describe('AI conversation memory - tenant/user isolation', () => {
  it('two agents in different agencies never see each other\'s conversations or memory', async () => {
    const tenant1 = await createAgency();
    const tenant2 = await createAgency();
    const agentA = await signupUser(app, tenant1.slug, { role: 'agent' });
    const agentB = await signupUser(app, tenant2.slug, { role: 'agent' });

    const rA = await chat(agentA.accessToken, 'houses in Lahore', null);

    // agentB cannot fetch agentA's conversation by ID.
    const forbidden = await request(app)
      .get(`/api/ai/conversations/${rA.conversationId}`)
      .set({ Authorization: `Bearer ${agentB.accessToken}` });
    expect(forbidden.status).toBe(404);

    // agentB's own conversation list never includes agentA's.
    const listB = await request(app).get('/api/ai/conversations').set({ Authorization: `Bearer ${agentB.accessToken}` });
    expect(listB.body.some((c) => c._id === rA.conversationId)).toBe(false);
  });

  it('two agents in the SAME agency still cannot read each other\'s conversation memory (user-scoped, not just tenant-scoped)', async () => {
    const tenant = await createAgency();
    const agentA = await signupUser(app, tenant.slug, { role: 'agent' });
    const agentB = await signupUser(app, tenant.slug, { role: 'agent' });

    const rA = await chat(agentA.accessToken, 'houses in Karachi', null);

    const forbidden = await request(app)
      .get(`/api/ai/conversations/${rA.conversationId}`)
      .set({ Authorization: `Bearer ${agentB.accessToken}` });
    expect(forbidden.status).toBe(404);
  });
});
