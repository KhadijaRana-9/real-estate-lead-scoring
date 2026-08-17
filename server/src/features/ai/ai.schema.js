const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const chatMessageSchema = {
  body: z.object({
    message: z.string().trim().min(1, 'Message is required').max(4000, 'Message is too long'),
    // .nullable() in addition to .optional(): the client sends an
    // explicit `conversationId: null` for a brand-new conversation (that
    // survives JSON.stringify, unlike `undefined`, which gets dropped),
    // and .optional() alone only tolerates the key being absent, not
    // present-with-null - every first message of a new chat was failing
    // validation here.
    conversationId: objectIdSchema.nullable().optional(),
  }),
};

const conversationIdParamSchema = {
  params: z.object({ id: objectIdSchema }),
};

const updateConversationSchema = {
  params: z.object({ id: objectIdSchema }),
  body: z
    .object({
      title: z.string().trim().min(1).max(100).optional(),
      pinned: z.coerce.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' }),
};

const propertyAssistSchema = {
  body: z.object({
    action: z.enum(['improve_title', 'improve_description', 'generate_seo', 'generate_tags']),
    property: z.object({
      title: z.string().trim().max(200).optional(),
      description: z.string().trim().max(5000).optional(),
      type: z.string().trim().max(50).optional(),
      city: z.string().trim().max(100).optional(),
      locality: z.string().trim().max(100).optional(),
      bedrooms: z.coerce.number().optional(),
      bathrooms: z.coerce.number().optional(),
      area: z.coerce.number().optional(),
      areaUnit: z.string().optional(),
      amenities: z.array(z.string()).optional(),
    }),
  }),
};

// Phase 3 (Listing AI) - free text only; the extraction logic itself
// (propertyAssist.service.js's extractFields) decides what it can and
// can't find, this schema just bounds the input size.
const extractListingFieldsSchema = {
  body: z.object({
    text: z.string().trim().min(10, 'Please provide a bit more detail').max(2000, 'Text is too long'),
  }),
};

module.exports = {
  chatMessageSchema,
  conversationIdParamSchema,
  updateConversationSchema,
  propertyAssistSchema,
  extractListingFieldsSchema,
};
