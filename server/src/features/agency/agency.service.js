const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Agency = require('./agency.model');
const AgencyInvite = require('./agencyInvite.model');
const AgencyApplication = require('./agencyApplication.model');
const Property = require('../property/property.model');
const Inquiry = require('../inquiry/inquiry.model');
const User = require('../auth/auth.model');
const billingService = require('../billing/billing.service');
const emailProvider = require('../../shared/notifications/emailProvider');
const auditLog = require('../audit/auditLog.service');

const SALT_ROUNDS = 10;
const INVITE_TOKEN_BYTES = 32;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function notFound(what) {
  const err = new Error(`${what} not found`);
  err.status = 404;
  return err;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Single authoritative path for creating an ACTIVE agency membership -
// the only place a User with role 'agent'/'agency_admin' ever gets
// created. Both callers below only reach this at the moment a human has
// actually authorized it (an invitee accepting, or an admin approving an
// application) - public self-signup (auth.service.js) never calls this
// and can only ever create a 'customer'. Re-checks the seat limit right
// before creation regardless of any earlier pre-check the caller already
// did, so there is exactly one place a seat is ever actually consumed.
async function createActiveMembership({ name, email, passwordHash, role, agencyId }) {
  if (role === 'agent') {
    await billingService.assertWithinLimit(agencyId, 'agents');
  }
  return User.create({ name, email, passwordHash, role, agencyId });
}

// Real aggregation from live Property/Inquiry/User data - no invented
// numbers. Conversion rate is genuinely 0% until leads actually get
// carried through the CRM pipeline (see inquiry.service.js's
// moveLeadStage) to closed_won, which is correct: there's no historical
// pipeline data to fabricate a better-looking number from.
async function getPerformance(tenantId) {
  const [totalProperties, totalAgents, inquiries, viewsAgg, byAgent] = await Promise.all([
    Property.countDocuments({ agencyId: tenantId }),
    User.countDocuments({ agencyId: tenantId, role: 'agent' }),
    Inquiry.find({ agencyId: tenantId }).select('score pipelineStage'),
    Property.aggregate([{ $match: { agencyId: tenantId } }, { $group: { _id: null, totalViews: { $sum: '$views' } } }]),
    Property.aggregate([
      { $match: { agencyId: tenantId } },
      { $group: { _id: '$agent', propertyCount: { $sum: 1 }, totalViews: { $sum: '$views' } } },
      { $sort: { totalViews: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const agentIds = byAgent.map((a) => a._id).filter(Boolean);
  const agentDocs = await User.find({ _id: { $in: agentIds } }).select('name email');
  const agentById = new Map(agentDocs.map((a) => [a._id.toString(), a]));

  const totalLeads = inquiries.length;
  const closedWon = inquiries.filter((i) => i.pipelineStage === 'closed_won').length;
  const avgLeadScore = totalLeads ? Math.round(inquiries.reduce((sum, i) => sum + i.score, 0) / totalLeads) : 0;

  return {
    totalProperties,
    totalAgents,
    totalLeads,
    avgLeadScore,
    conversionRate: totalLeads ? Math.round((closedWon / totalLeads) * 1000) / 10 : 0,
    totalViews: viewsAgg[0]?.totalViews || 0,
    topAgents: byAgent
      .filter((a) => a._id)
      .map((a) => ({
        agentId: a._id,
        name: agentById.get(a._id.toString())?.name || 'Unknown',
        propertyCount: a.propertyCount,
        totalViews: a.totalViews,
      })),
  };
}

async function getBranding(tenantId) {
  const agency = await Agency.findById(tenantId).select('companyName logo favicon primaryColor secondaryColor customDomain');
  if (!agency) throw notFound('Agency');
  return agency;
}

// Full self-service profile read - backs the agency_admin's "Agency
// Profile" settings form (prefills every field PROFILE_FIELDS below can
// edit, plus the read-only platform-controlled ones like verified).
async function getProfile(tenantId) {
  const agency = await Agency.findById(tenantId);
  if (!agency) throw notFound('Agency');
  return agency;
}

const BRANDING_FIELDS = ['logo', 'favicon', 'primaryColor', 'secondaryColor'];

async function updateBranding(tenantId, requester, data) {
  const agency = await Agency.findById(tenantId);
  if (!agency) throw notFound('Agency');

  const changedFields = [];
  for (const field of BRANDING_FIELDS) {
    if (data[field] !== undefined) {
      agency[field] = data[field];
      changedFields.push(field);
    }
  }
  await agency.save();
  auditLog.record({ tenantId, actor: requester, action: 'agency.branding_update', targetType: 'Agency', targetId: tenantId, metadata: { fields: changedFields } });
  return agency;
}

const PROFILE_FIELDS = [
  'companyName',
  'phone',
  'contactEmail',
  'description',
  'whatsapp',
  'website',
  'address',
  'city',
  'country',
  'coverBanner',
  'licenseNumber',
  'establishedYear',
  'languages',
  'specializations',
  'officeLocations',
  'businessHours',
  'socialMedia',
  'ceoMessage',
  'mission',
  'vision',
  'timeline',
  'awards',
  'officeGallery',
];

// Deliberately excludes verified/featured/subscriptionPlan - those are
// platform-controlled (see platform/agencies.service.js), never
// agency-self-declared, so the public marketplace badges mean something.
async function updateProfile(tenantId, requester, data) {
  const agency = await Agency.findById(tenantId);
  if (!agency) throw notFound('Agency');

  const changedFields = [];
  for (const field of PROFILE_FIELDS) {
    if (data[field] !== undefined) {
      agency[field] = data[field];
      changedFields.push(field);
    }
  }
  await agency.save();
  auditLog.record({ tenantId, actor: requester, action: 'agency.profile_update', targetType: 'Agency', targetId: tenantId, metadata: { fields: changedFields } });
  return agency;
}

async function inviteUser(tenantId, inviter, { email, role }) {
  // Only 'agent' invites count toward maxAgents (billing.service.js's
  // computeUsage only counts role:'agent' users, not agency_admin) -
  // early feedback only, the authoritative check (the moment a seat is
  // actually consumed) runs again in acceptInvite below, since multiple
  // invites can be outstanding against the same one remaining seat.
  if (role === 'agent') {
    await billingService.assertWithinLimit(tenantId, 'agents');
  }

  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ agencyId: tenantId, email: normalizedEmail });
  if (existingUser) {
    const err = new Error('A user with this email already belongs to this agency');
    err.status = 409;
    throw err;
  }

  const existingInvite = await AgencyInvite.findOne({
    agencyId: tenantId,
    email: normalizedEmail,
    revokedAt: null,
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (existingInvite) {
    const err = new Error('This email already has a pending invitation to this agency');
    err.status = 409;
    throw err;
  }

  const rawToken = crypto.randomBytes(INVITE_TOKEN_BYTES).toString('hex');
  const invite = await AgencyInvite.create({
    agencyId: tenantId,
    email: normalizedEmail,
    role,
    tokenHash: hashToken(rawToken),
    invitedBy: inviter.id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const agency = await Agency.findById(tenantId).select('companyName slug');
  const inviteUrl = `${process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/accept-invite?token=${rawToken}`;

  const { sent, reason } = await emailProvider.sendMail({
    to: email,
    subject: `You've been invited to join ${agency.companyName} on DreamHomes`,
    html: `<p>${inviter.name} invited you to join <strong>${agency.companyName}</strong> on DreamHomes as a${role === 'agency_admin' ? 'n agency admin' : 'n agent'}.</p><p>Your login email will be: <strong>${email}</strong></p><p><a href="${inviteUrl}">Accept invite &amp; set your password</a></p><p>Click the link above, choose your own password, and you'll be signed in right away. This link is single-use and expires in 7 days.</p>`,
  });

  auditLog.record({ tenantId, actor: inviter, action: 'agency.invite_user', targetType: 'AgencyInvite', targetId: invite._id, metadata: { email, role, emailSent: sent } });

  return { invite, emailSent: sent, emailSkippedReason: sent ? undefined : reason, inviteUrl };
}

// Only genuinely still-pending invites - an accepted one must not keep
// showing up under "Pending Invitations" until its 7-day TTL index
// deletes it. tokenHash excluded: it's never needed by the frontend and
// there's no reason to return it (SHA-256 of a random token, not
// exploitable, but excluding it matches the same hygiene already
// applied to listApplications/listActiveSessions elsewhere).
async function listInvites(tenantId) {
  return AgencyInvite.find({ agencyId: tenantId, revokedAt: null, acceptedAt: null })
    .select('-tokenHash')
    .sort({ createdAt: -1 });
}

async function revokeInvite(tenantId, id) {
  const invite = await AgencyInvite.findOne({ _id: id, agencyId: tenantId });
  if (!invite) throw notFound('Invite');
  if (invite.acceptedAt) {
    const err = new Error('This invite has already been accepted and cannot be revoked');
    err.status = 409;
    throw err;
  }
  invite.revokedAt = new Date();
  await invite.save();
  return invite;
}

async function acceptInvite({ token, name, password }) {
  const invite = await AgencyInvite.findOne({ tokenHash: hashToken(token) });
  if (!invite || invite.revokedAt || invite.acceptedAt) {
    const err = new Error('This invite link is invalid or has already been used');
    err.status = 400;
    throw err;
  }
  if (invite.expiresAt < new Date()) {
    const err = new Error('This invite link has expired');
    err.status = 400;
    throw err;
  }

  const existingUser = await User.findOne({ agencyId: invite.agencyId, email: invite.email });
  if (existingUser) {
    const err = new Error('An account with this email already exists in this agency');
    err.status = 409;
    throw err;
  }

  // createActiveMembership re-checks the seat limit authoritatively -
  // this is the moment it's actually consumed (see inviteUser's early
  // pre-check above for why both exist).
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createActiveMembership({
    name,
    email: invite.email,
    passwordHash,
    role: invite.role,
    agencyId: invite.agencyId,
  });

  invite.acceptedAt = new Date();
  await invite.save();

  return user;
}

// Public - the applicant has no session yet and is choosing which
// agency to apply to, so tenantId comes from the request body, not
// req.tenant (mirrors agencyRegistration's own public, pre-auth flow).
async function applyToAgency({ agencyId, name, email, password, phone, experienceYears, message }) {
  const agency = await Agency.findOne({ _id: agencyId, status: 'active' }).select('companyName');
  if (!agency) throw notFound('Agency');

  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ agencyId, email: normalizedEmail });
  if (existingUser) {
    const err = new Error('An account with this email already belongs to this agency');
    err.status = 409;
    throw err;
  }

  const existingApplication = await AgencyApplication.findOne({ agencyId, email: normalizedEmail, status: 'pending' });
  if (existingApplication) {
    const err = new Error('You already have a pending application to this agency');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  // No auditLog.record here, deliberately: AuditLog.actor requires a real
  // User (id/name/role, see auditLog.model.js) and there's no
  // authenticated actor yet at this point - same reason
  // agencyRegistration.service.js's own public, pre-auth submission
  // doesn't audit-log either. The reviewer-attributed actions below
  // (approve/reject) do log, since those have a real acting user.
  const application = await AgencyApplication.create({
    agencyId,
    name,
    email: normalizedEmail,
    passwordHash,
    phone,
    experienceYears,
    message,
  });

  return application;
}

async function listApplications(tenantId, status) {
  const filter = { agencyId: tenantId };
  if (status) filter.status = status;
  return AgencyApplication.find(filter).select('-passwordHash').sort({ createdAt: -1 });
}

function assertPendingApplication(application) {
  if (!application) throw notFound('Application');
  if (application.status !== 'pending') {
    const err = new Error('This application has already been reviewed');
    err.status = 409;
    throw err;
  }
}

// Agency Owner/Admin approval authority - never Super Admin (Super Admin
// only approves the AGENCY itself, see platform/agencies.service.js).
async function approveApplication(tenantId, id, reviewer) {
  const application = await AgencyApplication.findOne({ _id: id, agencyId: tenantId });
  assertPendingApplication(application);

  const existingUser = await User.findOne({ agencyId: tenantId, email: application.email });
  if (existingUser) {
    const err = new Error('An account with this email already belongs to this agency');
    err.status = 409;
    throw err;
  }

  // createActiveMembership re-checks the seat limit authoritatively -
  // this is the moment it's actually consumed.
  const user = await createActiveMembership({
    name: application.name,
    email: application.email,
    passwordHash: application.passwordHash,
    role: 'agent',
    agencyId: tenantId,
  });

  application.status = 'approved';
  application.reviewedBy = reviewer.id;
  application.reviewedAt = new Date();
  application.createdUserId = user._id;
  await application.save();

  auditLog.record({ tenantId, actor: reviewer, action: 'agency.application_approve', targetType: 'AgencyApplication', targetId: application._id, metadata: { email: application.email } });

  return user;
}

// Real roster read for the Team management tab - agents and any
// additional agency admins, tenant-scoped like every other agency query.
async function listTeamMembers(tenantId) {
  return User.find({ agencyId: tenantId, role: { $in: ['agent', 'agency_admin'] } })
    .select('name email phone whatsapp avatar role createdAt')
    .sort({ createdAt: -1 });
}

// Hard-removes the account (no active/disabled flag exists on User
// anywhere in this codebase - Agency uses a status enum for suspension,
// but individual users don't). Any properties the removed agent owned
// keep their existing `agent` reference (already handled gracefully
// elsewhere, e.g. getPerformance's agentById.get(...) || 'Unknown') and
// become agency_admin-only editable from then on - the same real-world
// outcome as an employee leaving, not a bug. Reassigning their listings
// to another agent is a separate, not-requested feature.
async function removeTeamMember(tenantId, userId, requester) {
  if (userId === requester.id) {
    const err = new Error('You cannot remove your own account');
    err.status = 400;
    throw err;
  }
  const member = await User.findOne({ _id: userId, agencyId: tenantId });
  if (!member) throw notFound('Team member');
  if (member.role === 'agency_admin') {
    const err = new Error('Cannot remove another agency admin');
    err.status = 403;
    throw err;
  }

  await member.deleteOne();
  auditLog.record({ tenantId, actor: requester, action: 'agency.team_member_remove', targetType: 'User', targetId: member._id, metadata: { email: member.email } });
}

async function rejectApplication(tenantId, id, reviewer, reason) {
  const application = await AgencyApplication.findOne({ _id: id, agencyId: tenantId });
  assertPendingApplication(application);

  application.status = 'rejected';
  application.reviewedBy = reviewer.id;
  application.reviewedAt = new Date();
  application.rejectionReason = reason || '';
  await application.save();

  auditLog.record({ tenantId, actor: reviewer, action: 'agency.application_reject', targetType: 'AgencyApplication', targetId: application._id, metadata: { email: application.email, reason: reason || '' } });

  return application;
}

module.exports = {
  getPerformance,
  getBranding,
  getProfile,
  updateBranding,
  updateProfile,
  inviteUser,
  listInvites,
  revokeInvite,
  acceptInvite,
  applyToAgency,
  listApplications,
  approveApplication,
  rejectApplication,
  listTeamMembers,
  removeTeamMember,
};
