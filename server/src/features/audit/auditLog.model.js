const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // null only for platform-level actions taken by a super_admin
    // (e.g. suspending an agency) - everything else is tenant-scoped.
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', default: null, index: true },
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
    },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ agencyId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
