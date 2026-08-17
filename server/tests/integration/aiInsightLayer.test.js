const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser, createRoleUser } = require('../helpers/factories');
const { createFakeLlmServer, textResponse, toolCallResponse } = require('../helpers/fakeLlmServer');
const { INSIGHT_INSTRUCTIONS } = require('../../src/features/ai/llm/prompts');
const AuditLog = require('../../src/features/audit/auditLog.model');
const Conversation = require('../../src/features/ai/conversation.model');

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

// Phase 6 - CRM Insights & Decision Support. Same verification boundary
// as Phase 5: proves the real data reaches the LLM's context unchanged
// and the system prompt carries the new grounding instructions - a real
// model's compliance itself isn't something a test can assert.
describe('AI CRM Insights Layer (Phase 6)', () => {
  let fakeLlm;
  let tenant;
  let agent;

  beforeAll(async () => {
    fakeLlm = createFakeLlmServer();
    const url = await fakeLlm.start();
    process.env.LLM_BASE_URL = url;
    process.env.LLM_API_KEY = 'fake-test-key';
    process.env.LLM_MODEL = 'fake-model';

    tenant = await createAgency({ companyName: 'Insight Test Agency' });
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

  it('the real system prompt sent to the LLM carries INSIGHT_INSTRUCTIONS end-to-end', async () => {
    fakeLlm.script(textResponse('ok'));
    await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    const systemMessage = fakeLlm.requests[0].messages.find((m) => m.role === 'system');
    expect(systemMessage.content).toContain(INSIGHT_INSTRUCTIONS);
  });

  it('real lead data (status/score/pipelineStage/timestamps) reaches the LLM unchanged for prioritization', async () => {
    const propRes = await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Insight Lead House', price: 7000000, city: 'Lahore', area: 5, type: 'house', bedrooms: 3, bathrooms: 2 });

    const inquiryRes = await request(app)
      .post(`/api/inquiries?workspace=${tenant.slug}`)
      .send({ propertyId: propRes.body._id, name: 'Priority Buyer', email: 'prioritybuyer@example.com', phone: '03001234567', budget: 7000000, moveTimeline: 'immediate', message: 'Ready to move fast, please call today.' });
    expect(inquiryRes.body.status).toBeTruthy(); // sanity: real scoring engine set a real status

    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'get_lead_pipeline', arguments: {} }]), textResponse('Here is what needs attention among your leads.'));
    await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    const toolResult = JSON.parse(toolResultMessages(fakeLlm.requests[1])[0].content);
    const allLeads = toolResult.stages.flatMap((s) => s.leads);
    const ourLead = allLeads.find((l) => l._id === inquiryRes.body._id);
    expect(ourLead).toBeTruthy();
    expect(ourLead.status).toBe(inquiryRes.body.status);
    expect(ourLead.score).toBe(inquiryRes.body.score);
    expect(ourLead.updatedAt).toBeTruthy(); // real timestamp, usable for "hasn't moved recently" reasoning
  });

  it('real overdue/due-soon follow-up data (backend-computed, not LLM-derived) reaches the LLM unchanged', async () => {
    const pastDueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const taskRes = await request(app)
      .post(`/api/crm/tasks?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Overdue follow-up call', dueDate: pastDueDate });
    expect(taskRes.status).toBe(201);

    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'get_upcoming_reminders', arguments: {} }]), textResponse('Here is what is overdue.'));
    await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    const toolResult = JSON.parse(toolResultMessages(fakeLlm.requests[1])[0].content);
    expect(toolResult.overdueTasks.some((t) => t.title === 'Overdue follow-up call')).toBe(true);
  });

  it('real property analytics (most viewed/featured) reach the LLM unchanged - never an invented ROI/yield field', async () => {
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'get_property_analytics', arguments: {} }]), textResponse('Here is what is drawing attention.'));
    await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    const toolResult = JSON.parse(toolResultMessages(fakeLlm.requests[1])[0].content);
    expect(toolResult).toHaveProperty('mostViewed');
    expect(toolResult).toHaveProperty('featured');
    expect(toolResult).toHaveProperty('totalAvailable');
    expect(toolResult).not.toHaveProperty('roi');
    expect(toolResult).not.toHaveProperty('rentalYield');
    expect(toolResult).not.toHaveProperty('investmentScore');
  });

  it('real subscription usage/limits/pricing reach the LLM unchanged for a "close to plan limit" insight', async () => {
    // get_subscription is agency_admin-only (TOOL_DEFINITIONS) - using an
    // agent token here would just prove RBAC still blocks it, not that
    // real usage data reaches the LLM.
    const { accessToken: adminToken } = await createRoleUser(tenant._id, 'agency_admin');
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'get_subscription', arguments: {} }]), textResponse('Here is your usage relative to your plan.'));
    await chat(adminToken, NON_MATCHING_MESSAGE);

    const toolResult = JSON.parse(toolResultMessages(fakeLlm.requests[1])[0].content);
    expect(toolResult.usagePercent).toBeTruthy();
    expect(toolResult.limits).toBeTruthy();
    expect(typeof toolResult.priceMonthly).toBe('number');
  });

  it('a cross-tool CRM summary calls multiple real tools and both real results reach the LLM across the loop', async () => {
    fakeLlm.script(
      toolCallResponse([{ id: 'call_1', name: 'get_upcoming_reminders', arguments: {} }]),
      toolCallResponse([{ id: 'call_2', name: 'get_lead_pipeline', arguments: {} }]),
      textResponse('Here are your biggest priorities today, based on your real reminders and lead pipeline.')
    );
    const res = await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    expect(fakeLlm.requests).toHaveLength(3);
    const secondCallToolResults = toolResultMessages(fakeLlm.requests[1]);
    const thirdCallToolResults = toolResultMessages(fakeLlm.requests[2]);
    expect(secondCallToolResults).toHaveLength(1); // reminders result from call 1
    expect(thirdCallToolResults).toHaveLength(2); // reminders + pipeline results from calls 1 and 2
    expect(res.body.reply).toBe('Here are your biggest priorities today, based on your real reminders and lead pipeline.');
  });

  it('no regression: confirmation flow still gates a mutating tool exactly as before', async () => {
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'create_task', arguments: { title: 'Insight-phase regression check' } }]));
    const proposal = await chat(agent.accessToken, NON_MATCHING_MESSAGE);
    expect(proposal.body.reply).toMatch(/insight-phase regression check/i);

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

  it('no regression: streaming SSE contract is unaffected by the insight instructions', async () => {
    fakeLlm.script(textResponse('Streaming still works fine.'));
    const res = await request(app)
      .post('/api/ai/chat/stream')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ message: NON_MATCHING_MESSAGE, conversationId: null });

    expect(res.text).toMatch(/^event: meta\n/);
    expect(res.text).toMatch(/event: chunk\n/);
    expect(res.text.trim().endsWith('event: done\ndata: {}')).toBe(true);
  });

  it('no regression: conversation memory still records tool executions after an insight-style multi-tool turn', async () => {
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'search_properties', arguments: { city: 'Lahore' } }]), textResponse('Found some options.'));
    const res = await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    const convo = await Conversation.findById(res.body.conversationId);
    expect(convo.context.recentToolResults.length).toBeGreaterThan(0);
  });

  it('no regression: tenant isolation still holds for a cross-tool insight turn', async () => {
    const tenantB = await createAgency();
    const agentB = await signupUser(app, tenantB.slug, { role: 'agent' });

    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'get_lead_pipeline', arguments: {} }]), textResponse('Here is your pipeline.'));
    await chat(agentB.accessToken, NON_MATCHING_MESSAGE);

    const toolResult = JSON.parse(toolResultMessages(fakeLlm.requests[1])[0].content);
    // tenantB has no inquiries of its own - must never see tenant's leads.
    expect(toolResult.total).toBe(0);
  });

  it('no regression: RBAC still blocks an unauthorized tool even during insight-style reasoning', async () => {
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'get_platform_stats', arguments: {} }]), textResponse("That's not something I can pull up for you."));
    const res = await chat(agent.accessToken, NON_MATCHING_MESSAGE);

    expect(res.body.reply).toBe("That's not something I can pull up for you.");
    const blockedLog = await AuditLog.findOne({ action: 'ai.tool_call', 'metadata.tool': 'get_platform_stats' }).sort({ createdAt: -1 });
    expect(blockedLog.metadata.success).toBe(false);
    expect(blockedLog.metadata.reason).toBe('unauthorized');
  });
});
