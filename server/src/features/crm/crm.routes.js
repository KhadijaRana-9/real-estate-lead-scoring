const express = require('express');
const auth = require('../../shared/middleware/auth');
const resolveTenant = require('../../shared/middleware/resolveTenant');
const requireRole = require('../../shared/middleware/role');
const validate = require('../../shared/middleware/validate');
const controller = require('./crm.controller');
const {
  createTaskSchema,
  updateTaskStatusSchema,
  listTasksQuerySchema,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  listAppointmentsQuerySchema,
} = require('./crm.schema');

const router = express.Router();

// CRM is an internal working-pipeline tool for the people actually
// running listings - not exposed to customers or super_admin.
router.use(auth, requireRole('agent', 'agency_admin'), resolveTenant());

router.get('/reminders', controller.reminders);

router.get('/tasks', validate(listTasksQuerySchema), controller.listTasks);
router.post('/tasks', validate(createTaskSchema), controller.createTask);
router.patch('/tasks/:id/status', validate(updateTaskStatusSchema), controller.updateTaskStatus);

router.get('/appointments', validate(listAppointmentsQuerySchema), controller.listAppointments);
router.post('/appointments', validate(createAppointmentSchema), controller.createAppointment);
router.patch('/appointments/:id/status', validate(updateAppointmentStatusSchema), controller.updateAppointmentStatus);

module.exports = router;
