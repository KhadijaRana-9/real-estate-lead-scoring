const mongoose = require('mongoose');
const Agency = require('../agency/agency.model');
const User = require('../auth/auth.model');
const Property = require('../property/property.model');
const Inquiry = require('../inquiry/inquiry.model');
const RefreshToken = require('../auth/refreshToken.model');
const AgencyApplication = require('../agency/agencyApplication.model');
const AgencyInvite = require('../agency/agencyInvite.model');
const Conversation = require('../ai/conversation.model');
const AuditLog = require('../audit/auditLog.model');
const Invoice = require('../billing/invoice.model');
const Blog = require('../blog/blog.model');
const Appointment = require('../crm/appointment.model');
const Task = require('../crm/task.model');
const Favorite = require('../favorite/favorite.model');
const Follow = require('../follow/follow.model');
const Project = require('../project/project.model');
const PropertyReview = require('../propertyReview/propertyReview.model');
const Review = require('../review/review.model');
const SuccessStory = require('../successStory/successStory.model');
const auditLog = require('../audit/auditLog.service');
const emailProvider = require('../../shared/notifications/emailProvider');

// Every model that carries an agencyId - i.e. every collection a deleted
// agency must leave nothing behind in. Confirmed via a repo-wide grep of
// every *.model.js file, not just the models an earlier code comment
// happened to name - Follow and Invoice in particular were previously
// missing from the cascade entirely. Deliberately NOT included here
// (verified by reading their schemas): Award, Developer, Newsletter,
// Partner, SearchLog - all genuinely platform-global, not tenant-scoped.
const AGENCY_SCOPED_MODELS = [
  User,
  Property,
  Inquiry,
  RefreshToken,
  AgencyApplication,
  AgencyInvite,
  Conversation,
  AuditLog,
  Invoice,
  Blog,
  Appointment,
  Task,
  Favorite,
  Follow,
  Project,
  PropertyReview,
  Review,
  SuccessStory,
];

const DEFAULT_PAGE_SIZE = 20;

function notFound() {
  const err = new Error('Agency not found');
  err.status = 404;
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

// `plan` and `statusNot` (Phase 5, Super Admin AI) added alongside the
// existing `status` filter - same real fields (Agency.subscriptionPlan/
// status), no new filtering mechanism invented. `statusNot` answers
// "inactive" honestly (AGENCY_STATUSES has no single "inactive" value -
// it's pending/active/suspended/rejected - so "inactive" means "anything
// but active", not a fabricated status).
async function listAgencies({ page = 1, limit = DEFAULT_PAGE_SIZE, status, statusNot, plan }) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || DEFAULT_PAGE_SIZE));
  const skip = (pageNum - 1) * limitNum;
  const filter = {};
  if (status) filter.status = status;
  else if (statusNot) filter.status = { $ne: statusNot };
  if (plan) filter.subscriptionPlan = plan;

  const [items, total] = await Promise.all([
    Agency.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Agency.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 },
  };
}

// data is already whitelisted by createAgencySchema's Zod object (unknown
// keys stripped on .parse()) - this is a Super-Admin-only, low-traffic
// operation, so that single validation layer is proportionate here rather
// than also duplicating a field whitelist the way the public-facing
// property write path does.
async function createAgency(data) {
  return Agency.create(data);
}

async function suspendAgency(id, requester) {
  const agency = await Agency.findById(id);
  if (!agency) throw notFound();

  agency.status = 'suspended';
  await agency.save();

  // Cascade-revoke every active session for this agency immediately,
  // rather than waiting for each one to hit the suspended-agency check
  // on its next refresh - a suspension should take effect now.
  await RefreshToken.updateMany({ agencyId: agency._id, revokedAt: null }, { revokedAt: new Date() });

  if (requester) {
    auditLog.record({ tenantId: null, actor: requester, action: 'agency.suspend', targetType: 'Agency', targetId: agency._id, metadata: { companyName: agency.companyName } });
  }
  return agency;
}

async function reactivateAgency(id, requester) {
  const agency = await Agency.findById(id);
  if (!agency) throw notFound();

  agency.status = 'active';
  await agency.save();
  if (requester) {
    auditLog.record({ tenantId: null, actor: requester, action: 'agency.reactivate', targetType: 'Agency', targetId: agency._id, metadata: { companyName: agency.companyName } });
  }
  return agency;
}

