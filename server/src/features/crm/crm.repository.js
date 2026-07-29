const Task = require('./task.model');
const Appointment = require('./appointment.model');

// Same tenantId-first-argument contract as every other repository in this
// codebase (property.repository.js, inquiry.repository.js).

const tasks = {
  find(tenantId, filter = {}) {
    return Task.find({ ...filter, agencyId: tenantId });
  },
  findById(tenantId, id) {
    return Task.findOne({ _id: id, agencyId: tenantId });
  },
  create(tenantId, data) {
    return Task.create({ ...data, agencyId: tenantId });
  },
  countDocuments(tenantId, filter = {}) {
    return Task.countDocuments({ ...filter, agencyId: tenantId });
  },
};

const appointments = {
  find(tenantId, filter = {}) {
    return Appointment.find({ ...filter, agencyId: tenantId });
  },
  findById(tenantId, id) {
    return Appointment.findOne({ _id: id, agencyId: tenantId });
  },
  create(tenantId, data) {
    return Appointment.create({ ...data, agencyId: tenantId });
  },
  countDocuments(tenantId, filter = {}) {
    return Appointment.countDocuments({ ...filter, agencyId: tenantId });
  },
};

module.exports = { tasks, appointments };
