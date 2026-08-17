const { z } = require('zod');

// Public self-signup can only ever produce a 'customer' account. Becoming
// an 'agent' must go through an agency_admin's invite (agency.service.js
// acceptInvite) or the reviewed apply-to-agency flow (approveApplication)
// - both of those are the only paths that check billingService.
// assertWithinLimit('agents') before a seat is consumed, and both keep a
// prospective agent out of the public team roster until a human actually
// approves them. Allowing 'agent' here would let anyone self-enroll as a
// listed agent of any agency, with no approval and no seat-limit check.
// auth.service.js still re-validates against an allowlist before use -
// this schema alone is not the trust boundary for role assignment.
const signupSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    role: z.enum(['customer']).optional(),
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
