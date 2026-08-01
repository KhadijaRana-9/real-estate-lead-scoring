const { z } = require('zod');

const subscribeSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    source: z.string().trim().max(100).optional(),
  }),
};

const unsubscribeSchema = {
  params: z.object({ token: z.string().trim().min(10) }),
};

module.exports = { subscribeSchema, unsubscribeSchema };
