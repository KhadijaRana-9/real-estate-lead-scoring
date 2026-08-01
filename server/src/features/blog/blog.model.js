const mongoose = require('mongoose');

const CATEGORIES = ['market-news', 'buying-guide', 'selling-guide', 'investment', 'lifestyle', 'agency-news', 'legal'];

// Tenant-scoped content, same shape as Property - an agency's marketing
// team writes it, but the public Blog/News homepage sections read across
// every agency's published posts (see blog.service.js listPublic), same
// cross-tenant browsing posture as the agency marketplace directory.
const blogSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'],
    },
    excerpt: { type: String, trim: true, default: '', maxlength: 400 },
    content: { type: String, required: true },
    coverImage: { type: String, trim: true, default: '' },
    category: { type: String, enum: CATEGORIES, default: 'market-news' },
    tags: { type: [String], default: [] },

    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedAt: { type: Date, default: null },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ status: 1, category: 1, publishedAt: -1 });
blogSchema.index({ agencyId: 1, status: 1, createdAt: -1 });
blogSchema.index({ title: 'text', excerpt: 'text', tags: 'text' });

module.exports = mongoose.model('Blog', blogSchema);
module.exports.CATEGORIES = CATEGORIES;
