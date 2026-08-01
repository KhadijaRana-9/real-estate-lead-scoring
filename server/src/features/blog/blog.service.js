const Blog = require('./blog.model');

const PUBLIC_FIELDS = 'agencyId author title slug excerpt coverImage category tags status publishedAt views createdAt';

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uniqueSlug(title) {
  const base = slugify(title) || 'post';
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Blog.findOne({ slug: candidate })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

function readTimeMinutes(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function withReadTime(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, readTimeMinutes: readTimeMinutes(obj.content || obj.excerpt || '') };
}

async function create(tenantId, author, payload) {
  const slug = await uniqueSlug(payload.title);
  const excerpt = payload.excerpt || `${payload.content.slice(0, 200).trim()}...`;
  const blog = await Blog.create({ ...payload, excerpt, slug, agencyId: tenantId, author: author.id });
  return withReadTime(blog);
}

async function update(tenantId, id, payload) {
  const blog = await Blog.findOneAndUpdate({ _id: id, agencyId: tenantId }, { $set: payload }, { new: true, runValidators: true });
  if (!blog) {
    const err = new Error('Blog post not found');
    err.status = 404;
    throw err;
  }
  return withReadTime(blog);
}

async function remove(tenantId, id) {
  const result = await Blog.deleteOne({ _id: id, agencyId: tenantId });
  if (result.deletedCount === 0) {
    const err = new Error('Blog post not found');
    err.status = 404;
    throw err;
  }
}

async function publish(tenantId, id) {
  const blog = await Blog.findOneAndUpdate(
    { _id: id, agencyId: tenantId },
    { $set: { status: 'published', publishedAt: new Date() } },
    { new: true }
  );
  if (!blog) {
    const err = new Error('Blog post not found');
    err.status = 404;
    throw err;
  }
  return withReadTime(blog);
}

async function unpublish(tenantId, id) {
  const blog = await Blog.findOneAndUpdate({ _id: id, agencyId: tenantId }, { $set: { status: 'draft' } }, { new: true });
  if (!blog) {
    const err = new Error('Blog post not found');
    err.status = 404;
    throw err;
  }
  return withReadTime(blog);
}

async function listPublic(query) {
  const page = query.page || 1;
  const limit = query.limit || 9;
  const filter = { status: 'published' };
  if (query.category) filter.category = query.category;
  if (query.agencyId) filter.agencyId = query.agencyId;
  if (query.search) filter.$text = { $search: query.search };

  const [items, total] = await Promise.all([
    Blog.find(filter)
      .select(PUBLIC_FIELDS)
      .populate('agencyId', 'companyName slug logo verified')
      .populate('author', 'name avatar')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Blog.countDocuments(filter),
  ]);
  return { items: items.map(withReadTime), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function getBySlug(slug) {
  const blog = await Blog.findOneAndUpdate(
    { slug, status: 'published' },
    { $inc: { views: 1 } },
    { new: true }
  )
    .populate('agencyId', 'companyName slug logo verified')
    .populate('author', 'name avatar');
  if (!blog) {
    const err = new Error('Blog post not found');
    err.status = 404;
    throw err;
  }
  return withReadTime(blog);
}

async function listMine(tenantId) {
  const items = await Blog.find({ agencyId: tenantId }).sort({ createdAt: -1 });
  return items.map(withReadTime);
}

async function latest(limit = 6) {
  const items = await Blog.find({ status: 'published' })
    .select(PUBLIC_FIELDS)
    .populate('agencyId', 'companyName slug logo')
    .sort({ publishedAt: -1 })
    .limit(limit);
  return items.map(withReadTime);
}

module.exports = { create, update, remove, publish, unpublish, listPublic, getBySlug, listMine, latest };
