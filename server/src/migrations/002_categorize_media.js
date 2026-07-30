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

require('dotenv').config();

const loadEnv = require('../config/env');
const connectDB = require('../config/db');
const Property = require('../features/property/property.model');

async function migrate() {
  const env = loadEnv();
  await connectDB(env.mongoUri);

  const candidates = await Property.find({
    $and: [
      { $or: [{ 'media.images': { $exists: false } }, { 'media.images': { $size: 0 } }] },
      { images: { $exists: true, $not: { $size: 0 } } },
    ],
  }).select('images videos agent');

  console.log(`Found ${candidates.length} properties to migrate...`);
  if (candidates.length === 0) {
    console.log('Nothing to do.');
    return finish(0);
  }

  let migrated = 0;
  for (const property of candidates) {
    const images = (property.images || []).map((url, i) => ({
      url,
      category: 'other',
      isCover: i === 0,
      order: i,
      provider: 'local',
      uploadedBy: property.agent,
    }));
    const videos = (property.videos || []).map((url, i) => ({
      url,
      category: 'other',
      order: i,
      provider: 'local',
      uploadedBy: property.agent,
    }));

    await Property.updateOne(
      { _id: property._id },
      { $set: { 'media.images': images, 'media.videos': videos } }
    );
    migrated += 1;
    if (migrated % 500 === 0) console.log(`  ${migrated}/${candidates.length}...`);
  }

  console.log(`Migrated ${migrated} properties into categorized media (category: 'other').`);
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
