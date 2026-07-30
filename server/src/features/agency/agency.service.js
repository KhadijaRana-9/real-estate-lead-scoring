const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Agency = require('./agency.model');
const AgencyInvite = require('./agencyInvite.model');
const Property = require('../property/property.model');
const Inquiry = require('../inquiry/inquiry.model');
const User = require('../auth/auth.model');
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
  const existingUser = await User.findOne({ agencyId: tenantId, email: email.toLowerCase() });
  if (existingUser) {
    const err = new Error('A user with this email already belongs to this agency');
    err.status = 409;
    throw err;
  }

  const rawToken = crypto.randomBytes(INVITE_TOKEN_BYTES).toString('hex');
  const invite = await AgencyInvite.create({
    agencyId: tenantId,
    email: email.toLowerCase(),
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
    html: `<p>${inviter.name} invited you to join <strong>${agency.companyName}</strong> as a${role === 'agency_admin' ? 'n agency admin' : 'n agent'}.</p><p><a href="${inviteUrl}">Accept invite</a></p><p>This link expires in 7 days.</p>`,
  });

  auditLog.record({ tenantId, actor: inviter, action: 'agency.invite_user', targetType: 'AgencyInvite', targetId: invite._id, metadata: { email, role, emailSent: sent } });

  return { invite, emailSent: sent, emailSkippedReason: sent ? undefined : reason, inviteUrl };
}

async function listInvites(tenantId) {
  return AgencyInvite.find({ agencyId: tenantId, revokedAt: null }).sort({ createdAt: -1 });
}

async function revokeInvite(tenantId, id) {
  const invite = await AgencyInvite.findOne({ _id: id, agencyId: tenantId });
  if (!invite) throw notFound('Invite');
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

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
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
};
