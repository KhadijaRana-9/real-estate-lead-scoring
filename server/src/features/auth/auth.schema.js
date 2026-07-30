const { z } = require('zod');

// role is intentionally the only privilege-bearing field accepted here,
// and auth.service.js still re-validates it against an allowlist before
// use - this schema alone is not the trust boundary for role assignment.
const signupSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    role: z.enum(['agent', 'customer']).optional(),
  }),
};

const loginSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
};

const refreshSchema = {
  body: z.object({
    refreshToken: z.string().min(1, 'refreshToken is required'),
  }),
};

const logoutSchema = {
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
};

const updateMeSchema = {
  body: z
    .object({
      phone: z.string().trim().max(30).optional(),
      whatsapp: z.string().trim().max(30).optional(),
      avatar: z.string().trim().max(1000).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' }),
};

module.exports = { signupSchema, loginSchema, refreshSchema, logoutSchema, updateMeSchema };
