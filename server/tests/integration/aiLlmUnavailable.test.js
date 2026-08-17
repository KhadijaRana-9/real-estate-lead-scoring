const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');

const app = buildTestApp();

// Locks in the Phase 3 backward-compatibility guarantee directly: with
// no LLM_* env vars configured (this repo's real dev/CI default -
// testEnv.js explicitly clears them), a message the deterministic
// matcher can't confidently resolve must produce the same
// buildHelpMessage() fallback it always has - the LLM escalation branch
// in localEngine/index.js must never be reached. The exact wording is
// now role-personalized (see llm/personas.js) - this asserts the shared,
// role-independent prefix every persona's helpIntro still starts with,
// not the full literal string (see llmPersonas.test.js/
// aiRolePersonas.test.js for the per-role wording itself).
describe('AI chat - LLM unavailable (default configuration)', () => {
  it('falls back to the standard help message for a low-confidence/no-match message, unchanged', async () => {
    const tenant = await createAgency();
    const agent = await signupUser(app, tenant.slug, { role: 'agent' });

    const res = await request(app)
      .post('/api/ai/chat')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ message: 'asdkjfh nonsense not matching anything', conversationId: null });

    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/^I didn't catch a specific request there\./);
    expect(res.body.attachments).toEqual([]);
  });
});
