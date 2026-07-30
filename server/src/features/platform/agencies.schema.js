const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #4F46E5');

const createAgencySchema = {
  body: z.object({
    companyName: z.string().trim().min(2).max(200),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(63)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    contactEmail: z.string().trim().toLowerCase().email('Invalid email address'),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(300).optional(),
    logo: z.string().trim().url().optional(),
    favicon: z.string().trim().url().optional(),
    primaryColor: hexColor.optional(),
    secondaryColor: hexColor.optional(),
    customDomain: z.string().trim().toLowerCase().optional(),
    subscriptionPlan: z.enum(['starter', 'professional', 'enterprise']).optional(),
    subscriptionStatus: z.enum(['trialing', 'active', 'past_due', 'canceled']).optional(),
    trialEndsAt: z.coerce.date().optional(),
  }),
};

const listAgenciesQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
};

const agencyIdParamSchema = {
  params: z.object({ id: objectIdSchema }),
};

const setVerifiedSchema = {
  params: agencyIdParamSchema.params,
  body: z.object({ verified: z.coerce.boolean() }),
};

const setFeaturedSchema = {
  params: agencyIdParamSchema.params,
  body: z.object({ featured: z.coerce.boolean() }),
};

module.exports = { createAgencySchema, listAgenciesQuerySchema, agencyIdParamSchema, setVerifiedSchema, setFeaturedSchema };
