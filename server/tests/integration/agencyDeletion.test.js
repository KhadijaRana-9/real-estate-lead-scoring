// FIND-02 / FIND-03 regression: agency deletion must cascade EVERY
// agency-scoped collection (not just the 4 the original code covered) and
// must do so atomically (all-or-nothing), never leaving orphaned records
// behind on a mid-cascade failure. This file builds one full fixture
// (one document in every one of the 18 agencyId-bearing collections) for a
// target agency being deleted AND a second, untouched control agency, plus
// a fixture of genuinely platform-global records - then proves the delete
// cleans up exactly the target agency's data and nothing else.
const mongoose = require('mongoose');
const Agency = require('../../src/features/agency/agency.model');
const User = require('../../src/features/auth/auth.model');
const Property = require('../../src/features/property/property.model');
const Inquiry = require('../../src/features/inquiry/inquiry.model');
const RefreshToken = require('../../src/features/auth/refreshToken.model');
const AgencyApplication = require('../../src/features/agency/agencyApplication.model');
const AgencyInvite = require('../../src/features/agency/agencyInvite.model');
const Conversation = require('../../src/features/ai/conversation.model');
const AuditLog = require('../../src/features/audit/auditLog.model');
const Invoice = require('../../src/features/billing/invoice.model');
const Blog = require('../../src/features/blog/blog.model');
const Appointment = require('../../src/features/crm/appointment.model');
const Task = require('../../src/features/crm/task.model');
const Favorite = require('../../src/features/favorite/favorite.model');
const Follow = require('../../src/features/follow/follow.model');
const Project = require('../../src/features/project/project.model');
const PropertyReview = require('../../src/features/propertyReview/propertyReview.model');
const Review = require('../../src/features/review/review.model');
const SuccessStory = require('../../src/features/successStory/successStory.model');
const Award = require('../../src/features/award/award.model');
const Developer = require('../../src/features/developer/developer.model');
const NewsletterSubscriber = require('../../src/features/newsletter/newsletter.model');
const Partner = require('../../src/features/partner/partner.model');
const SearchLog = require('../../src/features/searchLog/searchLog.model');
const agenciesService = require('../../src/features/platform/agencies.service');
const { createAgency, unique } = require('../../tests/helpers/factories');

// Expected document count per collection per fixture - 1 everywhere except
// User, which seedFullFixture creates two of (an agent and a customer).
const EXPECTED_COUNT = { User: 2 };

const AGENCY_SCOPED = [
  ['User', User],
  ['Property', Property],
  ['Inquiry', Inquiry],
  ['RefreshToken', RefreshToken],
  ['AgencyApplication', AgencyApplication],
  ['AgencyInvite', AgencyInvite],
  ['Conversation', Conversation],
  ['AuditLog', AuditLog],
  ['Invoice', Invoice],
  ['Blog', Blog],
  ['Appointment', Appointment],
  ['Task', Task],
  ['Favorite', Favorite],
  ['Follow', Follow],
  ['Project', Project],
  ['PropertyReview', PropertyReview],
  ['Review', Review],
  ['SuccessStory', SuccessStory],
];

// One document in every agency-scoped collection, all wired to the same
// agency + a couple of real users/properties so required refs/uniqueness
// constraints (blog slug, project slug, invite tokenHash, per-property
// favorite, per-agency follow/review, per-inquiry success story) are all
// satisfiable independently per agency.
async function seedFullFixture(agency) {
  const tag = unique('fx');
  const agent = await User.create({ name: 'Agent', email: `agent-${tag}@example.com`, passwordHash: 'x', role: 'agent', agencyId: agency._id });
  const customer = await User.create({ name: 'Customer', email: `cust-${tag}@example.com`, passwordHash: 'x', role: 'customer', agencyId: agency._id });
  const property = await Property.create({ agencyId: agency._id, title: `Fixture Property ${tag}`, agent: agent._id });
  const inquiry = await Inquiry.create({
    agencyId: agency._id,
    property: property._id,
    customer: { name: 'Lead', email: `lead-${tag}@example.com` },
    budget: 1000000,
    score: 50,
    status: 'warm',
  });

  await RefreshToken.create({ user: customer._id, agencyId: agency._id, tokenHash: `rt-${tag}`, expiresAt: new Date(Date.now() + 86400000) });
  await AgencyApplication.create({ agencyId: agency._id, name: 'Applicant', email: `app-${tag}@example.com`, passwordHash: 'x' });
  await AgencyInvite.create({ agencyId: agency._id, email: `invite-${tag}@example.com`, tokenHash: `it-${tag}`, invitedBy: agent._id, expiresAt: new Date(Date.now() + 86400000) });
  await Conversation.create({ agencyId: agency._id, user: agent._id, messages: [{ role: 'user', content: 'hi' }] });
  await AuditLog.create({ agencyId: agency._id, actor: { id: agent._id, name: 'Agent', role: 'agent' }, action: 'test.action', targetType: 'Property', targetId: property._id });
  await Invoice.create({ agencyId: agency._id, plan: 'starter', periodStart: new Date(), periodEnd: new Date(), amount: 100, usageSnapshot: { properties: 1, agents: 1 } });
  await Blog.create({ agencyId: agency._id, author: agent._id, title: `Post ${tag}`, slug: `post-${tag}`, content: 'content' });
  await Appointment.create({ agencyId: agency._id, title: 'Viewing', scheduledAt: new Date(), assignedTo: agent._id, createdBy: agent._id });
  await Task.create({ agencyId: agency._id, title: 'Follow up', assignedTo: agent._id, createdBy: agent._id });
  await Favorite.create({ agencyId: agency._id, property: property._id, user: customer._id });
  await Follow.create({ agencyId: agency._id, user: customer._id });
  const project = await Project.create({ agencyId: agency._id, name: `Project ${tag}`, slug: `project-${tag}` });
  await PropertyReview.create({ agencyId: agency._id, property: property._id, author: { id: customer._id, name: 'Customer' }, rating: 5 });
  await Review.create({ agencyId: agency._id, author: { id: customer._id, name: 'Customer' }, rating: 5 });
  await SuccessStory.create({ agencyId: agency._id, inquiry: inquiry._id, property: property._id, submittedBy: agent._id, customerDisplayName: 'C.', headline: 'Great sale', story: 'It went well.' });

  return { agent, customer, property, inquiry, project };
}

