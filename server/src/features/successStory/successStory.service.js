const SuccessStory = require('./successStory.model');
const Inquiry = require('../inquiry/inquiry.model');

async function create(tenantId, user, payload) {
  // The real gate: only an inquiry this agency owns, that has actually
  // reached 'closed_won' in the CRM pipeline, can become a success story.
  const inquiry = await Inquiry.findOne({ _id: payload.inquiryId, agencyId: tenantId });
  if (!inquiry) {
    const err = new Error('Inquiry not found for this workspace');
    err.status = 404;
    throw err;
  }
  if (inquiry.pipelineStage !== 'closed_won') {
    const err = new Error('Success stories can only be created from inquiries marked closed_won in the CRM');
    err.status = 400;
    throw err;
  }

  const existing = await SuccessStory.findOne({ inquiry: inquiry._id });
  if (existing) {
    const err = new Error('A success story already exists for this inquiry');
    err.status = 409;
    throw err;
  }

  return SuccessStory.create({
    agencyId: tenantId,
    inquiry: inquiry._id,
    property: inquiry.property,
    submittedBy: user.id,
    customerDisplayName: payload.customerDisplayName,
    headline: payload.headline,
    story: payload.story,
    photos: payload.photos || [],
  });
}

async function approve(id) {
  const story = await SuccessStory.findByIdAndUpdate(
    id,
    { $set: { status: 'published', publishedAt: new Date() } },
    { new: true }
  );
  if (!story) {
    const err = new Error('Success story not found');
    err.status = 404;
    throw err;
  }
  return story;
}

async function reject(id) {
  const story = await SuccessStory.findByIdAndUpdate(id, { $set: { status: 'rejected' } }, { new: true });
  if (!story) {
    const err = new Error('Success story not found');
    err.status = 404;
    throw err;
  }
  return story;
}

async function listPublic(query) {
  const page = query.page || 1;
  const limit = query.limit || 9;
  const filter = { status: 'published' };
  if (query.agencyId) filter.agencyId = query.agencyId;

  const [items, total] = await Promise.all([
    SuccessStory.find(filter)
      .populate('agencyId', 'companyName slug logo verified')
      .populate('property', 'title city price images')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    SuccessStory.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function listPendingModeration() {
  return SuccessStory.find({ status: 'pending_review' })
    .populate('agencyId', 'companyName slug')
    .populate('property', 'title city')
    .sort({ createdAt: 1 });
}

async function listMine(tenantId) {
  return SuccessStory.find({ agencyId: tenantId }).populate('property', 'title city').sort({ createdAt: -1 });
}

module.exports = { create, approve, reject, listPublic, listPendingModeration, listMine };
