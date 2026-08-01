const { z } = require('zod');

const idParamSchema = { params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }) };

const createAwardSchema = {
  body: z.object({
    title: z.string().trim().min(2).max(200),
    issuer: z.string().trim().min(2).max(200),
    year: z.coerce.number().int().min(1900).max(2100),
    description: z.string().trim().max(1000).optional(),
    imageUrl: z.string().trim().max(1000).optional(),
    certificateUrl: z.string().trim().max(1000).optional(),
    order: z.coerce.number().int().optional(),
  }),
};

const updateAwardSchema = { params: idParamSchema.params, body: createAwardSchema.body.partial() };

module.exports = { idParamSchema, createAwardSchema, updateAwardSchema };
