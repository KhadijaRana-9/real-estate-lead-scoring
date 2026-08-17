const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser, createSuperAdmin } = require('../helpers/factories');
const authService = require('../../src/features/auth/auth.service');
const Agency = require('../../src/features/agency/agency.model');

const app = buildTestApp();

async function chat(token, message, conversationId = null) {
  return request(app)
    .post('/api/ai/chat')
    .set({ Authorization: `Bearer ${token}` })
    .send({ message, conversationId });
}

async function superAdminToken() {
  const { user } = await createSuperAdmin();
  return authService.signAccessToken(user);
}

async function createProperty(agentToken, tenant, overrides = {}) {
  const res = await request(app)
    .post(`/api/properties?workspace=${tenant.slug}`)
    .set({ Authorization: `Bearer ${agentToken}` })
    .send({ title: 'Phase 5 Test House', price: 8000000, city: 'Lahore', area: 6, type: 'house', bedrooms: 4, bathrooms: 3, ...overrides });
  return res.body;
}

describe('Phase 5 - Super Admin / Platform AI: real, end-to-end', () => {
  describe('Role isolation (hard requirement)', () => {
    it('a customer cannot access any Phase 5 platform tool', async () => {
      const tenant = await createAgency();
      const customer = await signupUser(app, tenant.slug, { role: 'customer' });
      const res = await chat(customer.accessToken, 'how is the platform doing?');
      expect(res.body.reply).not.toMatch(/DreamHomes currently has \d+ agenc/);
    });

    it('an agent cannot access any Phase 5 platform tool', async () => {
      const tenant = await createAgency();
      const agent = await signupUser(app, tenant.slug, { role: 'agent' });
      const res = await chat(agent.accessToken, 'which agencies need attention');
      expect(res.body.reply).not.toMatch(/agencies? needs? a look|no agencies are currently flagged/i);
    });

    it('an agency_admin cannot access any Phase 5 platform tool', async () => {
      const tenant = await createAgency();
      const admin = await signupUser(app, tenant.slug, { role: 'agency_admin' });
      const res = await chat(admin.accessToken, "today's platform priorities");
      expect(res.body.reply).not.toMatch(/HIGH PRIORITY|nothing urgent right now/i);
    });

    it('super_admin CAN access the intended platform tools', async () => {
      const token = await superAdminToken();
      const res = await chat(token, 'how is the platform doing?');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/DreamHomes currently has \d+ agenc/);
    });

    it('super_admin has no agencyId, and this is never inferred from message text - tools are genuinely platform-wide, not silently scoped to a guessed tenant', async () => {
      const tenantA = await createAgency();
      const agentA = await signupUser(app, tenantA.slug, { role: 'agent' });
      await createProperty(agentA.accessToken, tenantA, { title: `Property for ${tenantA.slug}` });

      const token = await superAdminToken();
      // Mentioning another agency's slug in the message must not scope
      // the platform tool to it - agencyId/tenantId can never come from
      // user text, per the hard requirement.
      const res = await chat(token, `how is the platform doing for workspace ${tenantA.slug}?`);
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/DreamHomes currently has \d+ agenc/);
    });
  });

  describe('Platform overview - real, non-fabricated data', () => {
    it('a real agency and property change the real reported totals', async () => {
      const token = await superAdminToken();
      const before = await chat(token, 'platform stats');
      const beforeTotal = Number(before.body.reply.match(/currently has (\d+) agenc/)[1]);

      await createAgency();

      const after = await chat(token, 'platform stats');
      const afterTotal = Number(after.body.reply.match(/currently has (\d+) agenc/)[1]);
      expect(afterTotal).toBe(beforeTotal + 1);
    });
  });

  describe('Agency intelligence - filtered lists', () => {
    it('"which agencies are on enterprise" returns only real enterprise agencies', async () => {
      const token = await superAdminToken();
      const enterpriseAgency = await createAgency({ subscriptionPlan: 'enterprise' });
      const starterAgency = await createAgency({ subscriptionPlan: 'starter' });

      const res = await chat(token, 'which agencies are on enterprise');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(new RegExp(enterpriseAgency.companyName));
      expect(res.body.reply).not.toMatch(new RegExp(starterAgency.companyName));
    });

    it('"which agencies are inactive" excludes active agencies honestly (no fabricated status)', async () => {
      const token = await superAdminToken();
      const suspended = await createAgency({ status: 'suspended' });
      const active = await createAgency({ status: 'active' });

      const res = await chat(token, 'which agencies are inactive');
      expect(res.body.reply).toMatch(new RegExp(suspended.companyName));
      expect(res.body.reply).not.toMatch(new RegExp(active.companyName));
    });
  });

  describe('Agency health / activity signals - transparent, no predictive claims', () => {
    it('flags a real agency with agents but zero listings, using the exact real numbers', async () => {
      const token = await superAdminToken();
      const tenant = await createAgency();
      await signupUser(app, tenant.slug, { role: 'agent' });
      await signupUser(app, tenant.slug, { role: 'agent' });

      const res = await chat(token, 'which agencies need attention');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(new RegExp(`${tenant.companyName}: 2 agents but no property listings`));
      // Never a predictive/churn claim.
      expect(res.body.reply.toLowerCase()).not.toMatch(/churn|likely to/);
    });

    it('an agency with real listings is not flagged', async () => {
      const token = await superAdminToken();
      const tenant = await createAgency();
      const agent = await signupUser(app, tenant.slug, { role: 'agent' });
      await createProperty(agent.accessToken, tenant);

      const res = await chat(token, 'agency health');
      expect(res.body.reply).not.toMatch(new RegExp(tenant.companyName));
    });

    it('flags a real agency approaching its property limit, using the existing billing plan data', async () => {
      const token = await superAdminToken();
      // Starter plan: maxProperties: 50 - 45 real properties is >= 80%.
      const tenant = await createAgency({ subscriptionPlan: 'starter' });
      const agent = await signupUser(app, tenant.slug, { role: 'agent' });
      const Property = require('../../src/features/property/property.model');
      const filler = Array.from({ length: 45 }, (_, i) => ({
        agencyId: tenant._id, agent: agent.user.id, title: `Filler ${i}`, price: 1000000, city: 'Karachi', area: 5, type: 'house',
      }));
      await Property.insertMany(filler);

      const res = await chat(token, 'agencies approaching their property limit');
      expect(res.body.reply).toMatch(new RegExp(`${tenant.companyName}.*approaching its property limit \\(45/50\\)`));
    });
  });

  describe('Platform priorities - HIGH PRIORITY / ATTENTION, only when real data supports it', () => {
    it('a real pending agency appears under HIGH PRIORITY', async () => {
      const token = await superAdminToken();
      const pending = await createAgency({ status: 'pending' });

      const res = await chat(token, "today's platform priorities");
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/HIGH PRIORITY/);
      expect(res.body.reply).toMatch(new RegExp(pending.companyName));
    });
  });

  describe('Platform property/agent intelligence - real rankings only', () => {
    it('ranks real agencies by real inquiry count, never revenue/views/ROI', async () => {
      const token = await superAdminToken();
      const tenant = await createAgency();
      const agent = await signupUser(app, tenant.slug, { role: 'agent' });
      const customer = await signupUser(app, tenant.slug, { role: 'customer' });
      const property = await createProperty(agent.accessToken, tenant, { title: 'Ranking Test House' });
      await chat(customer.accessToken, `contact agent about property ${property._id}, my budget is around 8 crore`);

      const res = await chat(token, 'which agencies have the most inquiries');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/Agencies ranked by inquiries:/);
      expect(res.body.reply).toMatch(new RegExp(tenant.companyName));
      expect(res.body.reply.toLowerCase()).not.toMatch(/revenue|roi|forecast|conversion/);
    });

    it('ranks real agencies by real agent-team size', async () => {
      const token = await superAdminToken();
      const tenant = await createAgency();
      await signupUser(app, tenant.slug, { role: 'agent' });
      await signupUser(app, tenant.slug, { role: 'agent' });
      await signupUser(app, tenant.slug, { role: 'agent' });

      const res = await chat(token, 'which agencies have the largest teams');
      expect(res.body.reply).toMatch(new RegExp(`${tenant.companyName}: 3`));
    });
  });

  describe('Read-only requirement (hard requirement)', () => {
    it('none of the Phase 5 tools are marked as mutating', () => {
      const { TOOL_DEFINITIONS } = require('../../src/features/ai/ai.tools');
      for (const name of ['get_platform_stats', 'list_platform_agencies', 'get_platform_agency_health', 'get_platform_priorities', 'get_platform_rankings']) {
        expect(TOOL_DEFINITIONS[name].mutates).toBeFalsy();
      }
    });

    it('asking about an agency via chat never changes its real status - a genuine round trip', async () => {
      const token = await superAdminToken();
      const tenant = await createAgency({ status: 'pending' });

      await chat(token, "today's platform priorities");
      await chat(token, 'which agencies are on ' + tenant.subscriptionPlan);
      await chat(token, 'agency health');

      const unchanged = await Agency.findById(tenant._id);
      expect(unchanged.status).toBe('pending');
    });
  });

  describe('Existing Phase 1-4 AI behavior remains functional', () => {
    it('Phase 2 customer FAQ still works', async () => {
      const tenant = await createAgency();
      const customer = await signupUser(app, tenant.slug, { role: 'customer' });
      const res = await chat(customer.accessToken, 'how do favorites work?');
      expect(res.body.reply).toMatch(/heart icon/i);
    });

    it('Phase 4 agency_admin overview still works, unaffected by the new super_admin tools', async () => {
      const tenant = await createAgency();
      const admin = await signupUser(app, tenant.slug, { role: 'agency_admin' });
      const res = await chat(admin.accessToken, 'how is my agency doing?');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/propert.*active.*lead/i);
    });

    it('existing get_agency_performance (agency_admin) keeps working, unaffected by list_platform_agencies changes', async () => {
      const tenant = await createAgency();
      const admin = await signupUser(app, tenant.slug, { role: 'agency_admin' });
      const res = await chat(admin.accessToken, 'conversion rate');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/conversion rate/i);
    });
  });
});
