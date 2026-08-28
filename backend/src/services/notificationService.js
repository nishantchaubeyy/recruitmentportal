const prisma = require('./prisma');
const { sendApplicationStatusEmail } = require('./emailService');
const { logAuditAction } = require('./auditService');

/**
 * Centralized Notification Service
 * Triggers in-app portal notifications and email dispatches.
 */
async function notifyStatusChange({ userId, application, newStatus, previousStatus, comment, req }) {
  try {
    // 1. Create in-app portal notification
    await prisma.notification.create({
      data: {
        userId,
        content: `Your application (${application.applicationNumber}) for "${application.job.position}" status is now: ${newStatus}.`
      }
    });

    // 2. Fetch user email and dispatch SMTP email notification
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user && user.email) {
      await sendApplicationStatusEmail({
        to: user.email,
        candidateName: application.applicant?.name || 'Applicant',
        applicationNumber: application.applicationNumber,
        position: application.job?.position || 'Vacancy',
        status: newStatus,
        comment
      });
    }

    // 3. Log audit action
    await logAuditAction({
      action: 'NOTIFICATION_DISPATCHED',
      userId: req?.user?.id || userId,
      targetType: 'Application',
      targetId: application.id,
      details: { newStatus, previousStatus, recipientUserId: userId },
      req
    });
  } catch (error) {
    console.error('[Notification Service Error]:', error.message);
  }
}

module.exports = {
  notifyStatusChange
};
