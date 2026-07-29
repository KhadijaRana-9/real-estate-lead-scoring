const { z } = require('zod');

const inviteUserSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    role: z.enum(['agent', 'agency_admin']),
  }),
};

const idParamSchema = {
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }),
};

const acceptInviteSchema = {
  body: z.object({
    token: z.string().trim().min(10),
    name: z.string().trim().min(2).max(100),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
};

const updateBrandingSchema = {
  body: z.object({
    logo: z.string().trim().max(1000).optional(),
    favicon: z.string().trim().max(1000).optional(),
    primaryColor: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #4F46E5')
      .optional(),
    secondaryColor: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #0EA5E9')
      .optional(),
  }),
};

module.exports = { inviteUserSchema, idParamSchema, acceptInviteSchema, updateBrandingSchema };
