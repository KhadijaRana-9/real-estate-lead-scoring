const Project = require('./project.model');
const Property = require('../property/property.model');

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uniqueSlug(name) {
  const base = slugify(name) || 'project';
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Project.findOne({ slug: candidate })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

// Real, computed-at-read-time numbers derived from actual linked
// properties (Property.projectId) - never a manually-entered field that
// could drift from reality. A brand-new project with no units listed yet
// honestly shows zeros/nulls, not a fabricated range.
async function attachStats(projects) {
  const list = Array.isArray(projects) ? projects : [projects];
  const ids = list.map((p) => p._id);
  const stats = await Property.aggregate([
    { $match: { projectId: { $in: ids }, status: { $ne: 'draft' } } },
    {
      $group: {
        _id: '$projectId',
        totalUnits: { $sum: 1 },
        availableUnits: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
        soldUnits: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
  ]);
  const byId = new Map(stats.map((s) => [String(s._id), s]));
  const withStats = list.map((p) => {
    const obj = p.toObject ? p.toObject() : p;
    const stat = byId.get(String(p._id));
    return {
      ...obj,
      stats: {
        totalUnits: stat?.totalUnits || 0,
        availableUnits: stat?.availableUnits || 0,
        soldUnits: stat?.soldUnits || 0,
        priceRange: stat ? { min: stat.minPrice, max: stat.maxPrice } : null,
      },
    };
  });
  return Array.isArray(projects) ? withStats : withStats[0];
}

async function create(tenantId, payload) {
  const slug = await uniqueSlug(payload.name);
  const project = await Project.create({ ...payload, agencyId: tenantId, slug });
  return attachStats(project);
}

async function update(tenantId, id, payload) {
  const project = await Project.findOneAndUpdate({ _id: id, agencyId: tenantId }, { $set: payload }, { new: true, runValidators: true });
  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }
  return attachStats(project);
}

async function remove(tenantId, id) {
  // Detach linked units rather than deleting them - a project going away
  // must never take real property listings down with it.
  await Property.updateMany({ projectId: id, agencyId: tenantId }, { $set: { projectId: null } });
  const result = await Project.deleteOne({ _id: id, agencyId: tenantId });
  if (result.deletedCount === 0) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }
}

async function setFeatured(id, value) {
  const project = await Project.findByIdAndUpdate(id, { $set: { featured: value } }, { new: true });
  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }
  return attachStats(project);
}

const SORTS = {
  newest: { createdAt: -1 },
  launch_date: { launchDate: -1 },
  name_asc: { name: 1 },
};

async function list(query) {
  const page = query.page || 1;
  const limit = query.limit || 12;
  const filter = {};
  if (query.city) filter.city = new RegExp(query.city, 'i');
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.developerId) filter.developerId = query.developerId;
  if (query.featured) filter.featured = query.featured === 'true';
  if (query.search) filter.$or = [{ name: new RegExp(query.search, 'i') }, { city: new RegExp(query.search, 'i') }];

  const sort = SORTS[query.sort] || SORTS.newest;
  const [items, total] = await Promise.all([
    Project.find(filter)
      .populate('developerId', 'name slug logo verified')
      .populate('agencyId', 'companyName slug logo verified')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Project.countDocuments(filter),
  ]);
  return { items: await attachStats(items), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function getBySlug(slug) {
  const project = await Project.findOne({ slug })
    .populate('developerId', 'name slug logo verified headquartersCity')
    .populate('agencyId', 'companyName slug logo verified phone whatsapp');
  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }
  const withStats = await attachStats(project);
  const units = await Property.find({ projectId: project._id, status: { $ne: 'draft' } })
    .select('title price bedrooms bathrooms area areaUnit type status images')
    .sort({ price: 1 })
    .limit(50);
  return { ...withStats, units };
}

async function featuredProjects(limit = 8) {
  const projects = await Project.find({ status: { $in: ['launched', 'under_construction'] } })
    .populate('developerId', 'name slug logo verified')
    .sort({ featured: -1, createdAt: -1 })
    .limit(limit);
  return attachStats(projects);
}

async function newLaunches(limit = 8) {
  const projects = await Project.find({ status: { $in: ['upcoming', 'launched'] } })
    .populate('developerId', 'name slug logo verified')
    .sort({ launchDate: -1, createdAt: -1 })
    .limit(limit);
  return attachStats(projects);
}

async function listByAgency(tenantId) {
  const projects = await Project.find({ agencyId: tenantId }).populate('developerId', 'name slug logo').sort({ createdAt: -1 });
  return attachStats(projects);
}

module.exports = { create, update, remove, setFeatured, list, getBySlug, featuredProjects, newLaunches, listByAgency };
