const { z } = require('zod');
const { MEDIA_CATEGORIES, MEDIA_PROVIDERS } = require('./property.model');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const AREA_UNITS = ['marla', 'sqft'];
const PROPERTY_TYPES = ['house', 'flat', 'plot', 'farmhouse', 'office', 'shop', 'warehouse'];
const PROPERTY_CATEGORIES = ['residential', 'commercial'];
const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'most_viewed'];

// Field set intentionally mirrors EDITABLE_PROPERTY_FIELDS in
// property.service.js. Two independent layers enforcing the same
// boundary (HTTP input shape here, domain write-whitelist there) is
// deliberate defense-in-depth, not duplication to clean up - the service
// must stay safe even if a future route ever calls it without this
// middleware in front.
const propertyBodyShape = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().max(5000).optional(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  city: z.string().trim().min(2, 'City must be at least 2 characters').max(100),
  locality: z.string().trim().max(100).optional(),
  area: z.coerce.number().positive('Area must be greater than 0'),
  areaUnit: z.enum(AREA_UNITS).optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  category: z.enum(PROPERTY_CATEGORIES).optional(),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  bathrooms: z.coerce.number().int().nonnegative().optional(),
  floors: z.coerce.number().int().nonnegative().optional(),
  constructionYear: z.coerce.number().int().min(1900).max(2100).optional(),
  condition: z.enum(['ready', 'under_construction', 'new', 'used', '']).optional(),
  amenities: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
  location: z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    })
    .optional(),
  images: z.array(z.string().url('Each image must be a valid URL')).max(20).optional(),
  videos: z.array(z.string().url('Each video must be a valid URL')).max(10).optional(),
  virtualTourUrl: z.string().trim().max(500).optional(),
  documents: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        url: z.string().url(),
        type: z.string().trim().max(100).optional(),
      })
    )
    .max(20)
    .optional(),
  negotiable: z.coerce.boolean().optional(),
  maintenanceCharges: z.coerce.number().nonnegative().optional(),
  featured: z.coerce.boolean().optional(),
};

const createPropertySchema = {
  body: z.object(propertyBodyShape),
};

// Wizard entry point (Step 1 only has a title so far) - every other
// field that's normally required is relaxed to optional here. See
// property.service.js's publishProperty for where full completeness is
// actually enforced, once the wizard has collected everything.
const draftPropertySchema = {
  body: z.object({
    ...propertyBodyShape,
    price: propertyBodyShape.price.optional(),
    city: propertyBodyShape.city.optional(),
    area: propertyBodyShape.area.optional(),
  }),
};

const updatePropertySchema = {
  params: z.object({ id: objectIdSchema }),
  body: z
    .object(propertyBodyShape)
    .partial()
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' }),
};

const idParamSchema = {
  params: z.object({ id: objectIdSchema }),
};

const listPropertiesQuerySchema = {
  query: z.object({
    city: z.string().trim().min(1).max(100).optional(),
    locality: z.string().trim().min(1).max(100).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    type: z.enum(PROPERTY_TYPES).optional(),
    category: z.enum(PROPERTY_CATEGORIES).optional(),
    bedrooms: z.coerce.number().int().nonnegative().optional(),
    featured: z.coerce.boolean().optional(),
    agent: objectIdSchema.optional(),
    excludeId: objectIdSchema.optional(),
    sort: z.enum(SORT_OPTIONS).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(50).optional(),
  }),
};

const estimatePriceSchema = {
  body: z.object({
    city: z.string().trim().optional(),
    area: z.coerce.number().positive('Area must be greater than 0'),
    bedrooms: z.coerce.number().int().nonnegative().optional(),
    bathrooms: z.coerce.number().int().nonnegative().optional(),
  }),
};

const compareQuerySchema = {
  query: z.object({
    ids: z
      .string()
      .trim()
      .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  }),
};

const mediaImageItemSchema = z.object({
  url: z.string().trim().url(),
  thumbnail: z.string().trim().url().optional(),
  caption: z.string().trim().max(300).optional(),
  width: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  provider: z.enum(MEDIA_PROVIDERS).optional(),
});

const mediaVideoItemSchema = z.object({
  url: z.string().trim().url(),
  thumbnail: z.string().trim().url().optional(),
  title: z.string().trim().max(200).optional(),
  caption: z.string().trim().max(300).optional(),
  duration: z.coerce.number().positive().optional(),
  provider: z.enum(MEDIA_PROVIDERS).optional(),
});

const addMediaImagesSchema = {
  params: idParamSchema.params,
  body: z.object({
    category: z.enum(MEDIA_CATEGORIES),
    items: z.array(mediaImageItemSchema).min(1).max(50),
  }),
};

const addMediaVideosSchema = {
  params: idParamSchema.params,
  body: z.object({
    category: z.enum(MEDIA_CATEGORIES),
    items: z.array(mediaVideoItemSchema).min(1).max(20),
  }),
};

const mediaIdParamSchema = {
  params: z.object({ id: objectIdSchema, mediaId: objectIdSchema }),
};

const updateMediaItemSchema = {
  params: mediaIdParamSchema.params,
  body: z
    .object({
      caption: z.string().trim().max(300).optional(),
      category: z.enum(MEDIA_CATEGORIES).optional(),
      title: z.string().trim().max(200).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' }),
};

const reorderMediaSchema = {
  params: idParamSchema.params,
  body: z.object({
    category: z.enum(MEDIA_CATEGORIES),
    orderedIds: z.array(objectIdSchema).min(1).max(200),
  }),
};

module.exports = {
  createPropertySchema,
  draftPropertySchema,
  updatePropertySchema,
  idParamSchema,
  listPropertiesQuerySchema,
  estimatePriceSchema,
  compareQuerySchema,
  addMediaImagesSchema,
  addMediaVideosSchema,
  mediaIdParamSchema,
  updateMediaItemSchema,
  reorderMediaSchema,
  MEDIA_CATEGORIES,
};
