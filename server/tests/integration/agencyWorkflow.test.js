const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createAgency, signupUser, createRoleUser } = require('../helpers/factories');
const Property = require('../../src/features/property/property.model');
const User = require('../../src/features/auth/auth.model');
const AgencyInvite = require('../../src/features/agency/agencyInvite.model');

const app = buildTestApp();

const propertyPayload = { title: 'Limit Test House', price: 5000000, city: 'Karachi', area: 6, type: 'house', bedrooms: 4, bathrooms: 3 };

describe('Subscription limit enforcement', () => {
  it('blocks property creation once the plan\'s maxProperties is reached', async () => {
    const agency = await createAgency({ subscriptionPlan: 'starter' }); // maxProperties: 50
    const agent = await signupUser(app, agency.slug, { role: 'agent' });

    // Fill up to the limit via direct inserts (avoids 50 real API round trips).
    const filler = Array.from({ length: 50 }, (_, i) => ({
      agencyId: agency._id,
      agent: agent.user.id,
      title: `Filler ${i}`,
      price: 1000000,
      city: 'Karachi',
      area: 5,
      type: 'house',
    }));
    await Property.insertMany(filler);

    const res = await request(app)
      .post('/api/properties')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send(propertyPayload);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/plan allows up to 50 properties/i);
  });

  it('allows property creation for a plan with room to spare', async () => {
    const agency = await createAgency({ subscriptionPlan: 'professional' }); // maxProperties: 500
    const agent = await signupUser(app, agency.slug, { role: 'agent' });

    const res = await request(app)
      .post('/api/properties')
      .set({ Authorization: `Bearer ${agent.accessToken}` })
      .send(propertyPayload);

    expect(res.status).toBe(201);
  });

  it('blocks a new agent invite once maxAgents is reached', async () => {
    const agency = await createAgency({ subscriptionPlan: 'starter' }); // maxAgents: 3
    const admin = await createRoleUser(agency._id, 'agency_admin');
    for (let i = 0; i < 3; i++) {
      await createRoleUser(agency._id, 'agent');
    }

    const res = await request(app)
      .post('/api/agency/invites')
      .set({ Authorization: `Bearer ${admin.accessToken}` })
      .send({ email: 'overflow-agent@example.com', role: 'agent' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/plan allows up to 3 agents/i);
  });

  it('does not count agency_admin invites against maxAgents', async () => {
    const agency = await createAgency({ subscriptionPlan: 'starter' });
    const admin = await createRoleUser(agency._id, 'agency_admin');
    for (let i = 0; i < 3; i++) {
      await createRoleUser(agency._id, 'agent');
    }

    const res = await request(app)
      .post('/api/agency/invites')
      .set({ Authorization: `Bearer ${admin.accessToken}` })
      .send({ email: 'second-admin@example.com', role: 'agency_admin' });

    expect(res.status).toBe(201);
  });
});

