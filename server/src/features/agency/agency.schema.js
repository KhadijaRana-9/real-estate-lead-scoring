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

const timelineEventSchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100),
  title: z.string().trim().min(1).max(200),
});

const awardSchema = z.object({
  title: z.string().trim().min(1).max(200),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  issuer: z.string().trim().max(200).optional(),
});

const updateProfileSchema = {
  body: z.object({
    companyName: z.string().trim().min(2).max(200).optional(),
    phone: z.string().trim().max(30).optional(),
    contactEmail: z.string().trim().toLowerCase().email('Invalid email address').optional(),
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
    ceoMessage: z.string().trim().max(2000).optional(),
    mission: z.string().trim().max(1000).optional(),
    vision: z.string().trim().max(1000).optional(),
    timeline: z.array(timelineEventSchema).max(20).optional(),
    awards: z.array(awardSchema).max(20).optional(),
    officeGallery: z.array(z.string().trim().url()).max(30).optional(),
  }),
};

const applyToAgencySchema = {
  body: z.object({
    agencyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid agency id'),
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().trim().max(30).optional(),
    experienceYears: z.coerce.number().int().min(0).max(80).optional(),
    message: z.string().trim().max(1000).optional(),
  }),
};

const rejectApplicationSchema = {
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }),
  body: z.object({ reason: z.string().trim().max(500).optional() }),
};

const listApplicationsQuerySchema = {
  query: z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() }),
};

module.exports = {
  inviteUserSchema,
  idParamSchema,
  acceptInviteSchema,
  updateBrandingSchema,
  updateProfileSchema,
  applyToAgencySchema,
  rejectApplicationSchema,
  listApplicationsQuerySchema,
};
