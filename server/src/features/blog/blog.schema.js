const { z } = require('zod');
const { CATEGORIES } = require('./blog.model');

const idParamSchema = { params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }) };
const slugParamSchema = { params: z.object({ slug: z.string().trim().min(1) }) };

const createBlogSchema = {
  body: z.object({
    title: z.string().trim().min(5).max(200),
    excerpt: z.string().trim().max(400).optional(),
    content: z.string().trim().min(50, 'Content must be at least 50 characters'),
    coverImage: z.string().trim().max(1000).optional(),
    category: z.enum(CATEGORIES).optional(),
    tags: z.array(z.string().trim().max(30)).max(15).optional(),
  }),
};

const updateBlogSchema = { params: idParamSchema.params, body: createBlogSchema.body.partial() };

const listBlogsQuerySchema = {
  query: z.object({
    search: z.string().trim().max(200).optional(),
    category: z.enum(CATEGORIES).optional(),
    agencyId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
};

module.exports = { idParamSchema, slugParamSchema, createBlogSchema, updateBlogSchema, listBlogsQuerySchema };
