const { z } = require('zod');

const listAgenciesQuerySchema = {
  query: z.object({
    search: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    verified: z.enum(['true', 'false']).optional(),
    plan: z.enum(['starter', 'professional', 'enterprise']).optional(),
    sort: z.enum(['newest', 'name_asc', 'highest_rated', 'most_properties', 'most_sold', 'most_viewed', 'trust_score']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(50).optional(),
  }),
};

const autocompleteQuerySchema = {
  query: z.object({ q: z.string().trim().min(1).max(100) }),
};

const compareQuerySchema = {
  query: z.object({
    slugs: z
      .string()
      .trim()
      .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  }),
};

const reviewIdParamSchema = {
  params: z.object({ reviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }),
};

const replyToReviewSchema = {
  params: reviewIdParamSchema.params,
  body: z.object({ text: z.string().trim().min(1).max(1000) }),
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
    images: z.array(z.string().trim().url()).max(6).optional(),
  }),
};

const listReviewsQuerySchema = {
  params: slugParamSchema.params,
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(50).optional(),
    sort: z.enum(['newest', 'highest', 'lowest', 'helpful']).optional(),
    withPhotos: z.enum(['true', 'false']).optional(),
  }),
};

module.exports = {
  listAgenciesQuerySchema,
  slugParamSchema,
  submitReviewSchema,
  listReviewsQuerySchema,
  autocompleteQuerySchema,
  compareQuerySchema,
  reviewIdParamSchema,
  replyToReviewSchema,
};
