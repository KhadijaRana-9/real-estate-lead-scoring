const { z } = require('zod');

const idParamSchema = { params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }) };
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const createSuccessStorySchema = {
  body: z.object({
    inquiryId: objectIdSchema,
    customerDisplayName: z.string().trim().min(2).max(100),
    headline: z.string().trim().min(5).max(200),
    story: z.string().trim().min(30, 'Story must be at least 30 characters').max(3000),
    photos: z.array(z.string().trim().url()).max(10).optional(),
  }),
};

const listSuccessStoriesQuerySchema = {
  query: z.object({
    agencyId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
};

const moderateSchema = { params: idParamSchema.params };

module.exports = { idParamSchema, createSuccessStorySchema, listSuccessStoriesQuerySchema, moderateSchema };
