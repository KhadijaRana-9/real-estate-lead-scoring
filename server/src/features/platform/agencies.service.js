const Agency = require('../agency/agency.model');
const User = require('../auth/auth.model');
const Property = require('../property/property.model');
const Inquiry = require('../inquiry/inquiry.model');
const RefreshToken = require('../auth/refreshToken.model');
const auditLog = require('../audit/auditLog.service');

const DEFAULT_PAGE_SIZE = 20;

function notFound() {
  const err = new Error('Agency not found');
  err.status = 404;
  return err;
}

async function listAgencies({ page = 1, limit = DEFAULT_PAGE_SIZE }) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || DEFAULT_PAGE_SIZE));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Agency.find().sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Agency.countDocuments(),
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

async function deleteAgency(id) {
  const agency = await Agency.findById(id);
  if (!agency) throw notFound();

  // Sequential deletes, not a multi-document transaction - acceptable
  // for a standalone dev MongoDB. A production deploy on a replica set
  // should wrap this in a session transaction so a mid-cascade failure
  // can't leave orphaned records.
  await Promise.all([
    User.deleteMany({ agencyId: agency._id }),
    Property.deleteMany({ agencyId: agency._id }),
    Inquiry.deleteMany({ agencyId: agency._id }),
    RefreshToken.deleteMany({ agencyId: agency._id }),
  ]);
  await agency.deleteOne();
}

module.exports = { listAgencies, createAgency, suspendAgency, reactivateAgency, setVerified, setFeatured, deleteAgency };
