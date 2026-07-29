const AuditLog = require('./auditLog.model');

// Never allowed to break the operation it's recording - a failed audit
// write is logged to the server console and swallowed, not surfaced as
// a 500 to a user who just wanted to save a property.
async function record({ tenantId, actor, action, targetType, targetId, metadata }) {
  try {
    await AuditLog.create({
      agencyId: tenantId || null,
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action,
      targetType,
      targetId: targetId || null,
      metadata: metadata || {},
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

// agency_admin sees every action in the agency; agent sees only their own
// - same visibility split used everywhere else in this codebase.
async function list(tenantId, requester, { limit = 50, action } = {}) {
  const filter = { agencyId: tenantId };
  if (action) filter.action = action;
  if (requester.role !== 'agency_admin') filter['actor.id'] = requester.id;

  return AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 200));
}

module.exports = { record, list };
