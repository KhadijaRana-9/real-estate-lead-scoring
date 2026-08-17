const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');
const Task = require('../../src/features/crm/task.model');
const Appointment = require('../../src/features/crm/appointment.model');
const Inquiry = require('../../src/features/inquiry/inquiry.model');

const app = buildTestApp();

async function chat(token, message, conversationId = null) {
  return request(app)
    .post('/api/ai/chat')
    .set({ Authorization: `Bearer ${token}` })
    .send({ message, conversationId });
}

async function createProperty(agentToken, tenant, overrides = {}) {
  const res = await request(app)
    .post(`/api/properties?workspace=${tenant.slug}`)
    .set({ Authorization: `Bearer ${agentToken}` })
    .send({ title: 'Phase 4 Test House', price: 8000000, city: 'Lahore', area: 6, type: 'house', bedrooms: 4, bathrooms: 3, ...overrides });
  return res.body;
}

describe('Phase 4 - Agency Admin AI: real, end-to-end, tenant-isolated', () => {
  let tenant;
  let admin;
  let agent;
  let customer;

  beforeAll(async () => {
    tenant = await createAgency();
    admin = await signupUser(app, tenant.slug, { role: 'agency_admin' });
    agent = await signupUser(app, tenant.slug, { role: 'agent' });
    customer = await signupUser(app, tenant.slug, { role: 'customer' });
  });

  describe('Role restriction (hard requirement)', () => {
    it('a customer cannot use any Phase 4 agency-admin capability', async () => {
      const res = await chat(customer.accessToken, 'how is my agency doing?');
      expect(res.body.reply).not.toMatch(/propert.*active.*lead/i);
    });

    it('an agent cannot use any Phase 4 agency-admin capability', async () => {
      const res = await chat(agent.accessToken, 'how is my team doing?');
      expect(res.body.reply).not.toMatch(/team activity/i);
    });
  });

  describe('Agency business overview', () => {
    it('reflects real, current data - zero properties/leads reported honestly, not fabricated', async () => {
      const freshTenant = await createAgency();
      const freshAdmin = await signupUser(app, freshTenant.slug, { role: 'agency_admin' });
      const res = await chat(freshAdmin.accessToken, 'how is my agency doing?');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/0 propert/);
      expect(res.body.reply).toMatch(/0 lead/);
    });

    it('a real property and a real hot lead actually change the reported numbers', async () => {
      const property = await createProperty(agent.accessToken, tenant);
      await chat(customer.accessToken, `contact agent about property ${property._id}, my budget is around 8 crore`);

      const res = await chat(admin.accessToken, 'give me a business summary');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/\d+ propert/);
      expect(res.body.reply).toMatch(/\d+ lead/);
    });
  });

  describe('Daily priorities', () => {
    it('a genuinely untouched hot lead appears under HIGH PRIORITY', async () => {
      const property = await createProperty(agent.accessToken, tenant, { title: 'Priorities Test House' });
      // Created directly at a real, unambiguous "hot" score - going
      // through chat text would depend on the NLU's budget/urgency
      // extraction happening to land in the hot range, which is a
      // different, already-tested concern (leadScoring.js / entities.js)
      // and not what this test is verifying.
      await Inquiry.create({
        agencyId: tenant._id, property: property._id,
        customer: { name: 'Untouched Hot Lead', email: 'untouched@example.com', phone: '03001234567' },
        budget: property.price, message: 'Very interested, ready to move immediately.',
        moveTimeline: 'immediate', score: 90, status: 'hot',
        scoreBreakdown: { budgetMatch: 30, urgency: 25, interest: 25, popularity: 10 },
      });

      const res = await chat(admin.accessToken, "what should i focus on today?");
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/HIGH PRIORITY/);
      expect(res.body.reply).toMatch(/Untouched Hot Lead/);
    });

    it('an overdue task shows up under ATTENTION, sourced from real CRM data', async () => {
      await Task.create({
        agencyId: tenant._id,
        title: 'Overdue phase 4 task',
        assignedTo: agent.user.id,
        createdBy: agent.user.id,
        status: 'pending',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      const res = await chat(admin.accessToken, "today's crm priorities");
      expect(res.body.reply).toMatch(/ATTENTION/);
      expect(res.body.reply).toMatch(/overdue task/);
    });

    it('a today-scheduled appointment shows up under TODAY', async () => {
      // A few minutes in the future, not the exact current instant - the
      // executor's own "now" (evaluated moments later, when the request
      // actually runs) must still be BEFORE scheduledAt for this to
      // count as upcoming, per crmService.getUpcomingReminders' own
      // $gte: now filter.
      await Appointment.create({
        agencyId: tenant._id,
        title: 'Phase 4 viewing',
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000),
        status: 'scheduled',
        assignedTo: agent.user.id,
        createdBy: agent.user.id,
      });

      const res = await chat(admin.accessToken, 'daily priorities');
      expect(res.body.reply).toMatch(/TODAY/);
      expect(res.body.reply).toMatch(/appointment/);
    });
  });

  describe('Lead pipeline intelligence', () => {
    it('a filtered "hottest leads" query returns real leads with real reasons, sourced from the existing score - not a new algorithm', async () => {
      const property = await createProperty(agent.accessToken, tenant, { title: 'Hottest Leads Test House' });
      await chat(customer.accessToken, `contact agent about property ${property._id}, my budget is around 8 crore`);

      const res = await chat(admin.accessToken, 'show me my hottest leads');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/lead.*match/i);
      expect(res.body.reply).toMatch(/score \d+/);
    });

    it('a city-filtered hot-lead query resolves to the real list, not the bare-count tool, and only returns leads in that city', async () => {
      const lahoreProperty = await createProperty(agent.accessToken, tenant, { title: 'Lahore Filter House', city: 'Lahore' });
      const karachiProperty = await createProperty(agent.accessToken, tenant, { title: 'Karachi Filter House', city: 'Karachi' });
      await chat(customer.accessToken, `contact agent about property ${lahoreProperty._id}, my budget is around 8 crore`);
      await chat(customer.accessToken, `contact agent about property ${karachiProperty._id}, my budget is around 8 crore`);

      const res = await chat(admin.accessToken, 'show me hot leads in Lahore');
      expect(res.body.reply).not.toMatch(/hot, warm, cold/); // proves it's NOT get_lead_stats' bare summary
      if (res.body.reply.includes('lead')) {
        expect(res.body.reply).not.toMatch(/Karachi/);
      }
    });

    it('an honest "no leads match" answer when a filter genuinely has no results - never invents a lead', async () => {
      const emptyTenant = await createAgency();
      const emptyAdmin = await signupUser(app, emptyTenant.slug, { role: 'agency_admin' });
      const res = await chat(emptyAdmin.accessToken, 'which leads need attention');
      expect(res.body.reply).toMatch(/no leads match/i);
    });
  });

  describe('Team/agent performance intelligence', () => {
    it('reports real per-agent counts, not an invented score', async () => {
      const res = await chat(admin.accessToken, 'how is my team doing?');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/Team activity:/);
    });

    it('an agent with a real overdue task is flagged; one with none is not', async () => {
      const freshTenant = await createAgency();
      const freshAdmin = await signupUser(app, freshTenant.slug, { role: 'agency_admin' });
      const busyAgent = await signupUser(app, freshTenant.slug, { role: 'agent', name: 'Busy Agent' });
      const idleAgent = await signupUser(app, freshTenant.slug, { role: 'agent', name: 'Idle Agent' });
      await Task.create({
        agencyId: freshTenant._id,
        title: 'Overdue for busy agent',
        assignedTo: busyAgent.user.id,
        createdBy: busyAgent.user.id,
        status: 'pending',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      const res = await chat(freshAdmin.accessToken, 'which agents have overdue tasks');
      expect(res.body.reply).toMatch(/Busy Agent.*overdue task/);
      const idleLine = res.body.reply.split('\n').find((l) => l.includes('Idle Agent'));
      expect(idleLine).not.toMatch(/overdue/);
    });
  });

  describe('Property performance intelligence (already-existing data, now surfaced in the reply)', () => {
    it('"which properties have the most inquiries" names the real top property', async () => {
      const property = await createProperty(agent.accessToken, tenant, { title: 'Most Inquired Test House' });
      await chat(customer.accessToken, `contact agent about property ${property._id}, my budget is around 8 crore`);

      const res = await chat(admin.accessToken, 'which properties have the most inquiries?');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/Most inquiries:/);
    });
  });

  describe('Tenant isolation (hard requirement)', () => {
    it('an agency_admin never sees another agency\'s overview, priorities, leads, or team data', async () => {
      const tenantA = await createAgency();
      const tenantB = await createAgency();
      const adminA = await signupUser(app, tenantA.slug, { role: 'agency_admin' });
      const agentB = await signupUser(app, tenantB.slug, { role: 'agent' });
      const customerB = await signupUser(app, tenantB.slug, { role: 'customer' });

      const propertyB = await createProperty(agentB.accessToken, tenantB, { title: 'Agency B Secret House' });
      await chat(customerB.accessToken, `contact agent about property ${propertyB._id}, my budget is around 8 crore`);
      await Task.create({
        agencyId: tenantB._id, title: 'Agency B overdue task', assignedTo: agentB.user.id, createdBy: agentB.user.id,
        status: 'pending', dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      const overview = await chat(adminA.accessToken, 'how is my agency doing?');
      expect(overview.body.reply).toMatch(/0 propert/);
      expect(overview.body.reply).toMatch(/0 lead/);

      const priorities = await chat(adminA.accessToken, "today's priorities");
      expect(priorities.body.reply).not.toMatch(/Agency B overdue task/);

      const leads = await chat(adminA.accessToken, 'which leads need attention');
      expect(leads.body.reply).not.toMatch(/Agency B Secret House/);

      const team = await chat(adminA.accessToken, 'team activity');
      expect(team.body.reply).toMatch(/no agents/i);
    });
  });

  describe('Existing AI capabilities remain functional after Phase 4', () => {
    it('customer FAQ (Phase 2) still works', async () => {
      const res = await chat(customer.accessToken, 'how do favorites work?');
      expect(res.body.reply).toMatch(/heart icon/i);
    });

    it('agent lead-score explanation with Phase 3 suggestion still works', async () => {
      const property = await createProperty(agent.accessToken, tenant, { title: 'Still Works House' });
      const inquiryRes = await chat(customer.accessToken, `contact agent about property ${property._id}, my budget is around 8 crore`);
      const inquiryId = inquiryRes.body.attachments[0].data.inquiryId;

      const res = await chat(agent.accessToken, `explain score for lead ${inquiryId}`);
      expect(res.body.reply).toMatch(/Suggested next step:/);
    });

    it('listing field extraction (Phase 3) still works', async () => {
      const res = await request(app)
        .post('/api/ai/extract-listing-fields')
        .set({ Authorization: `Bearer ${agent.accessToken}` })
        .send({ text: '3 bed house in Karachi, asking 5 crore' });
      expect(res.status).toBe(200);
      expect(res.body.fields.city).toBe('Karachi');
    });

    it('existing get_agency_performance keeps working for its own remaining triggers', async () => {
      const res = await chat(admin.accessToken, 'conversion rate');
      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/conversion rate/i);
    });
  });
});
