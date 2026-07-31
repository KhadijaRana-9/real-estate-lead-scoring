const Follow = require('./follow.model');

async function follow(agencyId, userId) {
  // Upsert instead of create - clicking "Follow" twice (double click, a
  // retried request) must never throw a duplicate-key error to the user.
  await Follow.findOneAndUpdate({ agencyId, user: userId }, { agencyId, user: userId }, { upsert: true });
  return { following: true };
}

async function unfollow(agencyId, userId) {
  await Follow.deleteOne({ agencyId, user: userId });
  return { following: false };
}

async function isFollowing(agencyId, userId) {
  if (!userId) return false;
  const doc = await Follow.findOne({ agencyId, user: userId }).select('_id');
  return Boolean(doc);
}

async function getFollowerCount(agencyId) {
  return Follow.countDocuments({ agencyId });
}

async function getFollowerCountsForMany(agencyIds) {
  const results = await Follow.aggregate([{ $match: { agencyId: { $in: agencyIds } } }, { $group: { _id: '$agencyId', count: { $sum: 1 } } }]);
  const byAgency = new Map(results.map((r) => [r._id.toString(), r.count]));
  return agencyIds.reduce((map, id) => {
    map[id.toString()] = byAgency.get(id.toString()) || 0;
    return map;
  }, {});
}

module.exports = { follow, unfollow, isFollowing, getFollowerCount, getFollowerCountsForMany };
