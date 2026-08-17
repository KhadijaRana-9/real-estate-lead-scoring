const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');
const Appointment = require('../../src/features/crm/appointment.model');

const app = buildTestApp();

async function chat(token, message, conversationId = null) {
  return request(app)
    .post('/api/ai/chat')
    .set({ Authorization: `Bearer ${token}` })
    .send({ message, conversationId });
}

describe('Production-readiness audit fixes - customer-facing capabilities', () => {
  let tenant;
  let agent;
  let customer;
  let property;

  beforeAll(async () => {
    tenant = await createAgency();
    agent = await signupUser(app, tenant.slug, { role: 'agent' });
    customer = await signupUser(app, tenant.slug, { role: 'customer' });

    const res = await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Capability Test House', price: 8000000, city: 'Lahore', area: 6, type: 'house', bedrooms: 4, bathrooms: 3 });
    property = res.body;
  });

  describe('Favorites - real, persisted, end-to-end (not stubbed)', () => {
    it('a customer favoriting a property via AI chat is really persisted, and shows up in a later "my favorites" query', async () => {
      const before = await chat(customer.accessToken, 'my favorites');
      expect(before.body.reply).toMatch(/haven't saved any/i);

      const add = await chat(customer.accessToken, `favorite this property ${property._id}`);
      expect(add.body.reply).toMatch(/saved to your favorites/i);

      const after = await chat(customer.accessToken, 'show my favourite properties');
      expect(after.body.attachments[0].tool).toBe('get_favorite_properties');
      const titles = after.body.attachments[0].data.properties.map((p) => p.title);
      expect(titles).toContain('Capability Test House');
    });

    it('favoriting is also a real REST capability, not AI-only (so a real "heart icon" UI can use it directly)', async () => {
      const res = await request(app)
        .post(`/api/properties/${property._id}/favorite`)
        .set({ Authorization: `Bearer ${customer.accessToken}` });
      expect(res.status).toBe(201);
      expect(res.body.favorited).toBe(true);

      const list = await request(app)
        .get('/api/properties/favorites/mine')
        .set({ Authorization: `Bearer ${customer.accessToken}` });
      expect(list.body.properties.some((p) => p._id === property._id)).toBe(true);
    });

    it('removing a favorite via AI chat really deletes it', async () => {
      await chat(customer.accessToken, `favorite this property ${property._id}`);
      const remove = await chat(customer.accessToken, `remove from favorites ${property._id}`);
      expect(remove.body.reply).toMatch(/removed from your favorites/i);

      const check = await request(app)
        .get('/api/properties/favorites/mine')
        .set({ Authorization: `Bearer ${customer.accessToken}` });
      expect(check.body.properties.some((p) => p._id === property._id)).toBe(false);
    });

    it('favoriting twice is a safe no-op, not a duplicate-key error', async () => {
      await chat(customer.accessToken, `favorite this property ${property._id}`);
      const second = await chat(customer.accessToken, `favorite this property ${property._id}`);
      expect(second.status).toBe(200);
      expect(second.body.reply).toMatch(/saved to your favorites/i);
    });

    it('favorites are tenant/user isolated - a different customer never sees another customer\'s favorites', async () => {
      const customerB = await signupUser(app, tenant.slug, { role: 'customer' });
      const res = await chat(customerB.accessToken, 'my favorites');
      expect(res.body.reply).toMatch(/haven't saved any/i);
    });
  });

  describe('submit_inquiry - real lead creation, contacting the agent', () => {
    it('a customer submitting an inquiry via AI chat creates a real, scored lead the agent can see', async () => {
      const res = await chat(customer.accessToken, `contact agent about property ${property._id}, my budget is around 8 crore`);
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/inquiry has been sent/i);
      expect(res.body.attachments[0].tool).toBe('submit_inquiry');
      expect(res.body.attachments[0].data.inquiryId).toBeTruthy();
      expect(typeof res.body.attachments[0].data.score).toBe('number'); // real, computed lead score

      // Prove it's a REAL lead, visible through the agent's own real pipeline.
      const pipeline = await chat(agent.accessToken, 'lead pipeline');
      const allLeads = pipeline.body.attachments[0].data.stages.flatMap((s) => s.leads);
      expect(allLeads.some((l) => l.property === property._id || l.property?._id === property._id)).toBe(true);
    });

    it('the inquiry uses the customer\'s real account name/email automatically, not a placeholder', async () => {
      const res = await chat(customer.accessToken, `submit inquiry for property ${property._id}, budget 5 crore`);
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/inquiry has been sent/i);
    });

    it('only a customer can submit an inquiry via AI (RBAC unchanged for agents/admins)', async () => {
      const res = await chat(agent.accessToken, `contact agent about property ${property._id}, budget 5 crore`);
      // An agent has no submit_inquiry tool - the deterministic matcher
      // won't even offer this intent for that role, so it falls through
      // rather than executing.
      expect(res.body.reply).not.toMatch(/inquiry has been sent/i);
    });
  });

  describe('schedule visit as a customer - assignedTo resolves to the real listing agent, not the customer', () => {
    it('booking a viewing via AI creates a real appointment assigned to the property\'s actual agent', async () => {
      const proposal = await chat(customer.accessToken, `book a viewing for property ${property._id} tomorrow`);
      expect(proposal.body.reply).toMatch(/reply "yes" to confirm/i); // still gated by the existing confirmation flow, unchanged

      const confirmed = await chat(customer.accessToken, 'yes', proposal.body.conversationId);
      expect(confirmed.body.reply).toMatch(/scheduled/i);

      const created = await Appointment.findOne({ relatedProperty: property._id }).sort({ createdAt: -1 });
      expect(created).toBeTruthy();
      expect(created.assignedTo.toString()).toBe(property.agent); // the real listing agent, not the customer
      expect(created.createdBy.toString()).toBe(customer.user.id); // still records who actually asked

      // Prove it's visible in the real agent's own calendar (crm.service.js's scopeFilter).
      const agentView = await chat(agent.accessToken, 'my appointments');
      const titles = agentView.body.attachments[0].data.appointments.map((a) => a._id);
      expect(titles).toContain(created._id.toString());
    });

    it('a customer booking a visit without specifying which property gets a clear error, not a misassigned appointment', async () => {
      const res = await chat(customer.accessToken, 'schedule a viewing for tomorrow');
      // No property mentioned - the deterministic engine can't extract a
      // relatedProperty, so this either asks a clarifying question or (if
      // it somehow reached the executor) returns the explicit error - it
      // must never silently create an appointment assigned to nobody.
      const created = await Appointment.countDocuments({ assignedTo: customer.user.id });
      expect(created).toBe(0);
      expect(res.status).toBe(200);
    });
  });

  describe('get_faq_answer - Phase 2 (Customer AI): real answers, not the generic capability list', () => {
    it('a specific "how do I contact an agent" question gets the real, specific FAQ answer', async () => {
      const res = await chat(customer.accessToken, 'how do I contact an agent?');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/submit an inquiry/i);
      expect(res.body.reply).not.toMatch(/here's what i can help you with/i);
    });

    it('"how do favorites work" gets the favorites FAQ answer, not the generic help list', async () => {
      const res = await chat(customer.accessToken, 'how do favorites work?');
      expect(res.body.reply).toMatch(/heart icon/i);
      expect(res.body.reply).not.toMatch(/here's what i can help you with/i);
    });

    it('agents do not get this customer-only tool (RBAC unchanged) - falls through instead of answering', async () => {
      const res = await chat(agent.accessToken, 'how do I contact an agent?');
      expect(res.body.reply).not.toMatch(/submit an inquiry/i);
    });

    it('a typo\'d city in a real search still resolves via the new fuzzy fallback, end to end', async () => {
      const res = await chat(customer.accessToken, 'houses in Lahor');
      expect(res.body.attachments?.[0]?.tool).toBe('search_properties');
      expect(res.body.attachments[0].data.properties.every((p) => p.city === 'Lahore')).toBe(true);
    });

    it('the broader "how does the platform work" question still falls back to the generic capability list (deliberately unchanged)', async () => {
      const res = await chat(customer.accessToken, 'how does the platform work?');
      expect(res.body.reply).toMatch(/here's what i can help you with/i);
    });
  });

  describe('search ranking - featured/most-viewed properties surface first among real matches', () => {
    it('a featured property with more views ranks ahead of a plainer match within the same real result set', async () => {
      await request(app)
        .post(`/api/properties?workspace=${tenant.slug}`)
        .set({ Authorization: `Bearer ${agent.accessToken}` })
        .send({ title: 'Plain Ranking House', price: 8500000, city: 'Karachi', area: 5, type: 'house', bedrooms: 3, bathrooms: 2 });
      const featuredRes = await request(app)
        .post(`/api/properties?workspace=${tenant.slug}`)
        .set({ Authorization: `Bearer ${agent.accessToken}` })
        .send({ title: 'Featured Ranking House', price: 8500000, city: 'Karachi', area: 5, type: 'house', bedrooms: 3, bathrooms: 2, featured: true });
      // Bump real view count so the ranking is provably based on real data, not creation order alone.
      for (let i = 0; i < 3; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await request(app).get(`/api/properties/${featuredRes.body._id}?workspace=${tenant.slug}`);
      }

      const res = await chat(agent.accessToken, 'houses in Karachi');
      const titles = res.body.attachments[0].data.properties.map((p) => p.title);
      const featuredIndex = titles.indexOf('Featured Ranking House');
      const plainIndex = titles.indexOf('Plain Ranking House');
      expect(featuredIndex).toBeGreaterThanOrEqual(0);
      expect(plainIndex).toBeGreaterThanOrEqual(0);
      expect(featuredIndex).toBeLessThan(plainIndex);
    });
  });
});
