// One-time, manually-triggered migration. Run with `npm run migrate:media`.
// Does NOT run automatically on server boot, same rationale as
// 001_introduce_agencies.js.
//
// What it does:
//   Backfills property.media.images / property.media.videos from the
//   existing flat images[]/videos[] string arrays, for every property
//   that predates the categorized media system. Every migrated item gets
//   category: 'other' (there's no way to know which room an old,
//   uncategorized photo actually shows - inventing one would be a fake
//   category, not real data) and uploadedBy: the property's own agent.
//   The flat arrays are left untouched - they stay in sync going forward
//   via property.service.js's syncFlatMediaArrays.
//
// Idempotent: only touches properties where media.images is still empty
// but the legacy images[] array has content, so re-running it is a no-op
// for anything already migrated (or created after this feature shipped).
//
// Core logic lives in ./lib/categorizeMedia.js so it can also run from an
// already-connected process (see src/features/ops/ops.routes.js).

require('dotenv').config();

const loadEnv = require('../config/env');
const connectDB = require('../config/db');
const { runCategorizeMediaMigration } = require('./lib/categorizeMedia');

async function migrate() {
  const env = loadEnv();
  await connectDB(env.mongoUri);

  const result = await runCategorizeMediaMigration();

  console.log(`Found ${result.candidatesFound} properties to migrate...`);
  if (result.candidatesFound === 0) {
    console.log('Nothing to do.');
    return finish(0);
  }

  console.log(`Migrated ${result.migrated} properties into categorized media (category: 'other').`);
  return finish(0);
}

function finish(code) {
  return require('mongoose')
    .disconnect()
    .then(() => process.exit(code));
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
