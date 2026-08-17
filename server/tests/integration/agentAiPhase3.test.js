const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser } = require('../helpers/factories');
const Task = require('../../src/features/crm/task.model');
const Inquiry = require('../../src/features/inquiry/inquiry.model');

const app = buildTestApp();

async function chat(token, message, conversationId = null) {
  return request(app)
    .post('/api/ai/chat')
    .set({ Authorization: `Bearer ${token}` })
    .send({ message, conversationId });
}

async function createRealLead(agencyAdminToken, tenant, agent, customerToken) {
  const propRes = await request(app)
    .post(`/api/properties?workspace=${tenant.slug}`)
    .set({ Authorization: `Bearer ${agent.accessToken}` })
    .send({ title: 'Phase 3 Lead Test House', price: 8000000, city: 'Lahore', area: 6, type: 'house', bedrooms: 4, bathrooms: 3 });
  const property = propRes.body;

  const inquiryRes = await chat(customerToken, `contact agent about property ${property._id}, my budget is around 8 crore`);
  return { property, inquiryId: inquiryRes.body.attachments[0].data.inquiryId };
}

describe('Phase 3 - Agent/Agency Admin AI: lead follow-up suggestions', () => {
  let tenant;
  let agent;
  let customer;

  beforeAll(async () => {
    tenant = await createAgency();
    agent = await signupUser(app, tenant.slug, { role: 'agent' });
    customer = await signupUser(app, tenant.slug, { role: 'customer' });
  });

  it('a fresh, untouched lead gets both the existing score breakdown AND a real suggested next step', async () => {
    const { inquiryId } = await createRealLead(null, tenant, agent, customer.accessToken);

    const res = await chat(agent.accessToken, `explain score for lead ${inquiryId}`);
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/scored \d+\/100/); // existing breakdown, unchanged
    expect(res.body.reply).toMatch(/Budget match: \d+ points/); // existing breakdown, unchanged
    expect(res.body.reply).toMatch(/Suggested next step:/); // new, Phase 3
  });

  it('"what should I do about this lead" routes to the same enriched answer (new trigger phrasing)', async () => {
    const { inquiryId } = await createRealLead(null, tenant, agent, customer.accessToken);
    const res = await chat(agent.accessToken, `what should i do about this lead ${inquiryId}`);
    expect(res.body.reply).toMatch(/Suggested next step:/);
  });

  it('a lead with an already-open task gets told so, instead of a duplicate "reach out" suggestion', async () => {
    const { inquiryId } = await createRealLead(null, tenant, agent, customer.accessToken);
    await Task.create({
      agencyId: tenant._id,
      title: 'Follow up with lead',
      relatedInquiry: inquiryId,
      assignedTo: agent.user.id,
      createdBy: agent.user.id,
      status: 'pending',
    });

    const res = await chat(agent.accessToken, `explain score for lead ${inquiryId}`);
    expect(res.body.reply).toMatch(/follow-up task is already open/i);
  });

  it('a closed_won lead is correctly reported as needing no further action', async () => {
    const { inquiryId } = await createRealLead(null, tenant, agent, customer.accessToken);
    await Inquiry.updateOne({ _id: inquiryId }, { pipelineStage: 'closed_won' });

    const res = await chat(agent.accessToken, `explain score for lead ${inquiryId}`);
    expect(res.body.reply).toMatch(/closed \(won\).*no further action/i);
  });

  it('tenant isolation is preserved: an agent from a different agency cannot get a suggestion for this lead', async () => {
    const { inquiryId } = await createRealLead(null, tenant, agent, customer.accessToken);
    const otherTenant = await createAgency();
    const otherAgent = await signupUser(app, otherTenant.slug, { role: 'agent' });

    const res = await chat(otherAgent.accessToken, `explain score for lead ${inquiryId}`);
    expect(res.body.reply).toMatch(/not found or not accessible/i);
  });

  it('the real matching criteria now appear in a recommendation reply, sourced from real data', async () => {
    const { property } = await createRealLead(null, tenant, agent, customer.accessToken);
    await request(app)
      .post(`/api/properties?workspace=${tenant.slug}`)
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ title: 'Similar House Nearby', price: 8200000, city: 'Lahore', area: 6, type: 'house', bedrooms: 4, bathrooms: 3 });

    const res = await chat(agent.accessToken, `recommend properties similar to ${property._id}`);
    expect(res.body.reply).toMatch(/in Lahore \(same type, closest in price\)/);
  });
});

describe('Phase 3 - Listing AI: POST /api/ai/extract-listing-fields', () => {
  let tenant;
  let agent;
  let admin;
  let customer;

  beforeAll(async () => {
    tenant = await createAgency();
    agent = await signupUser(app, tenant.slug, { role: 'agent' });
    admin = await signupUser(app, tenant.slug, { role: 'agency_admin' });
    customer = await signupUser(app, tenant.slug, { role: 'customer' });
  });

  it('an agent extracts real, correct structured fields from a rough listing description', async () => {
    const res = await request(app)
      .post('/api/ai/extract-listing-fields')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ text: '3 bed 2 bath house in Karachi, 2 kanal, asking 4.5 crore' });

    expect(res.status).toBe(200);
    expect(res.body.fields).toMatchObject({
      city: 'Karachi', type: 'house', bedrooms: 3, bathrooms: 2, area: 40, areaUnit: 'marla', price: 45000000,
    });
    expect(res.body.foundFields).toEqual(expect.arrayContaining(['city', 'type', 'bedrooms', 'bathrooms', 'area', 'areaUnit', 'price']));
  });

  it('an agency_admin can also use it (same wizard-role gate as /property-assist)', async () => {
    const res = await request(app)
      .post('/api/ai/extract-listing-fields')
      .set({ Authorization: `Bearer ${admin.accessToken}` })
      .send({ text: '10 marla flat in Islamabad' });
    expect(res.status).toBe(200);
    expect(res.body.fields.city).toBe('Islamabad');
  });

  it('a customer is rejected - RBAC unchanged, this stays wizard-only', async () => {
    const res = await request(app)
      .post('/api/ai/extract-listing-fields')
      .set({ Authorization: `Bearer ${customer.accessToken}` })
      .send({ text: '3 bed house in Lahore, asking 5 crore' });
    expect(res.status).toBe(403);
  });

  it('an unauthenticated request is rejected', async () => {
    const res = await request(app).post('/api/ai/extract-listing-fields').send({ text: '3 bed house in Lahore, asking 5 crore' });
    expect(res.status).toBe(401);
  });

  it('rejects text that is too short (validation, not a silent empty extraction)', async () => {
    const res = await request(app)
      .post('/api/ai/extract-listing-fields')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ text: 'short' });
    expect(res.status).toBe(400);
  });

  it('sparse text extracts only what it can genuinely find, nothing invented', async () => {
    const res = await request(app)
      .post('/api/ai/extract-listing-fields')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send({ text: 'a lovely property somewhere nice' });
    expect(res.status).toBe(200);
    expect(res.body.foundFields).toEqual([]);
  });
});
