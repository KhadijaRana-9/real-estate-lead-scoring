const { z } = require('zod');

const recordSearchSchema = {
  body: z.object({
    term: z.string().trim().min(2).max(200),
    scope: z.enum(['properties', 'agencies', 'global']).optional(),
    city: z.string().trim().max(100).optional(),
    resultCount: z.coerce.number().int().min(0).optional(),
  }),
};

module.exports = { recordSearchSchema };