describe('Agent-applies-to-agency flow', () => {
  it('lets an agent submit an application, and blocks a duplicate pending one', async () => {
    const agency = await createAgency();

    const first = await request(app)
      .post('/api/agency/applications')
      .send({ agencyId: agency._id.toString(), name: 'Applicant One', email: 'applicant1@example.com', password: 'Password123!' });
    expect(first.status).toBe(201);
    expect(first.body.status).toBe('pending');

    const duplicate = await request(app)
      .post('/api/agency/applications')
      .send({ agencyId: agency._id.toString(), name: 'Applicant One', email: 'applicant1@example.com', password: 'Password123!' });
    expect(duplicate.status).toBe(409);
  });

  it('404s for an application to a non-existent/inactive agency', async () => {
    const res = await request(app)
      .post('/api/agency/applications')
      .send({ agencyId: '507f1f77bcf86cd799439011', name: 'Nobody', email: 'nobody@example.com', password: 'Password123!' });
    expect(res.status).toBe(404);
  });

  it('agency_admin can approve an application, and the new agent can then log in', async () => {
    const agency = await createAgency();
    const admin = await createRoleUser(agency._id, 'agency_admin');

    const apply = await request(app)
      .post('/api/agency/applications')
      .send({ agencyId: agency._id.toString(), name: 'Approved Agent', email: 'approved-agent@example.com', password: 'Password123!' });
    const applicationId = apply.body.id;

    const list = await request(app).get('/api/agency/applications?status=pending').set({ Authorization: `Bearer ${admin.accessToken}` });
    expect(list.body.some((a) => a._id === applicationId)).toBe(true);
    expect(list.body.every((a) => a.passwordHash === undefined)).toBe(true);

    const approve = await request(app)
      .post(`/api/agency/applications/${applicationId}/approve`)
      .set({ Authorization: `Bearer ${admin.accessToken}` });
    expect(approve.status).toBe(200);
    expect(approve.body.role).toBe('agent');

    const login = await request(app)
      .post(`/api/auth/login?workspace=${agency.slug}`)
      .send({ email: 'approved-agent@example.com', password: 'Password123!' });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('agent');
  });

  it('agency_admin can reject an application, and the applicant can re-apply afterward', async () => {
    const agency = await createAgency();
    const admin = await createRoleUser(agency._id, 'agency_admin');

    const apply = await request(app)
      .post('/api/agency/applications')
      .send({ agencyId: agency._id.toString(), name: 'Rejected Agent', email: 'rejected-agent@example.com', password: 'Password123!' });

    const reject = await request(app)
      .post(`/api/agency/applications/${apply.body.id}/reject`)
      .set({ Authorization: `Bearer ${admin.accessToken}` })
      .send({ reason: 'Not a fit right now' });
    expect(reject.status).toBe(200);
    expect(reject.body.status).toBe('rejected');
    expect(reject.body.passwordHash).toBeUndefined();

    const reapply = await request(app)
      .post('/api/agency/applications')
      .send({ agencyId: agency._id.toString(), name: 'Rejected Agent', email: 'rejected-agent@example.com', password: 'Password123!' });
    expect(reapply.status).toBe(201);
  });

  it('an agency_admin from a different agency cannot approve another agency\'s application', async () => {
    const agencyA = await createAgency();
    const agencyB = await createAgency();
    const adminB = await createRoleUser(agencyB._id, 'agency_admin');

    const apply = await request(app)
      .post('/api/agency/applications')
      .send({ agencyId: agencyA._id.toString(), name: 'Cross Tenant', email: 'cross-tenant@example.com', password: 'Password123!' });

    const approve = await request(app)
      .post(`/api/agency/applications/${apply.body.id}/approve`)
      .set({ Authorization: `Bearer ${adminB.accessToken}` });
    expect(approve.status).toBe(404);
  });
});

