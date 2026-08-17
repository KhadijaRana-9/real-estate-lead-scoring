// Reusable, PRODUCTION-SAFE demo bootstrap. Run with:
//   npm run seed
//
// Every write is an upsert or an existence-checked insert, keyed by a
// real business identifier (agency slug, user email, property title
// within this agency). Re-running it is a no-op for anything that
// already exists. It NEVER deletes or modifies data outside what it
// itself owns (agencyId: dreamhomes-agency._id), so it is safe to run
// against a database that already has real, unrelated data in it -
// which is exactly the situation production was in when this was
// rewritten (see server/src/migrations/001_introduce_agencies.js for
// the actual fix for that: migrating pre-existing data, not seeding
// fresh demo data over it).
//
// Core logic lives in ./lib/runSeed.js so it can also run from an
// already-connected process (e.g. an authenticated ops route), same
// pattern as the migrations under ../migrations/lib/.

require('dotenv').config();

const loadEnv = require('../config/env');
const connectDB = require('../config/db');
const { runSeed } = require('./lib/runSeed');

async function main() {
  const env = loadEnv();
  await connectDB(env.mongoUri);

  console.log('Ensuring seed Agency exists (upsert, never overwrites an existing one)...');
  console.log('Ensuring demo users exist (upsert by email within this agency)...');
  console.log('Ensuring demo properties exist (upsert by title within this agency)...');
  console.log('Ensuring sample inquiries exist (skipped if this agency already has any)...');

  const { demo, test } = await runSeed();

  console.log(`  ${demo.inquiriesCreated > 0 ? demo.inquiriesCreated : 'existing'} inquiries.`);
  console.log('\nDemo agency seed complete (idempotent - safe to re-run).');
  console.log('Login credentials (password for all: "Password123!"):');
  console.log(`  Admin:  ${demo.admin}`);
  demo.agents.forEach((email) => console.log(`  Agent:  ${email}`));

  console.log('\nDeterministic test accounts ready (password for all: "Password123!"):');
  console.log(`  Super Admin:    ${test.superAdmin}`);
  console.log(`  Agency Owner:   ${test.agencyOwner}`);
  console.log(`  Agent:          ${test.agent}`);
  console.log(`  Customer:       ${test.customer}`);
  console.log('  (There is no separate "Platform Admin" role in this codebase - super_admin is the platform administrator.)');
  console.log('  Full reference: docs/DEVELOPMENT.md');

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
