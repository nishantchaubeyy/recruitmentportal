/**
 * Audit Logging Service
 * Persists system and administrative activity to the AuditLog table for
 * compliance and security auditing. Failures never break the calling request.
 */

const prisma = require('./prisma');

/**
 * Record an audit event.
 *
 * @param {Object}  opts
 * @param {string}  opts.action       - e.g. USER_LOGIN, APPLICATION_STATUS_UPDATED
 * @param {?string} opts.userId       - the acting user's id (null for system/anon)
 * @param {string}  opts.targetType   - entity type, e.g. 'Application'
 * @param {string}  opts.targetId     - entity id
 * @param {Object}  [opts.details]    - arbitrary JSON-serialisable detail (stored as newValue)
 * @param {Object}  [opts.oldValue]   - previous value snapshot (stored as oldValue)
 * @param {Object}  [opts.req]        - express request, used to capture IP address
 */
async function logAuditAction({ action, userId = null, targetType, targetId, details = {}, oldValue = null, req = null }) {
  const ipAddress = req
    ? (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null)
    : null;

  try {
    // Only attribute to a user when we have a real id; otherwise leave null so the
    // optional FK relation (onDelete: SetNull) stays valid.
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity: targetType || 'System',
        entityId: targetId ? String(targetId) : '',
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: details ? JSON.stringify(details) : null,
        ipAddress
      }
    });
  } catch (error) {
    // Auditing must never break the primary operation.
    console.error('[Audit Service] Failed to write audit log:', error.message);
  }
}

module.exports = {
  logAuditAction
};
