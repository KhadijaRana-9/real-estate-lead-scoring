// Core logic for migration 002, extracted so it can run both from the CLI
// script (npm run migrate:media) and from an already-connected process.
// See ../002_categorize_media.js for the CLI entry point and full
// explanation of what this does and why it's safe.

const Property = require('../../features/property/property.model');

async function runCategorizeMediaMigration() {
  const candidates = await Property.find({
    $and: [
      { $or: [{ 'media.images': { $exists: false } }, { 'media.images': { $size: 0 } }] },
      { images: { $exists: true, $not: { $size: 0 } } },
    ],
  }).select('images videos agent');

  if (candidates.length === 0) {
    return { candidatesFound: 0, migrated: 0 };
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

    // eslint-disable-next-line no-await-in-loop
    await Property.updateOne({ _id: property._id }, { $set: { 'media.images': images, 'media.videos': videos } });
    migrated += 1;
  }

  return { candidatesFound: candidates.length, migrated };
}

module.exports = { runCategorizeMediaMigration };
