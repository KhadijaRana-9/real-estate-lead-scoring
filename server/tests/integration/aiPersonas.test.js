const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser, createRoleUser } = require('../helpers/factories');
const { createFakeLlmServer, textResponse, toolCallResponse } = require('../helpers/fakeLlmServer');
const { getPersona } = require('../../src/features/ai/llm/personas');
const AuditLog = require('../../src/features/audit/auditLog.model');

const app = buildTestApp();
const NON_MATCHING_MESSAGE = "I'm not sure where to start, what would you suggest?";

async function chat(token, message, conversationId = null) {
  return request(app)
    .post('/api/ai/chat')
    .set({ Authorization: `Bearer ${token}` })
    .send({ message, conversationId });
}

// Phase 4 - Role-Aware AI Personas. Proves the persona actually reaches
// the LLM (not just that personas.js has the right strings in
// isolation - see llmPersonas.test.js for that), and that loading a
// persona never changes what RBAC/executeTool() allow.
describe('AI role-aware personas', () => {
  let fakeLlm;
  let fakeLlmUrl;
  let tenant;
  let customer;
  let agent;
  let agencyAdmin;
  let superAdmin;

  beforeAll(async () => {
    fakeLlm = createFakeLlmServer();
    fakeLlmUrl = await fakeLlm.start();
    process.env.LLM_BASE_URL = fakeLlmUrl;
    process.env.LLM_API_KEY = 'fake-test-key';
    process.env.LLM_MODEL = 'fake-model';

    tenant = await createAgency();
    customer = await signupUser(app, tenant.slug, { role: 'customer' });
    agent = await signupUser(app, tenant.slug, { role: 'agent' });
    agencyAdmin = { accessToken: (await createRoleUser(tenant._id, 'agency_admin')).accessToken };
    superAdmin = { accessToken: (await createRoleUser(null, 'super_admin')).accessToken };
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

  it.each([
    ['customer', () => customer.accessToken],
    ['agent', () => agent.accessToken],
    ['agency_admin', () => agencyAdmin.accessToken],
    ['super_admin', () => superAdmin.accessToken],
  ])('injects the %s persona into the LLM system prompt, on top of the same base instructions', async (role, getToken) => {
    fakeLlm.script(textResponse('Sure, happy to help.'));
    const res = await chat(getToken(), NON_MATCHING_MESSAGE);

    expect(res.status).toBe(200);
    const systemMessage = fakeLlm.requests[0].messages.find((m) => m.role === 'system');
    expect(systemMessage.content).toContain(getPersona(role).guidance);
    // Every role still gets the same base safety instructions - only the
    // persona block differs, nothing else about the prompt structure does.
    expect(systemMessage.content).toContain('never invent property details, prices, IDs, or statistics');
    expect(systemMessage.content).toContain(`The current user's role is "${role}"`);
  });

  it('two different roles in the same conversation flow receive two different persona blocks', async () => {
    fakeLlm.script(textResponse('Here you go, customer.'));
    await chat(customer.accessToken, NON_MATCHING_MESSAGE);
    const customerSystemMessage = fakeLlm.requests[0].messages.find((m) => m.role === 'system').content;

    fakeLlm.reset();
    fakeLlm.script(textResponse('Here you go, agent.'));
    await chat(agent.accessToken, NON_MATCHING_MESSAGE);
    const agentSystemMessage = fakeLlm.requests[0].messages.find((m) => m.role === 'system').content;

    expect(customerSystemMessage).not.toBe(agentSystemMessage);
    expect(customerSystemMessage).toContain(getPersona('customer').guidance);
    expect(agentSystemMessage).toContain(getPersona('agent').guidance);
  });

  it('a persona never changes which tools are actually offered to the model', async () => {
    fakeLlm.script(textResponse('ok'));
    await chat(customer.accessToken, NON_MATCHING_MESSAGE);
    const customerToolNames = fakeLlm.requests[0].tools.map((t) => t.function.name).sort();

    fakeLlm.reset();
    fakeLlm.script(textResponse('ok'));
    await chat(superAdmin.accessToken, NON_MATCHING_MESSAGE);
    const superAdminToolNames = fakeLlm.requests[0].tools.map((t) => t.function.name).sort();

    // A customer must never be offered a super_admin-only tool, and vice
    // versa for tenant/business tools - persona is loaded per role, but
    // the actual tool list is still exactly getToolsForRole(role),
    // unchanged by Phase 4.
    expect(customerToolNames).not.toContain('get_platform_stats');
    expect(superAdminToolNames).not.toContain('create_task');
  });

  it('RBAC still blocks a persona-loaded role from an unauthorized tool, even if the LLM requests it anyway', async () => {
    // agency_admin's persona is loaded and injected, but if the model
    // (jailbroken or buggy) requests a super_admin-only tool, executeTool
    // must still block it independently - personas carry zero authority.
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'get_platform_stats', arguments: {} }]), textResponse("That's not something I can pull up for you."));

    const res = await chat(agencyAdmin.accessToken, NON_MATCHING_MESSAGE);

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("That's not something I can pull up for you.");
    expect(res.body.attachments).toEqual([]);
  });

  it('a confident deterministic match (buildReply) is byte-identical regardless of role - only the fallback/greeting paths are persona-aware', async () => {
    // A message that matches deterministically for every role never
    // touches the LLM. buildReply() itself was never modified by Phase 4
    // (only buildHelpMessage/matchSmallTalk were) - this locks that in.
    const customerRes = await chat(customer.accessToken, 'houses in Lahore');
    const agentRes = await chat(agent.accessToken, 'houses in Lahore');

    expect(fakeLlm.requests).toHaveLength(0);
    expect(customerRes.body.reply).toMatch(/^(Found \d+ propert|I didn't find any properties)/);
    expect(agentRes.body.reply).toMatch(/^(Found \d+ propert|I didn't find any properties)/);
  });

  describe('deterministic fallback/help message is personalized per role', () => {
    // These specifically prove the deterministic-only path, so the LLM
    // configured in the outer beforeAll is temporarily removed for this
    // block and restored afterward for the rest of the file.
    beforeAll(() => {
      delete process.env.LLM_BASE_URL;
      delete process.env.LLM_API_KEY;
      delete process.env.LLM_MODEL;
    });
    afterAll(() => {
      process.env.LLM_BASE_URL = fakeLlmUrl;
      process.env.LLM_API_KEY = 'fake-test-key';
      process.env.LLM_MODEL = 'fake-model';
    });

    it.each([
      ['customer', () => customer.accessToken],
      ['agent', () => agent.accessToken],
      ['agency_admin', () => agencyAdmin.accessToken],
      ['super_admin', () => superAdmin.accessToken],
    ])('a low-confidence message gets role "%s"\'s own helpIntro/helpExample, with no LLM involved', async (role, getToken) => {
      const res = await chat(getToken(), 'asdkjfh nonsense not matching anything');

      expect(fakeLlm.requests).toHaveLength(0); // LLM unavailable in this describe block - deterministic-only
      expect(res.body.reply.startsWith(getPersona(role).helpIntro)).toBe(true);
      expect(res.body.reply).toContain(getPersona(role).helpExample);
    });

    it('the help message never lists a tool description outside that role\'s own RBAC-filtered tool set', async () => {
      const customerRes = await chat(customer.accessToken, 'asdkjfh nonsense not matching anything');
      // get_platform_stats' own description text - must never appear for a customer.
      expect(customerRes.body.reply).not.toMatch(/platform-wide statistics/i);

      const superAdminRes = await chat(superAdmin.accessToken, 'asdkjfh nonsense not matching anything');
      // search_properties' own description text - super_admin has no property-search tool.
      expect(superAdminRes.body.reply).not.toMatch(/Search this agency's available property listings/i);
    });
  });

  describe('small-talk greeting is personalized per role', () => {
    it.each([
      ['customer', () => customer.accessToken],
      ['agent', () => agent.accessToken],
      ['agency_admin', () => agencyAdmin.accessToken],
      ['super_admin', () => superAdmin.accessToken],
    ])('"hello" gets role "%s"\'s own greetingHint, with no LLM involved', async (role, getToken) => {
      const res = await chat(getToken(), 'hello');
      expect(fakeLlm.requests).toHaveLength(0);
      expect(res.body.reply).toContain(getPersona(role).greetingHint);
    });
  });

  describe('allowed vs. blocked tools per role (RBAC unaffected by Phase 4)', () => {
    it('customer cannot access CRM/lead/task tools', async () => {
      fakeLlm.script(textResponse('ok'));
      await chat(customer.accessToken, NON_MATCHING_MESSAGE);
      const names = fakeLlm.requests[0].tools.map((t) => t.function.name);
      expect(names).toEqual(expect.arrayContaining(['search_properties', 'compare_properties', 'recommend_properties', 'get_agency_details']));
      expect(names).not.toEqual(expect.arrayContaining(['get_lead_stats', 'move_lead_stage', 'create_task', 'list_tasks', 'get_dashboard_summary']));
    });

    it('agent cannot access admin-only or platform-only tools', async () => {
      fakeLlm.reset();
      fakeLlm.script(textResponse('ok'));
      await chat(agent.accessToken, NON_MATCHING_MESSAGE);
      const names = fakeLlm.requests[0].tools.map((t) => t.function.name);
      expect(names).toEqual(expect.arrayContaining(['get_lead_stats', 'move_lead_stage', 'create_task', 'create_appointment']));
      expect(names).not.toEqual(expect.arrayContaining(['get_agency_performance', 'get_agency_branding', 'get_platform_stats', 'list_platform_agencies']));
    });

    it('agency_admin can access business/performance tools but not platform-wide tools', async () => {
      fakeLlm.reset();
      fakeLlm.script(textResponse('ok'));
      await chat(agencyAdmin.accessToken, NON_MATCHING_MESSAGE);
      const names = fakeLlm.requests[0].tools.map((t) => t.function.name);
      expect(names).toEqual(expect.arrayContaining(['get_agency_performance', 'get_dashboard_summary', 'get_subscription']));
      expect(names).not.toEqual(expect.arrayContaining(['get_platform_stats', 'list_platform_agencies']));
    });

    it('super_admin can access platform-wide tools but not any single agency\'s CRM tools', async () => {
      fakeLlm.reset();
      fakeLlm.script(textResponse('ok'));
      await chat(superAdmin.accessToken, NON_MATCHING_MESSAGE);
      const names = fakeLlm.requests[0].tools.map((t) => t.function.name);
      expect(names).toEqual(expect.arrayContaining(['get_platform_stats', 'list_platform_agencies']));
      expect(names).not.toEqual(expect.arrayContaining(['move_lead_stage', 'create_task', 'get_lead_stats', 'get_agency_performance']));
    });
  });

  it('streaming mode: the correct persona still reaches the LLM system prompt over SSE', async () => {
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'search_properties', arguments: {} }]), textResponse('Sure, here is what I found.'));

    const res = await request(app)
      .post('/api/ai/chat/stream')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ message: NON_MATCHING_MESSAGE, conversationId: null });

    expect(res.text).toMatch(/^event: meta\n/);
    const systemMessage = fakeLlm.requests[0].messages.find((m) => m.role === 'system');
    expect(systemMessage.content).toContain(getPersona('agent').guidance);
  });

  it('confirmation flow is unaffected by persona loading: a mutating tool still stages a pendingAction and resolves via the existing deterministic gate', async () => {
    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'create_task', arguments: { title: 'Follow up with buyer' } }]));
    const proposal = await chat(agent.accessToken, NON_MATCHING_MESSAGE);
    const conversationId = proposal.body.conversationId;
    expect(proposal.body.reply).toMatch(/follow up with buyer/i);

    fakeLlm.reset();
    const confirmed = await chat(agent.accessToken, 'yes', conversationId);
    expect(confirmed.status).toBe(200);
    expect(fakeLlm.requests).toHaveLength(0); // resolved entirely by the existing deterministic pendingAction gate
    expect(confirmed.body.reply).toMatch(/created task/i);
  });

  it('audit logging still records ai.llm_call for a persona-loaded turn', async () => {
    fakeLlm.script(textResponse('Here is some guidance.'));
    await chat(customer.accessToken, NON_MATCHING_MESSAGE);

    const log = await AuditLog.findOne({ action: 'ai.llm_call', 'actor.role': 'customer' }).sort({ createdAt: -1 });
    expect(log).toBeTruthy();
    expect(log.metadata.outcome).toBe('answered');
  });

  it('tenant isolation still holds for a persona-loaded LLM turn', async () => {
    const tenantB = await createAgency();
    const agentB = await signupUser(app, tenantB.slug, { role: 'agent' });

    fakeLlm.script(toolCallResponse([{ id: 'call_1', name: 'search_properties', arguments: {} }]), textResponse('Here is what is available.'));
    const res = await chat(agentB.accessToken, NON_MATCHING_MESSAGE);

    // agentB's search must be scoped to tenantB, never tenant (the
    // suite's default agency) - proven by an empty result set here since
    // tenantB has no properties of its own.
    expect(res.body.attachments[0].data.count).toBe(0);
  });
});
