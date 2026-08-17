const { z } = require('zod');
const { PLANS } = require('./billing.constants');

const requestUpgradeSchema = {
  body: z.object({
    plan: z.enum(Object.keys(PLANS)),
    billingCycle: z.enum(['monthly', 'yearly']).optional().default('monthly'),
    successUrl: z.string().trim().url().optional(),
    cancelUrl: z.string().trim().url().optional(),
  }),
};

module.exports = { requestUpgradeSchema };
