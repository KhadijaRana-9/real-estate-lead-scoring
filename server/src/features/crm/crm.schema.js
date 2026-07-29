const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const TASK_STATUSES = ['pending', 'in_progress', 'done'];
const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled'];

const createTaskSchema = {
  body: z.object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).optional(),
    dueDate: z.coerce.date().optional(),
    relatedInquiry: objectIdSchema.optional(),
    relatedProperty: objectIdSchema.optional(),
    assignedTo: objectIdSchema.optional(),
  }),
};

const updateTaskStatusSchema = {
  params: z.object({ id: objectIdSchema }),
  body: z.object({ status: z.enum(TASK_STATUSES) }),
};

const listTasksQuerySchema = {
  query: z.object({
    status: z.enum(TASK_STATUSES).optional(),
    dueBefore: z.coerce.date().optional(),
  }),
};

const createAppointmentSchema = {
  body: z.object({
    title: z.string().trim().min(2).max(200),
    scheduledAt: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
    location: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(2000).optional(),
    relatedProperty: objectIdSchema.optional(),
    relatedInquiry: objectIdSchema.optional(),
    customer: z
      .object({
        name: z.string().trim().max(100).optional(),
        email: z.string().trim().max(200).optional(),
        phone: z.string().trim().max(30).optional(),
      })
      .optional(),
    assignedTo: objectIdSchema.optional(),
  }),
};

const updateAppointmentStatusSchema = {
  params: z.object({ id: objectIdSchema }),
  body: z.object({ status: z.enum(APPOINTMENT_STATUSES) }),
};

const listAppointmentsQuerySchema = {
  query: z.object({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
};

module.exports = {
  createTaskSchema,
  updateTaskStatusSchema,
  listTasksQuerySchema,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  listAppointmentsQuerySchema,
};
