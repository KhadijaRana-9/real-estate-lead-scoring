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
//
// Core logic lives in ./lib/introduceAgencies.js so it can also run from
// an already-connected process (see src/features/ops/ops.routes.js) for
// environments where a direct DB connection string isn't available to
// whoever needs to trigger this.

require('dotenv').config();

const loadEnv = require('../config/env');
const connectDB = require('../config/db');
const { runIntroduceAgenciesMigration } = require('./lib/introduceAgencies');

async function migrate() {
  const env = loadEnv();
  await connectDB(env.mongoUri);

  const result = await runIntroduceAgenciesMigration();

  if (!result.applied) {
    console.log(result.message);
    return finish(0);
  }

  console.log(`Created Agency ${result.agencyId} (DreamHomes)`);
  console.log('Backfilling agencyId onto existing records...');
  console.log(`  Users:      ${result.usersUpdated} updated`);
  console.log(`  Properties: ${result.propertiesUpdated} updated`);
  console.log(`  Inquiries:  ${result.inquiriesUpdated} updated`);
  console.log(`Remapping role "admin" -> "agency_admin"... ${result.rolesRemapped} user(s) remapped`);
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
