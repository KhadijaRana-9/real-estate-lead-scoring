const crmService = require('./crm.service');

async function createTask(req, res, next) {
  try {
    const task = await crmService.createTask(req.tenant._id, req.user, req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

async function listTasks(req, res, next) {
  try {
    const tasks = await crmService.listTasks(req.tenant._id, req.user, req.query);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
}

async function updateTaskStatus(req, res, next) {
  try {
    const task = await crmService.updateTaskStatus(req.tenant._id, req.user, req.params.id, req.body.status);
    res.json(task);
  } catch (err) {
    next(err);
  }
}

async function createAppointment(req, res, next) {
  try {
    const appointment = await crmService.createAppointment(req.tenant._id, req.user, req.body);
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
}

async function listAppointments(req, res, next) {
  try {
    const appointments = await crmService.listAppointments(req.tenant._id, req.user, req.query);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}

async function updateAppointmentStatus(req, res, next) {
  try {
    const appointment = await crmService.updateAppointmentStatus(req.tenant._id, req.user, req.params.id, req.body.status);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

async function reminders(req, res, next) {
  try {
    const result = await crmService.getUpcomingReminders(req.tenant._id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTask,
  listTasks,
  updateTaskStatus,
  createAppointment,
  listAppointments,
  updateAppointmentStatus,
  reminders,
};
