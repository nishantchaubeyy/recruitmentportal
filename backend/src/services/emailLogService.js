const prisma = require('./prisma');

/**
 * Persist one outgoing e-mail attempt. Logging must never break the request that sent the mail.
 */
async function recordEmail({ to, subject, kind = 'GENERAL', status, provider = null, error = null, entityType = null, entityId = null }) {
  try {
    return await prisma.emailLog.create({
      data: {
        toEmail: String(to || '').slice(0, 320),
        subject: String(subject || '').slice(0, 500),
        kind,
        status,
        provider,
        error: error ? String(error).slice(0, 1000) : null,
        entityType,
        entityId
      }
    });
  } catch (err) {
    console.warn('[EmailLog] Could not record e-mail attempt:', err.message);
    return null;
  }
}

async function listForEntity(entityType, entityId, take = 20) {
  return prisma.emailLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    take
  });
}

module.exports = { recordEmail, listForEntity };
