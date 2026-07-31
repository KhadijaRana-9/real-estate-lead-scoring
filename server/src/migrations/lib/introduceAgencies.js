// Core logic for migration 001, extracted so it can run both from the CLI
// script (npm run migrate:agencies) and from an already-connected process
// (e.g. an authenticated ops route) without re-connecting to Mongo or
// calling process.exit. See ../001_introduce_agencies.js for the CLI entry
// point and full explanation of what this does and why it's safe.

const Agency = require('../../features/agency/agency.model');
const User = require('../../features/auth/auth.model');
const Property = require('../../features/property/property.model');
const Inquiry = require('../../features/inquiry/inquiry.model');

const SEED_AGENCY_SLUG = 'dreamhomes';

async function runIntroduceAgenciesMigration() {
  const existing = await Agency.findOne({ slug: SEED_AGENCY_SLUG });
  if (existing) {
    return {
      applied: false,
      message: `Migration already applied - Agency "${existing.companyName}" (${existing._id}) exists.`,
      agencyId: existing._id,
      agencyStatus: existing.status,
    };
  }

  const adminUser = await User.findOne({ role: 'admin' });

  const agency = await Agency.create({
    companyName: 'DreamHomes',
    slug: SEED_AGENCY_SLUG,
    contactEmail: adminUser ? adminUser.email : 'admin@dreamhomes.pk',
    subscriptionPlan: 'professional',
    subscriptionStatus: 'active',
    trialEndsAt: null,
    status: 'active',
  });

  const [userResult, propertyResult, inquiryResult] = await Promise.all([
    User.updateMany({ agencyId: null, role: { $ne: 'super_admin' } }, { $set: { agencyId: agency._id } }),
    Property.updateMany({ agencyId: { $exists: false } }, { $set: { agencyId: agency._id } }),
    Inquiry.updateMany({ agencyId: { $exists: false } }, { $set: { agencyId: agency._id } }),
  ]);

  const roleResult = await User.updateMany({ role: 'admin' }, { $set: { role: 'agency_admin' } });

  await Promise.all([
    Agency.syncIndexes(),
    User.syncIndexes(),
    Property.syncIndexes(),
    Inquiry.syncIndexes(),
  ]);

  return {
    applied: true,
    agencyId: agency._id,
    usersUpdated: userResult.modifiedCount,
    propertiesUpdated: propertyResult.modifiedCount,
    inquiriesUpdated: inquiryResult.modifiedCount,
    rolesRemapped: roleResult.modifiedCount,
  };
}

module.exports = { runIntroduceAgenciesMigration, SEED_AGENCY_SLUG };
