const { z } = require('zod');

const listAgenciesQuerySchema = {
  query: z.object({
    search: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    verified: z.enum(['true', 'false']).optional(),
    plan: z.enum(['starter', 'professional', 'enterprise']).optional(),
    sort: z.enum(['newest', 'name_asc']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(50).optional(),
  }),
};

const slugParamSchema = {
  params: z.object({
    slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'Invalid agency slug'),
  }),
};

const submitReviewSchema = {
  params: slugParamSchema.params,
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).optional(),
  }),
};

const listReviewsQuerySchema = {
  params: slugParamSchema.params,
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(50).optional(),
  }),
};

module.exports = { listAgenciesQuerySchema, slugParamSchema, submitReviewSchema, listReviewsQuerySchema };
