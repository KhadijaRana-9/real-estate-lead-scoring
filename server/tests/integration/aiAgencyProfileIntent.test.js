const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');
const { createFakeLlmServer, textResponse, toolCallResponse } = require('../helpers/fakeLlmServer');
const Agency = require('../../src/features/agency/agency.model');

const app = buildTestApp();

async function chat(token, message) {
  return request(app)
    .post('/api/ai/chat')
    .set({ Authorization: `Bearer ${token}` })
    .send({ message, conversationId: null });
}

describe('Conversational agency-identity questions resolve to get_agency_details', () => {
  let tenant;
  let agent;

  beforeAll(async () => {
    // get_agency_details' executor resolves a bare agencyName through a
    // real MongoDB $text search (agency.model.js's companyName text
    // index). On a freshly dropped test database that index has to be
    // rebuilt from scratch - Agency.init() waits for that to finish
    // before the first insert/search below, avoiding a race against the
    // very first $text query in this file (mongoSetup.js's per-file
    // dropDatabase() destroys indexes along with data).
    await Agency.init();
    tenant = await createAgency({ companyName: 'DreamHomes Test Co' });
    agent = await signupUser(app, tenant.slug, { role: 'agent' });
  });

  describe('deterministic path (no LLM configured - default state)', () => {
    it.each([
      'Tell me about DreamHomes Test Co',
      'Give me information about DreamHomes Test Co',
      'What kind of company is DreamHomes Test Co?',
    ])('resolves "%s" to the real agency profile, not the generic help message', async (message) => {
      const res = await chat(agent.accessToken, message);

      expect(res.status).toBe(200);
      expect(res.body.attachments).toHaveLength(1);
      expect(res.body.attachments[0].tool).toBe('get_agency_details');
      expect(res.body.attachments[0].data.companyName).toBe('DreamHomes Test Co');
      expect(res.body.reply).not.toMatch(/^I didn't catch a specific request there/);
    });

    it('still resolves the pre-existing phrasing "trust score for X" unchanged (no regression)', async () => {
      const res = await chat(agent.accessToken, 'trust score for DreamHomes Test Co');
      expect(res.body.attachments[0]?.tool).toBe('get_agency_details');
    });

    it('a generic proper-noun "tell me about X" for a non-existent agency fails honestly rather than crashing (known, accepted trade-off)', async () => {
      const res = await chat(agent.accessToken, 'Tell me about Ali Khan');
      expect(res.status).toBe(200);
      // Real execution, not a crash: the tool ran, searched for an
      // agency named "Ali Khan", found none, and returned its own
      // honest "couldn't resolve" message - never a stack trace or a
      // fabricated result.
      expect(res.body.reply).toMatch(/which agency/i);
      expect(res.body.attachments).toEqual([]);
    });

    it('"what does X do" and "who is X" are NOT deterministically matched - they fall to the honest help message when no LLM is configured (documented trade-off, not a bug)', async () => {
      const res = await chat(agent.accessToken, 'What does DreamHomes Test Co do?');
      expect(res.body.reply).toMatch(/^I didn't catch a specific request there/);
    });
  });

  describe('LLM path (fake OpenAI-compatible backend configured)', () => {
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

    it.each([
      'What does DreamHomes Test Co do?',
      'Who are DreamHomes Test Co?',
    ])('"%s" now resolves via LLM escalation to the real agency profile', async (message) => {
      fakeLlm.script(
        toolCallResponse([{ id: 'call_1', name: 'get_agency_details', arguments: { agencyName: 'DreamHomes Test Co' } }]),
        textResponse('DreamHomes Test Co is a real estate agency on the platform.')
      );

      const res = await chat(agent.accessToken, message);

      expect(res.status).toBe(200);
      expect(res.body.attachments).toHaveLength(1);
      expect(res.body.attachments[0].tool).toBe('get_agency_details');
      expect(res.body.attachments[0].data.companyName).toBe('DreamHomes Test Co');
    });

    it('the system prompt sent to the LLM includes the new company-identity routing instruction', async () => {
      fakeLlm.script(textResponse('ok'));
      await chat(agent.accessToken, 'What does DreamHomes Test Co do?');

      const systemMessage = fakeLlm.requests[0].messages.find((m) => m.role === 'system');
      expect(systemMessage.content).toMatch(/what does X do.*who is X.*tell me about X/);
      expect(systemMessage.content).toContain('never by guessing or reasoning about the company from your own general knowledge');
    });
  });
});
