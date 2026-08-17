const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser, createRoleUser } = require('../helpers/factories');
const { createFakeLlmServer, textResponse, toolCallResponse } = require('../helpers/fakeLlmServer');
const { REASONING_INSTRUCTIONS } = require('../../src/features/ai/llm/prompts');
const Agency = require('../../src/features/agency/agency.model');
const AuditLog = require('../../src/features/audit/auditLog.model');

const app = buildTestApp();
const NON_MATCHING_MESSAGE = "I'm not sure where to start, what would you suggest?";

async function chat(token, message, conversationId = null) {
  return request(app)
    .post('/api/ai/chat')
    .set({ Authorization: `Bearer ${token}` })
    .send({ message, conversationId });
}

function toolResultMessages(requestBody) {
  return requestBody.messages.filter((m) => m.role === 'tool');
}

// Phase 5 - Business Reasoning Layer. Verifies what code can actually
// guarantee: the real, already-computed data (lead score breakdown,
// price breakdown, trust-score factors, comparison fields, subscription
// usage/pricing) reaches the LLM's context unchanged, and the system
// prompt actually sent carries the new grounding instructions. Whether a
// real model complies is not something a test can assert - only that it
// was given the right real data and told not to go beyond it.
describe('AI Business Reasoning Layer (Phase 5)', () => {
  let fakeLlm;
  let tenant;
  let agent;

  beforeAll(async () => {
    fakeLlm = createFakeLlmServer();
    const url = await fakeLlm.start();
    process.env.LLM_BASE_URL = url;
    process.env.LLM_API_KEY = 'fake-test-key';
    process.env.LLM_MODEL = 'fake-model';

    tenant = await createAgency({ companyName: 'Reasoning Test Agency' });
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

  it('the real system prompt sent to the LLM carries REASONING_INSTRUCTIONS end-to-end', async () => {
    fakeLlm.script(textResponse('ok'));
    await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    const systemMessage = fakeLlm.requests[0].messages.find((m) => m.role === 'system');
    expect(systemMessage.content).toContain(REASONING_INSTRUCTIONS);
  });

  it('a lead score\'s real breakdown (budgetMatch/urgency/interest/popularity) reaches the LLM unchanged', async () => {
    const propRes = await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Reasoning Score House', price: 6000000, city: 'Lahore', area: 5, type: 'house', bedrooms: 3, bathrooms: 2 });

    const inquiryRes = await request(app)
      .post(`/api/inquiries?workspace=${tenant.slug}`)
      .send({ propertyId: propRes.body._id, name: 'Score Buyer', email: 'scorebuyer@example.com', phone: '03001234567', budget: 6000000, moveTimeline: 'immediate', message: 'Very interested, please call me back today.' });
    const inquiryId = inquiryRes.body._id;
    const realBreakdown = inquiryRes.body.scoreBreakdown;
    expect(realBreakdown).toBeTruthy(); // sanity: the real scoring engine really did compute this

    fakeLlm.script(
      toolCallResponse([{ id: 'call_1', name: 'explain_lead_score', arguments: { inquiryId } }]),
      textResponse('Here is why that lead scored the way it did.')
    );
    await chat(agent.accessToken, 'walk me through why that lead is rated the way it is');

    const toolResult = JSON.parse(toolResultMessages(fakeLlm.requests[1])[0].content);
    expect(toolResult.breakdown).toEqual(realBreakdown);
  });

  it('a price estimate\'s real breakdown (ratePerMarla/premiums) reaches the LLM unchanged', async () => {
    fakeLlm.script(
      toolCallResponse([{ id: 'call_1', name: 'estimate_property_price', arguments: { city: 'Lahore', area: 5, bedrooms: 3, bathrooms: 2 } }]),
      textResponse('Here is the estimate and how it was derived.')
    );
    await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    const toolResult = JSON.parse(toolResultMessages(fakeLlm.requests[1])[0].content);
    expect(toolResult.breakdown.ratePerMarla).toBe(2800000);
    expect(toolResult.breakdown.bedroomAmount).toBe(900000);
    expect(toolResult.breakdown.bathroomAmount).toBe(300000);
    expect(toolResult.estimate).toBe(toolResult.breakdown.baseAmount + toolResult.breakdown.bedroomAmount + toolResult.breakdown.bathroomAmount);
  });

  it('an agency\'s real trust-score factors (verified/establishedYear/rating/reviewCount) reach the LLM unchanged', async () => {
    await Agency.findByIdAndUpdate(tenant._id, { verified: true, establishedYear: 2015 });

    fakeLlm.script(
      toolCallResponse([{ id: 'call_1', name: 'get_agency_details', arguments: { agencyName: 'Reasoning Test Agency' } }]),
      textResponse('Here is why that agency has the trust score it does.')
    );
    await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    const toolResult = JSON.parse(toolResultMessages(fakeLlm.requests[1])[0].content);
    expect(toolResult.verified).toBe(true);
    expect(toolResult.establishedYear).toBe(2015);
    expect(typeof toolResult.stats.rating).toBe('number');
    expect(typeof toolResult.stats.reviewCount).toBe('number');
    expect(typeof toolResult.stats.trustScore).toBe('number');

    await Agency.findByIdAndUpdate(tenant._id, { verified: false, establishedYear: null });
  });

  it('real comparison fields (price/area/bedrooms for each property) reach the LLM unchanged', async () => {
    const propA = await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Compare House A', price: 8000000, city: 'Lahore', area: 6, type: 'house', bedrooms: 4, bathrooms: 3 });
    const propB = await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Compare House B', price: 5000000, city: 'Lahore', area: 4, type: 'house', bedrooms: 2, bathrooms: 1 });

    fakeLlm.script(
      toolCallResponse([{ id: 'call_1', name: 'compare_properties', arguments: { propertyIds: [propA.body._id, propB.body._id] } }]),
      textResponse('Here is a real comparison of these two.')
    );
    await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    const toolResult = JSON.parse(toolResultMessages(fakeLlm.requests[1])[0].content);
    const titles = toolResult.properties.map((p) => p.title);
    expect(titles).toEqual(expect.arrayContaining(['Compare House A', 'Compare House B']));
    const a = toolResult.properties.find((p) => p.title === 'Compare House A');
    expect(a.price).toBe(8000000);
    expect(a.area).toBe(6);
  });

  it('real subscription usage/limits/pricing reach the LLM unchanged (SaaS plan reasoning grounding)', async () => {
    const { accessToken: adminToken } = await createRoleUser(tenant._id, 'agency_admin');

    fakeLlm.script(
      toolCallResponse([{ id: 'call_1', name: 'get_subscription', arguments: {} }]),
      textResponse('Here is a plan recommendation based on your real usage.')
    );
    await chat(adminToken, NON_MATCHING_MESSAGE);

    const toolResult = JSON.parse(toolResultMessages(fakeLlm.requests[1])[0].content);
    expect(toolResult.plan).toBe('starter');
    expect(typeof toolResult.priceMonthly).toBe('number');
    expect(toolResult.limits).toBeTruthy();
    expect(toolResult.usage).toBeTruthy();
    expect(toolResult.availablePlans.map((p) => p.key)).toEqual(expect.arrayContaining(['starter', 'professional', 'enterprise']));
  });

  it('no regression: confirmation flow still gates a mutating tool exactly as before', async () => {
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'create_task', arguments: { title: 'Reasoning-phase regression check' } }]));
    const proposal = await chat(agent.accessToken, NON_MATCHING_MESSAGE);
    expect(proposal.body.reply).toMatch(/reasoning-phase regression check/i);

    fakeLlm.reset();
    const confirmed = await chat(agent.accessToken, 'yes', proposal.body.conversationId);
    expect(fakeLlm.requests).toHaveLength(0);
    expect(confirmed.body.reply).toMatch(/created task/i);
  });

  it('no regression: ai.llm_call audit logging still fires', async () => {
    fakeLlm.script(textResponse('ok'));
    await chat(agent.accessToken, NON_MATCHING_MESSAGE);
    const log = await AuditLog.findOne({ action: 'ai.llm_call', agencyId: tenant._id }).sort({ createdAt: -1 });
    expect(log).toBeTruthy();
  });

  it('no regression: streaming SSE contract is unaffected by the reasoning instructions', async () => {
    fakeLlm.script(textResponse('Streaming still works fine.'));
    const res = await request(app)
      .post('/api/ai/chat/stream')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ message: NON_MATCHING_MESSAGE, conversationId: null });

    expect(res.text).toMatch(/^event: meta\n/);
    expect(res.text).toMatch(/event: chunk\n/);
    expect(res.text.trim().endsWith('event: done\ndata: {}')).toBe(true);
  });

  it('no regression: conversation memory (recentToolResults) still records tool executions', async () => {
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'search_properties', arguments: { city: 'Lahore' } }]), textResponse('Found some options.'));
    const res = await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    const Conversation = require('../../src/features/ai/conversation.model');
    const convo = await Conversation.findById(res.body.conversationId);
    expect(convo.context.recentToolResults.length).toBeGreaterThan(0);
  });
});
