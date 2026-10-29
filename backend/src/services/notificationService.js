const prisma = require('./prisma');
const { sendApplicationStatusEmail } = require('./emailService');
const { logAuditAction } = require('./auditService');
const { STATUS_LABELS, STATUS_NEXT_STEP } = require('../constants/statuses');

/**
 * Centralised candidate notification for an application status change:
 *  1. an in-app notification (always),
 *  2. an e-mail to the candidate's account address (recorded in the e-mail log).
 *
 * Resolves with what actually happened so the HR screen can say so honestly:
 *   { inApp: boolean, email: { status: 'SENT' | 'FAILED' | 'SKIPPED', error?: string } }
 */
async function notifyStatusChange({ userId, application, newStatus, previousStatus, comment, req }) {
  const label = STATUS_LABELS[newStatus] || newStatus;
  const outcome = { inApp: false, email: { status: 'FAILED', error: 'Not attempted' } };

  try {
    await prisma.notification.create({
      data: {
        userId,
        content: `Your application (${application.applicationNumber}) for "${application.job?.position || 'the vacancy'}" is now: ${label}.`
      }
    });
    outcome.inApp = true;
  } catch (error) {
    console.error('[Notification] In-app notification failed:', error.message);
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user?.email) {
      outcome.email = { status: 'FAILED', error: 'The candidate has no e-mail address on file.' };
    } else {
      const result = await sendApplicationStatusEmail({
        to: user.email,
        candidateName: application.applicant?.name || 'Applicant',
        applicationNumber: application.applicationNumber,
        position: application.job?.position || 'Vacancy',
        status: newStatus,
        statusLabel: label,
        nextStep: STATUS_NEXT_STEP[newStatus] || '',
        comment,
        meta: { kind: 'APPLICATION_STATUS', entityType: 'Application', entityId: application.id }
      });
      outcome.email = result.success
        ? { status: 'SENT' }
        : { status: result.skipped ? 'SKIPPED' : 'FAILED', error: result.error };
    }
  } catch (error) {
    console.error('[Notification] E-mail dispatch failed:', error.message);
    outcome.email = { status: 'FAILED', error: error.message };
  }

  await logAuditAction({
    action: 'NOTIFICATION_DISPATCHED',
    userId: req?.user?.id || userId,
    targetType: 'Application',
    targetId: application.id,
    details: { newStatus, previousStatus, recipientUserId: userId, email: outcome.email.status },
    req
  });

  return outcome;
}

module.exports = { notifyStatusChange };
