/**
 * Audit Logging Service
 * Records system and administrative activity for compliance and security auditing.
 */

async function logAuditAction({ action, userId, targetType, targetId, details = {}, req = null }) {
  const timestamp = new Date().toISOString();
  const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown') : 'system';
  
  const logEntry = {
    timestamp,
    action,
    userId,
    targetType,
    targetId,
    ipAddress,
    details
  };

  console.log(`[AUDIT LOG] ${timestamp} | User: ${userId || 'SYSTEM'} | Action: ${action} | Target: ${targetType}:${targetId} | IP: ${ipAddress}`);

  return logEntry;
}

module.exports = {
  logAuditAction
};
