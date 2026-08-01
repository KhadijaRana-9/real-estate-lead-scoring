const { z } = require('zod');

const idParamSchema = {
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }),
};

const slugParamSchema = {
  params: z.object({ slug: z.string().trim().min(1) }),
};

const socialMediaSchema = z.object({
  facebook: z.string().trim().max(300).optional(),
  instagram: z.string().trim().max(300).optional(),
  twitter: z.string().trim().max(300).optional(),
  linkedin: z.string().trim().max(300).optional(),
  youtube: z.string().trim().max(300).optional(),
});

const createDeveloperSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(200),
    logo: z.string().trim().max(1000).optional(),
    coverBanner: z.string().trim().max(1000).optional(),
    description: z.string().trim().max(3000).optional(),
    establishedYear: z.coerce.number().int().min(1900).max(2100).optional(),
    headquartersCity: z.string().trim().max(100).optional(),
    website: z.string().trim().max(300).optional(),
    contactEmail: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional(),
    specializations: z.array(z.string().trim().max(50)).max(20).optional(),
    socialMedia: socialMediaSchema.optional(),
  }),
};

const updateDeveloperSchema = { params: idParamSchema.params, body: createDeveloperSchema.body.partial() };

const listDevelopersQuerySchema = {
  query: z.object({
    search: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    verified: z.enum(['true', 'false']).optional(),
    featured: z.enum(['true', 'false']).optional(),
    sort: z.enum(['newest', 'most_projects', 'name_asc']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
};

const setFlagSchema = { params: idParamSchema.params, body: z.object({ value: z.boolean() }) };

module.exports = {
  idParamSchema,
  slugParamSchema,
  createDeveloperSchema,
  updateDeveloperSchema,
  listDevelopersQuerySchema,
  setFlagSchema,
};
