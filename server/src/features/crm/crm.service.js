const { tasks: taskRepo, appointments: appointmentRepo } = require('./crm.repository');

function notFound(what) {
  const err = new Error(`${what} not found`);
  err.status = 404;
  return err;
}

// agency_admin sees every task/appointment in the agency; agent sees only
// what's assigned to them. Same visibility rule already used for
// properties/leads elsewhere in this codebase.
function scopeFilter(requester, extra = {}) {
  return requester.role === 'agency_admin' ? extra : { ...extra, assignedTo: requester.id };
}

async function createTask(tenantId, requester, data) {
  return taskRepo.create(tenantId, {
    ...data,
    assignedTo: data.assignedTo || requester.id,
    createdBy: requester.id,
  });
}

async function listTasks(tenantId, requester, filters = {}) {
  const filter = scopeFilter(requester);
  if (filters.status) filter.status = filters.status;
  if (filters.dueBefore) filter.dueDate = { $lte: new Date(filters.dueBefore) };

  return taskRepo
    .find(tenantId, filter)
    .populate('relatedProperty', 'title city')
    .populate('relatedInquiry', 'customer.name score')
    .sort({ dueDate: 1, createdAt: -1 });
}

async function updateTaskStatus(tenantId, requester, id, status) {
  const task = await taskRepo.findById(tenantId, id);
  if (!task) throw notFound('Task');
  if (requester.role !== 'agency_admin' && task.assignedTo.toString() !== requester.id) {
    const err = new Error('You can only update your own tasks');
    err.status = 403;
    throw err;
  }
  task.status = status;
  task.completedAt = status === 'done' ? new Date() : null;
  await task.save();
  return task;
}

async function createAppointment(tenantId, requester, data) {
  return appointmentRepo.create(tenantId, {
    ...data,
    assignedTo: data.assignedTo || requester.id,
    createdBy: requester.id,
  });
}

async function listAppointments(tenantId, requester, filters = {}) {
  const filter = scopeFilter(requester);
  if (filters.status) filter.status = filters.status;
  if (filters.from || filters.to) {
    filter.scheduledAt = {};
    if (filters.from) filter.scheduledAt.$gte = new Date(filters.from);
    if (filters.to) filter.scheduledAt.$lte = new Date(filters.to);
  }

  return appointmentRepo
    .find(tenantId, filter)
    .populate('relatedProperty', 'title city')
    .sort({ scheduledAt: 1 });
}

async function updateAppointmentStatus(tenantId, requester, id, status) {
  const appointment = await appointmentRepo.findById(tenantId, id);
  if (!appointment) throw notFound('Appointment');
  if (requester.role !== 'agency_admin' && appointment.assignedTo.toString() !== requester.id) {
    const err = new Error('You can only update your own appointments');
    err.status = 403;
    throw err;
  }
  appointment.status = status;
  await appointment.save();
  return appointment;
}

const REMINDER_WINDOW_HOURS = 48;

async function getUpcomingReminders(tenantId, requester) {
  const filter = scopeFilter(requester);
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const [dueTasks, upcomingAppointments, overdueTasks] = await Promise.all([
    taskRepo
      .find(tenantId, { ...filter, status: { $ne: 'done' }, dueDate: { $gte: now, $lte: windowEnd } })
      .sort({ dueDate: 1 }),
    appointmentRepo
      .find(tenantId, { ...filter, status: 'scheduled', scheduledAt: { $gte: now, $lte: windowEnd } })
      .populate('relatedProperty', 'title city')
      .sort({ scheduledAt: 1 }),
    taskRepo.find(tenantId, { ...filter, status: { $ne: 'done' }, dueDate: { $lt: now } }).sort({ dueDate: 1 }),
  ]);

  return {
    windowHours: REMINDER_WINDOW_HOURS,
    dueSoonTasks: dueTasks,
    overdueTasks,
    upcomingAppointments,
  };
}

module.exports = {
  createTask,
  listTasks,
  updateTaskStatus,
  createAppointment,
  listAppointments,
  updateAppointmentStatus,
  getUpcomingReminders,
};
