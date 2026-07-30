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

const officeLocationSchema = z.object({
  label: z.string().trim().max(100).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

const businessHourSchema = z.object({
  day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  open: z.string().trim().max(10).optional(),
  close: z.string().trim().max(10).optional(),
  closed: z.coerce.boolean().optional(),
});

const updateProfileSchema = {
  body: z.object({
    description: z.string().trim().max(3000).optional(),
    whatsapp: z.string().trim().max(30).optional(),
    website: z.string().trim().max(300).optional(),
    address: z.string().trim().max(300).optional(),
    city: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    coverBanner: z.string().trim().max(1000).optional(),
    licenseNumber: z.string().trim().max(100).optional(),
    establishedYear: z.coerce.number().int().min(1900).max(2100).optional(),
    languages: z.array(z.string().trim().max(50)).max(20).optional(),
    specializations: z.array(z.string().trim().max(50)).max(20).optional(),
    officeLocations: z.array(officeLocationSchema).max(10).optional(),
    businessHours: z.array(businessHourSchema).max(7).optional(),
    socialMedia: z
      .object({
        facebook: z.string().trim().max(300).optional(),
        instagram: z.string().trim().max(300).optional(),
        twitter: z.string().trim().max(300).optional(),
        linkedin: z.string().trim().max(300).optional(),
        youtube: z.string().trim().max(300).optional(),
      })
      .optional(),
  }),
};

module.exports = { inviteUserSchema, idParamSchema, acceptInviteSchema, updateBrandingSchema, updateProfileSchema };