describe('Agency-invites-agent flow', () => {
  it('accepted invite disappears from listInvites and never leaks tokenHash', async () => {
    const agency = await createAgency();
    const admin = await createRoleUser(agency._id, 'agency_admin');

    const invite = await request(app)
      .post('/api/agency/invites')
      .set({ Authorization: `Bearer ${admin.accessToken}` })
      .send({ email: 'invitee@example.com', role: 'agent' });
    expect(invite.status).toBe(201);

    const beforeAccept = await request(app).get('/api/agency/invites').set({ Authorization: `Bearer ${admin.accessToken}` });
    expect(beforeAccept.body.some((i) => i.email === 'invitee@example.com')).toBe(true);
    expect(beforeAccept.body.every((i) => i.tokenHash === undefined)).toBe(true);

    const token = invite.body.inviteUrl.split('token=')[1];
    const accept = await request(app)
      .post('/api/agency/invites/accept')
      .send({ token, name: 'Invitee Agent', password: 'Password123!' });
    expect(accept.status).toBe(201);
    expect(accept.body.user.role).toBe('agent');

    const afterAccept = await request(app).get('/api/agency/invites').set({ Authorization: `Bearer ${admin.accessToken}` });
    expect(afterAccept.body.some((i) => i.email === 'invitee@example.com')).toBe(false);
  });

  it('blocks revoking an already-accepted invite', async () => {
    const agency = await createAgency();
    const admin = await createRoleUser(agency._id, 'agency_admin');

    const invite = await request(app)
      .post('/api/agency/invites')
      .set({ Authorization: `Bearer ${admin.accessToken}` })
      .send({ email: 'accepted-then-revoked@example.com', role: 'agent' });
    const token = invite.body.inviteUrl.split('token=')[1];

    await request(app).post('/api/agency/invites/accept').send({ token, name: 'Someone', password: 'Password123!' });

    const revoke = await request(app)
      .delete(`/api/agency/invites/${invite.body.invite._id}`)
      .set({ Authorization: `Bearer ${admin.accessToken}` });
    expect(revoke.status).toBe(409);
  });

  it('blocks inviting the same email twice while a pending invite already exists', async () => {
    const agency = await createAgency();
    const admin = await createRoleUser(agency._id, 'agency_admin');

    const first = await request(app)
      .post('/api/agency/invites')
      .set({ Authorization: `Bearer ${admin.accessToken}` })
      .send({ email: 'duplicate-invite@example.com', role: 'agent' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/agency/invites')
      .set({ Authorization: `Bearer ${admin.accessToken}` })
      .send({ email: 'duplicate-invite@example.com', role: 'agent' });
    expect(second.status).toBe(409);
  });

  it('rejects an expired invite token and never creates the user', async () => {
    const agency = await createAgency();
    const admin = await createRoleUser(agency._id, 'agency_admin');

    const invite = await request(app)
      .post('/api/agency/invites')
      .set({ Authorization: `Bearer ${admin.accessToken}` })
      .send({ email: 'expired-invite@example.com', role: 'agent' });
    const token = invite.body.inviteUrl.split('token=')[1];

    // Force the invite into the past, same way an aged-out invite would
    // look, without waiting on Mongo's TTL monitor (which isn't instant).
    await AgencyInvite.updateOne({ _id: invite.body.invite._id }, { expiresAt: new Date(Date.now() - 1000) });

    const accept = await request(app)
      .post('/api/agency/invites/accept')
      .send({ token, name: 'Too Late', password: 'Password123!' });
    expect(accept.status).toBe(400);

    const user = await User.findOne({ email: 'expired-invite@example.com' });
    expect(user).toBeNull();
  });

  it('rejects an invalid/garbage invite token', async () => {
    const accept = await request(app)
      .post('/api/agency/invites/accept')
      .send({ token: 'not-a-real-token-at-all-1234567890', name: 'Nobody', password: 'Password123!' });
    expect(accept.status).toBe(400);
  });

  it('ignores a client-supplied agencyId - the accepted user always belongs to the INVITE\'s own agency', async () => {
    const agencyA = await createAgency();
    const agencyB = await createAgency();
    const adminA = await createRoleUser(agencyA._id, 'agency_admin');

    const invite = await request(app)
      .post('/api/agency/invites')
      .set({ Authorization: `Bearer ${adminA.accessToken}` })
      .send({ email: 'tenant-hijack-attempt@example.com', role: 'agent' });
    const token = invite.body.inviteUrl.split('token=')[1];

    const accept = await request(app)
      .post('/api/agency/invites/accept')
      .send({ token, name: 'Hijacker', password: 'Password123!', agencyId: agencyB._id.toString() });
    expect(accept.status).toBe(201);
    expect(accept.body.user.agencyId).toBe(agencyA._id.toString());

    const user = await User.findOne({ email: 'tenant-hijack-attempt@example.com' });
    expect(user.agencyId.toString()).toBe(agencyA._id.toString());
  });

  it('an already-used invite token cannot be accepted a second time', async () => {
    const agency = await createAgency();
    const admin = await createRoleUser(agency._id, 'agency_admin');

    const invite = await request(app)
      .post('/api/agency/invites')
      .set({ Authorization: `Bearer ${admin.accessToken}` })
      .send({ email: 'reuse-attempt@example.com', role: 'agent' });
    const token = invite.body.inviteUrl.split('token=')[1];

    const first = await request(app)
      .post('/api/agency/invites/accept')
      .send({ token, name: 'First Use', password: 'Password123!' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/agency/invites/accept')
      .send({ token, name: 'Second Use', password: 'DifferentPass123!' });
    expect(second.status).toBe(400);
  });

  it('a plain agent cannot reach team/invite or agency-profile management routes', async () => {
    const agency = await createAgency();
    const agent = await createRoleUser(agency._id, 'agent');

    const invites = await request(app).get('/api/agency/invites').set({ Authorization: `Bearer ${agent.accessToken}` });
    expect(invites.status).toBe(403);

    const profile = await request(app).get('/api/agency/profile').set({ Authorization: `Bearer ${agent.accessToken}` });
    expect(profile.status).toBe(403);
  });
});

describe('Team management', () => {
  it('lists team members and lets agency_admin remove an agent', async () => {
    const agency = await createAgency();
    const admin = await createRoleUser(agency._id, 'agency_admin');
    const agent = await createRoleUser(agency._id, 'agent');

    const list = await request(app).get('/api/agency/team').set({ Authorization: `Bearer ${admin.accessToken}` });
    expect(list.status).toBe(200);
    expect(list.body.some((m) => m._id === agent.user._id.toString())).toBe(true);

    const remove = await request(app).delete(`/api/agency/team/${agent.user._id}`).set({ Authorization: `Bearer ${admin.accessToken}` });
    expect(remove.status).toBe(204);

    const stillThere = await User.findById(agent.user._id);
    expect(stillThere).toBeNull();
  });

  it('blocks removing another agency_admin and blocks self-removal', async () => {
    const agency = await createAgency();
    const admin = await createRoleUser(agency._id, 'agency_admin');
    const secondAdmin = await createRoleUser(agency._id, 'agency_admin');

    const removeOther = await request(app).delete(`/api/agency/team/${secondAdmin.user._id}`).set({ Authorization: `Bearer ${admin.accessToken}` });
    expect(removeOther.status).toBe(403);

    const removeSelf = await request(app).delete(`/api/agency/team/${admin.user._id}`).set({ Authorization: `Bearer ${admin.accessToken}` });
    expect(removeSelf.status).toBe(400);
  });
});
