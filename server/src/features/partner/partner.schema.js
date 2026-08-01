const { z } = require('zod');

const idParamSchema = { params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }) };

const createPartnerSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(200),
    logo: z.string().trim().min(1).max(1000),
    website: z.string().trim().max(300).optional(),
    category: z.string().trim().max(100).optional(),
    order: z.coerce.number().int().optional(),
  }),
};

const updatePartnerSchema = { params: idParamSchema.params, body: createPartnerSchema.body.partial() };

module.exports = { idParamSchema, createPartnerSchema, updatePartnerSchema };