// Finds the agency_admin created at registration time (agencyRegistration
// service creates exactly one) to notify - not a general "find any
// admin" lookup, since an approved-and-later-invited second agency_admin
// shouldn't receive a "your registration was approved" email that was
// never about them.
async function findOwner(agencyId) {
  return User.findOne({ agencyId, role: 'agency_admin' }).sort({ createdAt: 1 });
}

async function approveAgency(id, requester) {
  const agency = await Agency.findById(id);
  if (!agency) throw notFound();
  if (agency.status !== 'pending') throw badRequest(`Only a pending agency can be approved (current status: "${agency.status}").`);

  agency.status = 'active';
  agency.approvedAt = new Date();
  agency.approvedBy = requester?.id || null;
  await agency.save();

  const owner = await findOwner(agency._id);
  let emailSent = false;
  if (owner) {
    const clientOrigin = process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:5173';
    const { sent } = await emailProvider.sendMail({
      to: owner.email,
      subject: `${agency.companyName} has been approved on DreamHomes`,
      html: `<p>Good news - <strong>${agency.companyName}</strong> has been reviewed and approved.</p><p>You can now <a href="${clientOrigin}/login?workspace=${agency.slug}">log in to your Agency Portal</a>.</p>`,
    });
    emailSent = sent;
  }

  auditLog.record({ tenantId: null, actor: requester, action: 'agency.approve', targetType: 'Agency', targetId: agency._id, metadata: { companyName: agency.companyName, emailSent } });
  return agency;
}

async function rejectAgency(id, reason, requester) {
  const agency = await Agency.findById(id);
  if (!agency) throw notFound();
  if (agency.status !== 'pending') throw badRequest(`Only a pending agency can be rejected (current status: "${agency.status}").`);

  agency.status = 'rejected';
  agency.rejectedAt = new Date();
  agency.rejectionReason = reason || '';
  await agency.save();

  const owner = await findOwner(agency._id);
  let emailSent = false;
  if (owner) {
    const { sent } = await emailProvider.sendMail({
      to: owner.email,
      subject: `Your DreamHomes registration for ${agency.companyName} was not approved`,
      html: `<p>We reviewed your registration for <strong>${agency.companyName}</strong> and were unable to approve it${reason ? `: ${reason}` : '.'}</p>`,
    });
    emailSent = sent;
  }

  auditLog.record({ tenantId: null, actor: requester, action: 'agency.reject', targetType: 'Agency', targetId: agency._id, metadata: { companyName: agency.companyName, reason, emailSent } });
  return agency;
}

async function setVerified(id, verified, requester) {
  const agency = await Agency.findById(id);
  if (!agency) throw notFound();
  agency.verified = Boolean(verified);
  await agency.save();
  auditLog.record({ tenantId: null, actor: requester, action: 'agency.set_verified', targetType: 'Agency', targetId: agency._id, metadata: { verified: agency.verified } });
  return agency;
}

async function setFeatured(id, featured, requester) {
  const agency = await Agency.findById(id);
  if (!agency) throw notFound();
  agency.featured = Boolean(featured);
  await agency.save();
  auditLog.record({ tenantId: null, actor: requester, action: 'agency.set_featured', targetType: 'Agency', targetId: agency._id, metadata: { featured: agency.featured } });
  return agency;
}

// Requires a replica set (or mongos) - standalone MongoDB cannot run
// multi-document transactions and mongoose.startSession()/withTransaction()
// will throw on one. Every managed MongoDB this app is expected to run on
// in production (e.g. Atlas) is always a replica set; if that assumption
// is ever wrong, this fails loudly (500) rather than silently degrading to
// non-atomic deletes.
async function deleteAgency(id) {
  const agency = await Agency.findById(id);
  if (!agency) throw notFound();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Promise.all(
        AGENCY_SCOPED_MODELS.map((Model) => Model.deleteMany({ agencyId: agency._id }, { session }))
      );
      await agency.deleteOne({ session });
    });
  } finally {
    await session.endSession();
  }
}

module.exports = { listAgencies, createAgency, suspendAgency, reactivateAgency, approveAgency, rejectAgency, setVerified, setFeatured, deleteAgency };
