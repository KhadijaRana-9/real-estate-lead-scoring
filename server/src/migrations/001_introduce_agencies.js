// One-time, manually-triggered migration. Run with `npm run migrate:agencies`.
// Does NOT run automatically on server boot - auto-running schema
// migrations against live data on every deploy is exactly the kind of
// shortcut this refactor is explicitly avoiding.
//
// What it does:
//   1. Creates a single "DreamHomes" Agency (tenant #1) from existing
//      branding, so pre-existing functionality keeps working unmodified.
//   2. Backfills agencyId onto every existing User, Property, Inquiry.
//   3. Remaps role 'admin' -> 'agency_admin' (the new RBAC vocabulary).
//   4. Reconciles indexes with the current schema (syncIndexes), which
//      explicitly drops the old global-unique email index in favor of
//      the two partial indexes defined in auth.model.js - left implicit,
//      that stale index would silently block legitimate same-email
//      accounts across two different agencies later.
// Idempotent: safe to re-run: if the seed agency already exists, it exits
// without making further changes.

require('dotenv').config();

const loadEnv = require('../config/env');
const connectDB = require('../config/db');
const Agency = require('../features/agency/agency.model');
const User = require('../features/auth/auth.model');
const Property = require('../features/property/property.model');
const Inquiry = require('../features/inquiry/inquiry.model');

const SEED_AGENCY_SLUG = 'dreamhomes';

async function migrate() {
  const env = loadEnv();
  await connectDB(env.mongoUri);

  const existing = await Agency.findOne({ slug: SEED_AGENCY_SLUG });
  if (existing) {
    console.log(`Migration already applied - Agency "${existing.companyName}" (${existing._id}) exists. Nothing to do.`);
    return finish(0);
  }

  console.log('Creating seed Agency for existing data...');
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
  console.log(`Created Agency ${agency._id} (${agency.companyName})`);

  console.log('Backfilling agencyId onto existing records...');
  const [userResult, propertyResult, inquiryResult] = await Promise.all([
    // Exclude super_admin explicitly: querying agencyId: null also
    // matches documents where the field is entirely absent (which is
    // every pre-migration user), and a super_admin provisioned before
    // this migration runs must stay agencyId: null, not be pulled into
    // the seed agency.
    User.updateMany({ agencyId: null, role: { $ne: 'super_admin' } }, { $set: { agencyId: agency._id } }),
    Property.updateMany({ agencyId: { $exists: false } }, { $set: { agencyId: agency._id } }),
    Inquiry.updateMany({ agencyId: { $exists: false } }, { $set: { agencyId: agency._id } }),
  ]);
  console.log(`  Users:      ${userResult.modifiedCount} updated`);
  console.log(`  Properties: ${propertyResult.modifiedCount} updated`);
  console.log(`  Inquiries:  ${inquiryResult.modifiedCount} updated`);

  console.log('Remapping role "admin" -> "agency_admin"...');
  const roleResult = await User.updateMany({ role: 'admin' }, { $set: { role: 'agency_admin' } });
  console.log(`  ${roleResult.modifiedCount} user(s) remapped`);

  console.log('Reconciling indexes with current schema...');
  await Promise.all([
    Agency.syncIndexes(),
    User.syncIndexes(),
    Property.syncIndexes(),
    Inquiry.syncIndexes(),
  ]);

  console.log('\nMigration complete.');
  console.log('Note: no super_admin account was created - provision one deliberately');
  console.log('via a separate script before building Feature 5 (platform routes).');
  finish(0);
}

function finish(code) {
  process.exit(code);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
