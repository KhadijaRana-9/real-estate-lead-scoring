const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');
const { createFakeLlmServer, textResponse, toolCallResponse } = require('../helpers/fakeLlmServer');
const Conversation = require('../../src/features/ai/conversation.model');
const AuditLog = require('../../src/features/audit/auditLog.model');

const app = buildTestApp();

async function chat(token, message, conversationId = null) {
  return request(app)
    .post('/api/ai/chat')
    .set({ Authorization: `Bearer ${token}` })
    .send({ message, conversationId });
}

// Real full-stack proof that Phase 3's LLM escalation path works end to
// end - real Mongo, real executeTool gateway, real audit writes - the
// only fake is the HTTP LLM backend itself (see fakeLlmServer.js), so
// this exercises the actual openaiCompatible.provider.js request/parse
// code, not a bypass. No real API key involved anywhere in this file.
describe('AI LLM escalation - full stack (fake OpenAI-compatible backend)', () => {
  let fakeLlm;

  beforeAll(async () => {
    fakeLlm = createFakeLlmServer();
    const url = await fakeLlm.start();
    process.env.LLM_BASE_URL = url;
    process.env.LLM_API_KEY = 'fake-test-key';
    process.env.LLM_MODEL = 'fake-model';
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

  it('escalates a paraphrased message the deterministic matcher cannot score, and executes a real tool call', async () => {
    const tenant = await createAgency();
    const agent = await signupUser(app, tenant.slug, { role: 'agent' });
    await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Escalation Test House', price: 8000000, city: 'Multan', area: 6, type: 'house', bedrooms: 3, bathrooms: 2 });

    fakeLlm.script(
      toolCallResponse([{ id: 'call_1', name: 'search_properties', arguments: { city: 'Multan' } }], { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 }),
      textResponse('I found a house for you in Multan.', { prompt_tokens: 80, completion_tokens: 12, total_tokens: 92 })
    );

    const res = await chat(agent.accessToken, "I'm relocating soon, any suggestions?");

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('I found a house for you in Multan.');
    expect(res.body.attachments).toHaveLength(1);
    expect(res.body.attachments[0].tool).toBe('search_properties');
    expect(fakeLlm.requests).toHaveLength(2);
  });

  it('supports a multi-step tool-call loop (2+ calls) before producing a final answer', async () => {
    const tenant = await createAgency();
    const agent = await signupUser(app, tenant.slug, { role: 'agent' });
    await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Multi Step House', price: 9000000, city: 'Karachi', area: 8, type: 'house', bedrooms: 4, bathrooms: 3 });

    fakeLlm.script(
      toolCallResponse([{ id: 'call_1', name: 'search_properties', arguments: { city: 'Karachi' } }]),
      toolCallResponse([{ id: 'call_2', name: 'get_market_insights', arguments: { city: 'Karachi' } }]),
      textResponse('Here is a property and the current market context for Karachi.')
    );

    const res = await chat(agent.accessToken, 'considering a move, what does the Karachi market look like and is there anything available?');

    expect(res.status).toBe(200);
    expect(res.body.attachments.length).toBeGreaterThanOrEqual(2);
    expect(res.body.reply).toBe('Here is a property and the current market context for Karachi.');
    expect(fakeLlm.requests).toHaveLength(3);
  });

  it('carries Phase 2 conversation memory into the LLM system prompt across turns', async () => {
    const tenant = await createAgency();
    const agent = await signupUser(app, tenant.slug, { role: 'agent' });
    await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Memory Continuity House', price: 7000000, city: 'Islamabad', area: 5, type: 'house', bedrooms: 3, bathrooms: 2 });

    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'search_properties', arguments: { city: 'Islamabad' } }]), textResponse('Found a property in Islamabad.'));
    const first = await chat(agent.accessToken, 'looking to relocate, anything decent around the capital?');
    const conversationId = first.body.conversationId;

    fakeLlm.script(textResponse('It has 3 bedrooms and 2 bathrooms.'));
    const second = await chat(agent.accessToken, 'how many bedrooms does it have?', conversationId);

    expect(second.status).toBe(200);
    expect(second.body.reply).toBe('It has 3 bedrooms and 2 bathrooms.');
    const secondRequestBody = fakeLlm.requests.at(-1);
    const systemMessage = secondRequestBody.messages.find((m) => m.role === 'system');
    expect(systemMessage.content).toMatch(/Islamabad/);
  });

  it('stages a pending confirmation for an LLM-proposed mutating tool, and resolution reuses the existing deterministic gate unchanged', async () => {
    const tenant = await createAgency();
    const agent = await signupUser(app, tenant.slug, { role: 'agent' });
    const propRes = await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Lead Source House', price: 6000000, city: 'Lahore', area: 5, type: 'house', bedrooms: 3, bathrooms: 2 });

    const inquiryRes = await request(app)
      .post(`/api/inquiries?workspace=${tenant.slug}`)
      .send({ propertyId: propRes.body._id, name: 'Interested Buyer', email: 'buyer@example.com', phone: '03001234567', budget: 6000000, moveTimeline: 'immediate', message: 'Please call.' });
    const inquiryId = inquiryRes.body._id;

    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'move_lead_stage', arguments: { inquiryId, stage: 'contacted' } }]));
    const proposal = await chat(agent.accessToken, 'go ahead and update that lead I mentioned to reflect that we spoke');
    const conversationId = proposal.body.conversationId;

    expect(proposal.body.reply).toMatch(/contacted/);
    let conversation = await Conversation.findById(conversationId);
    expect(conversation.context.pendingAction).toEqual({ tool: 'move_lead_stage', args: { inquiryId, stage: 'contacted' } });

    // Confirming next turn is handled entirely by localEngine/index.js's
    // pre-existing pendingAction gate - the LLM is not consulted again.
    fakeLlm.reset();
    const confirmed = await chat(agent.accessToken, 'yes', conversationId);
    expect(confirmed.status).toBe(200);
    expect(fakeLlm.requests).toHaveLength(0);

    conversation = await Conversation.findById(conversationId);
    expect(conversation.context.pendingAction).toBeUndefined();

    const pipeline = await request(app).get(`/api/inquiries/pipeline?workspace=${tenant.slug}`).set({ Authorization: `Bearer ${agent.accessToken}` });
    const movedLead = pipeline.body.stages?.find((s) => s.stage === 'contacted')?.leads?.some((i) => i._id === inquiryId);
    expect(movedLead).toBe(true);
  });

  it('writes both an ai.tool_call and an ai.llm_call audit row, with no raw prompt/completion text logged', async () => {
    const tenant = await createAgency();
    const agent = await signupUser(app, tenant.slug, { role: 'agent' });
    await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Audit Escalation House', price: 6500000, city: 'Faisalabad', area: 5, type: 'house', bedrooms: 3, bathrooms: 2 });

    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'search_properties', arguments: { city: 'Faisalabad' } }]), textResponse('Found one in Faisalabad.'));
    await chat(agent.accessToken, 'thinking of moving, anything worth seeing?');

    const toolCallLog = await AuditLog.findOne({ action: 'ai.tool_call', 'metadata.tool': 'search_properties', agencyId: tenant._id }).sort({ createdAt: -1 });
    expect(toolCallLog).toBeTruthy();
    expect(toolCallLog.metadata.success).toBe(true);

    const llmCallLog = await AuditLog.findOne({ action: 'ai.llm_call', agencyId: tenant._id }).sort({ createdAt: -1 });
    expect(llmCallLog).toBeTruthy();
    expect(llmCallLog.metadata.outcome).toBe('answered');
    expect(llmCallLog.metadata.model).toBe('fake-model');
    const metadataJson = JSON.stringify(llmCallLog.metadata);
    expect(metadataJson).not.toMatch(/Found one in Faisalabad/);
    expect(metadataJson).not.toMatch(/thinking of moving/);
  });

  it('never crosses tenant boundaries through the LLM escalation path', async () => {
    const tenantA = await createAgency();
    const tenantB = await createAgency();
    const agentA = await signupUser(app, tenantA.slug, { role: 'agent' });
    const agentB = await signupUser(app, tenantB.slug, { role: 'agent' });
    await request(app)
      .post(`/api/properties?workspace=${tenantA.slug}`)
      .set({ Authorization: `Bearer ${agentA.accessToken}` })
      .send({ title: 'Tenant A Only House', price: 5500000, city: 'Sialkot', area: 5, type: 'house', bedrooms: 3, bathrooms: 2 });

    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'search_properties', arguments: {} }]), textResponse('Here is what I found.'));
    const resB = await chat(agentB.accessToken, 'not sure what to search for, surprise me');

    expect(resB.body.attachments[0].data.count).toBe(0);
    expect(resB.body.attachments[0].data.properties.some((p) => p.title === 'Tenant A Only House')).toBe(false);
  });

  it('cannot self-authorize a tool outside the requester role - executeTool still independently blocks it', async () => {
    const tenant = await createAgency();
    const agent = await signupUser(app, tenant.slug, { role: 'agent' });

    // get_platform_stats is super_admin-only; scripting the fake LLM to
    // request it anyway simulates a jailbroken/misbehaving model.
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'get_platform_stats', arguments: {} }]), textResponse("I wasn't able to access that."));
    const res = await chat(agent.accessToken, 'give me confidential platform-wide numbers across every agency');

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("I wasn't able to access that.");

    const blockedLog = await AuditLog.findOne({ action: 'ai.tool_call', 'metadata.tool': 'get_platform_stats' }).sort({ createdAt: -1 });
    expect(blockedLog.metadata.success).toBe(false);
    expect(blockedLog.metadata.reason).toBe('unauthorized');
  });

  it('preserves the existing SSE contract when the LLM path is used during streaming', async () => {
    const tenant = await createAgency();
    const agent = await signupUser(app, tenant.slug, { role: 'agent' });
    await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Streaming Escalation House', price: 6200000, city: 'Peshawar', area: 5, type: 'house', bedrooms: 3, bathrooms: 2 });

    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'search_properties', arguments: { city: 'Peshawar' } }]), textResponse('Found one in Peshawar for you.'));

    const res = await request(app)
      .post('/api/ai/chat/stream')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ message: 'relocating for work, anything to look at?', conversationId: null });

    expect(res.text).toMatch(/^event: meta\n/);
    expect(res.text).toMatch(/event: attachments\n/);
    expect(res.text).toMatch(/event: chunk\n/);
    expect(res.text.trim().endsWith('event: done\ndata: {}')).toBe(true);
    const fullText = [...res.text.matchAll(/event: chunk\ndata: ({.*})\n/g)].map((m) => JSON.parse(m[1]).text).join('');
    expect(fullText.trim()).toBe('Found one in Peshawar for you.');
  });

  it('persists the LLM turn into conversation history exactly like the deterministic path (recoverable via GET)', async () => {
    const tenant = await createAgency();
    const agent = await signupUser(app, tenant.slug, { role: 'agent' });
    await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Recovery House', price: 5900000, city: 'Quetta', area: 5, type: 'house', bedrooms: 3, bathrooms: 2 });

    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'search_properties', arguments: { city: 'Quetta' } }]), textResponse('Found one in Quetta.'));
    const sent = await chat(agent.accessToken, 'relocating, anything out that way?');

    const convo = await request(app).get(`/api/ai/conversations/${sent.body.conversationId}`).set({ Authorization: `Bearer ${agent.accessToken}` });

    expect(convo.status).toBe(200);
    expect(convo.body.messages).toHaveLength(2);
    expect(convo.body.messages[1].content).toBe('Found one in Quetta.');
    expect(convo.body.messages[1].attachments).toHaveLength(1);
  });

  it('keeps needsSummarization driven by the real turn count even when some turns went through the LLM path', async () => {
    const tenant = await createAgency();
    const agent = await signupUser(app, tenant.slug, { role: 'agent' });
    const seeded = await Conversation.create({
      agencyId: tenant._id,
      user: agent.user.id,
      title: 'Long conversation',
      messages: [],
      context: { turnCount: 39, needsSummarization: false },
    });

    fakeLlm.script(textResponse('Sure, happy to help with whatever comes next.'));
    const res = await chat(agent.accessToken, 'one more thing before we wrap up', seeded._id.toString());

    expect(res.status).toBe(200);
    const convo = await Conversation.findById(seeded._id);
    expect(convo.context.turnCount).toBe(40);
    expect(convo.context.needsSummarization).toBe(true);
  });
});
