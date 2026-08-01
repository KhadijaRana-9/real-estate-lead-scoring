const { z } = require('zod');
const { STATUSES, CATEGORIES } = require('./project.model');

const idParamSchema = { params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }) };
const slugParamSchema = { params: z.object({ slug: z.string().trim().min(1) }) };

const locationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

const floorPlanSchema = z.object({
  name: z.string().trim().min(1).max(100),
  bedrooms: z.coerce.number().int().min(0).optional(),
  area: z.coerce.number().min(0).optional(),
  areaUnit: z.enum(['marla', 'sqft']).optional(),
  imageUrl: z.string().trim().max(1000).optional(),
});

const createProjectSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(200),
    developerId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
    description: z.string().trim().max(5000).optional(),
    category: z.enum(CATEGORIES).optional(),
    status: z.enum(STATUSES).optional(),
    city: z.string().trim().max(100).optional(),
    address: z.string().trim().max(300).optional(),
    location: locationSchema.optional(),
    launchDate: z.coerce.date().optional(),
    estimatedCompletionDate: z.coerce.date().optional(),
    plannedTotalUnits: z.coerce.number().int().min(0).optional(),
    amenities: z.array(z.string().trim().max(50)).max(30).optional(),
    logo: z.string().trim().max(1000).optional(),
    coverBanner: z.string().trim().max(1000).optional(),
    gallery: z.array(z.string().trim().url()).max(40).optional(),
    floorPlans: z.array(floorPlanSchema).max(20).optional(),
    brochureUrl: z.string().trim().max(1000).optional(),
    videoUrl: z.string().trim().max(1000).optional(),
  }),
};

const updateProjectSchema = { params: idParamSchema.params, body: createProjectSchema.body.partial() };

const listProjectsQuerySchema = {
  query: z.object({
    search: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    status: z.enum(STATUSES).optional(),
    category: z.enum(CATEGORIES).optional(),
    developerId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    featured: z.enum(['true', 'false']).optional(),
    sort: z.enum(['newest', 'launch_date', 'name_asc']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
};

const setFeaturedSchema = { params: idParamSchema.params, body: z.object({ value: z.boolean() }) };

module.exports = {
  idParamSchema,
  slugParamSchema,
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  setFeaturedSchema,
};
