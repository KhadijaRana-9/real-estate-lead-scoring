const { z } = require('zod');

// Multipart form fields all arrive as strings (multer populates req.body
// alongside req.files) - z.coerce handles the number/boolean fields,
// matching the same reasoning as reports/property schemas that accept
// query-string input.
const registerSchema = {
  body: z.object({
    companyName: z.string().trim().min(2, 'Agency name is required').max(200),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(60)
      .regex(/^[a-z0-9-]+$/, 'Workspace URL must be lowercase letters, numbers, and hyphens only'),
    description: z.string().trim().max(3000).optional().default(''),
    establishedYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional(),
    website: z.string().trim().max(300).optional().default(''),
    address: z.string().trim().max(500).optional().default(''),
    city: z.string().trim().min(1, 'City is required').max(120),
    country: z.string().trim().min(1, 'Country is required').max(120),

    ownerName: z.string().trim().min(2, 'Owner name is required').max(100),
    ownerEmail: z.string().trim().toLowerCase().email('Invalid owner email'),
    ownerPhone: z.string().trim().max(30).optional().default(''),
    ownerCnic: z.string().trim().max(30).optional().default(''),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),

    subscriptionPlan: z.enum(['trial', 'starter', 'professional', 'enterprise']),
    // Meaningless for 'trial' (no checkout happens at all) - defaulted
    // rather than required, so the trial selection doesn't need a dummy
    // value from the frontend.
    billingCycle: z.enum(['monthly', 'yearly']).optional().default('monthly'),
  }),
};

const statusParamSchema = {
  params: z.object({ agencyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }),
};

module.exports = { registerSchema, statusParamSchema };