async function seedGlobalFixture() {
  const tag = unique('global');
  const award = await Award.create({ title: `Award ${tag}`, issuer: 'Test', year: 2024 });
  const developer = await Developer.create({ name: `Dev ${tag}`, slug: `dev-${tag}` });
  const subscriber = await NewsletterSubscriber.create({ email: `sub-${tag}@example.com` });
  const partner = await Partner.create({ name: `Partner ${tag}`, logo: 'https://example.com/logo.png' });
  const searchLog = await SearchLog.create({ term: `term-${tag}` });
  return { award, developer, subscriber, partner, searchLog };
}

describe('Agency deletion: full cascade + transactional integrity (FIND-02 / FIND-03)', () => {
  it('deletes every agency-scoped record for the target agency across all 18 collections, leaves a control agency and global records completely untouched', async () => {
    const target = await createAgency();
    const control = await createAgency();

    await seedFullFixture(target);
    const controlFixture = await seedFullFixture(control);
    const globalFixture = await seedGlobalFixture();

    await agenciesService.deleteAgency(target._id.toString());

    // Target: agency itself gone, zero documents left in any scoped collection.
    expect(await Agency.findById(target._id)).toBeNull();
    for (const [, Model] of AGENCY_SCOPED) {
      const count = await Model.countDocuments({ agencyId: target._id });
      expect(count).toBe(0);
    }

    // Control agency: completely untouched.
    expect(await Agency.findById(control._id)).not.toBeNull();
    for (const [name, Model] of AGENCY_SCOPED) {
      const count = await Model.countDocuments({ agencyId: control._id });
      expect(count).toBe(EXPECTED_COUNT[name] || 1);
    }
    expect(await Property.findById(controlFixture.property._id)).not.toBeNull();
    expect(await Project.findById(controlFixture.project._id)).not.toBeNull();

    // Genuinely global/platform-scoped records: untouched.
    expect(await Award.findById(globalFixture.award._id)).not.toBeNull();
    expect(await Developer.findById(globalFixture.developer._id)).not.toBeNull();
    expect(await NewsletterSubscriber.findById(globalFixture.subscriber._id)).not.toBeNull();
    expect(await Partner.findById(globalFixture.partner._id)).not.toBeNull();
    expect(await SearchLog.findById(globalFixture.searchLog._id)).not.toBeNull();
  });

  it('rolls back the ENTIRE delete if any single collection fails mid-cascade - agency and all child records remain exactly as they were', async () => {
    const target = await createAgency();
    const fixture = await seedFullFixture(target);

    // Force a failure partway through the cascade, for this test only.
    const spy = jest.spyOn(Follow, 'deleteMany').mockImplementationOnce(() => {
      throw new Error('Simulated mid-cascade failure');
    });

    await expect(agenciesService.deleteAgency(target._id.toString())).rejects.toThrow('Simulated mid-cascade failure');
    spy.mockRestore();

    // Nothing was actually removed - real rollback, not "no error thrown".
    expect(await Agency.findById(target._id)).not.toBeNull();
    for (const [name, Model] of AGENCY_SCOPED) {
      const count = await Model.countDocuments({ agencyId: target._id });
      expect(count).toBe(EXPECTED_COUNT[name] || 1);
    }
    expect(await Property.findById(fixture.property._id)).not.toBeNull();
    expect(await Inquiry.findById(fixture.inquiry._id)).not.toBeNull();
  });

  it('still 404s cleanly for a nonexistent agency id (unaffected by the transaction change)', async () => {
    await expect(agenciesService.deleteAgency(new mongoose.Types.ObjectId().toString())).rejects.toMatchObject({ status: 404 });
  });
});
