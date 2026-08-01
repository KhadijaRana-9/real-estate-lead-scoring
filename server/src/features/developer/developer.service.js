const Developer = require('./developer.model');
const Project = require('../project/project.model');

const PUBLIC_FIELDS =
  'name slug logo coverBanner description establishedYear headquartersCity website contactEmail phone specializations socialMedia verified featured status createdAt';

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uniqueSlug(name) {
  const base = slugify(name) || 'developer';
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Developer.findOne({ slug: candidate })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

// Real project counts computed from the Project collection at read time -
// never a manually-entered, driftable number on the Developer document
// itself.
async function attachStats(developers) {
  const list = Array.isArray(developers) ? developers : [developers];
  const ids = list.map((d) => d._id);
  const counts = await Project.aggregate([
    { $match: { developerId: { $in: ids } } },
    { $group: { _id: '$developerId', totalProjects: { $sum: 1 }, activeProjects: { $sum: { $cond: [{ $in: ['$status', ['upcoming', 'under_construction', 'launched']] }, 1, 0] } } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c]));
  const withStats = list.map((d) => {
    const obj = d.toObject ? d.toObject() : d;
    const stat = byId.get(String(d._id));
    return { ...obj, stats: { totalProjects: stat?.totalProjects || 0, activeProjects: stat?.activeProjects || 0 } };
  });
  return Array.isArray(developers) ? withStats : withStats[0];
}

async function create(user, payload) {
  const slug = await uniqueSlug(payload.name);
  const developer = await Developer.create({ ...payload, slug, createdBy: user.id });
  return attachStats(developer);
}

async function update(id, payload) {
  const developer = await Developer.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true });
  if (!developer) {
    const err = new Error('Developer not found');
    err.status = 404;
    throw err;
  }
  return attachStats(developer);
}

async function setVerified(id, value) {
  const developer = await Developer.findByIdAndUpdate(id, { $set: { verified: value } }, { new: true });
  if (!developer) {
    const err = new Error('Developer not found');
    err.status = 404;
    throw err;
  }
  return attachStats(developer);
}

async function setFeatured(id, value) {
  const developer = await Developer.findByIdAndUpdate(id, { $set: { featured: value } }, { new: true });
  if (!developer) {
    const err = new Error('Developer not found');
    err.status = 404;
    throw err;
  }
  return attachStats(developer);
}

const SORTS = {
  newest: { createdAt: -1 },
  name_asc: { name: 1 },
};

async function list(query) {
  const page = query.page || 1;
  const limit = query.limit || 12;
  const filter = { status: 'active' };
  if (query.city) filter.headquartersCity = new RegExp(query.city, 'i');
  if (query.verified) filter.verified = query.verified === 'true';
  if (query.featured) filter.featured = query.featured === 'true';
  if (query.search) {
    filter.$or = [{ name: new RegExp(query.search, 'i') }, { headquartersCity: new RegExp(query.search, 'i') }];
  }

  if (query.sort === 'most_projects') {
    // Requires the join, so this path aggregates instead of a plain find.
    const pipeline = [
      { $match: filter },
      { $lookup: { from: 'projects', localField: '_id', foreignField: 'developerId', as: 'projects' } },
      { $addFields: { totalProjects: { $size: '$projects' } } },
      { $project: { projects: 0 } },
      { $sort: { totalProjects: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];
    const [items, total] = await Promise.all([Developer.aggregate(pipeline), Developer.countDocuments(filter)]);
    const withStats = await attachStats(items.map((d) => new Developer(d)));
    return { items: withStats, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  const sort = SORTS[query.sort] || SORTS.newest;
  const [items, total] = await Promise.all([
    Developer.find(filter).select(PUBLIC_FIELDS).sort(sort).skip((page - 1) * limit).limit(limit),
    Developer.countDocuments(filter),
  ]);
  return { items: await attachStats(items), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function getBySlug(slug) {
  const developer = await Developer.findOne({ slug, status: 'active' }).select(PUBLIC_FIELDS);
  if (!developer) {
    const err = new Error('Developer not found');
    err.status = 404;
    throw err;
  }
  const withStats = await attachStats(developer);
  const projects = await Project.find({ developerId: developer._id, status: { $ne: 'draft' } })
    .select('name slug coverBanner city status launchDate')
    .sort({ createdAt: -1 })
    .limit(24);
  return { ...withStats, projects };
}

async function topDevelopers(limit = 8) {
  const pipeline = [
    { $match: { status: 'active' } },
    { $lookup: { from: 'projects', localField: '_id', foreignField: 'developerId', as: 'projects' } },
    { $addFields: { totalProjects: { $size: '$projects' } } },
    { $match: { totalProjects: { $gt: 0 } } },
    { $project: { projects: 0 } },
    { $sort: { verified: -1, totalProjects: -1 } },
    { $limit: limit },
  ];
  const results = await Developer.aggregate(pipeline);
  return results.map((d) => ({
    _id: d._id,
    name: d.name,
    slug: d.slug,
    logo: d.logo,
    headquartersCity: d.headquartersCity,
    verified: d.verified,
    featured: d.featured,
    stats: { totalProjects: d.totalProjects },
  }));
}

module.exports = { create, update, setVerified, setFeatured, list, getBySlug, topDevelopers };
