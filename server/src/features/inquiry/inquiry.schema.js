const { z } = require('zod');

const createInquirySchema = {
  body: z.object({
    propertyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid propertyId'),
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    phone: z.string().trim().max(30).optional(),
    message: z.string().trim().max(2000).optional(),
    budget: z.coerce.number().positive('Budget must be greater than 0'),
    moveTimeline: z.enum(['immediate', '1-3m', '3-6m', 'exploring']).optional(),
  }),
};

const { PIPELINE_STAGES } = require('./pipelineStages');

const idParamSchema = {
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }),
};

const moveLeadStageSchema = {
  params: idParamSchema.params,
  body: z.object({ stage: z.enum(PIPELINE_STAGES) }),
};

module.exports = { createInquirySchema, idParamSchema, moveLeadStageSchema };
