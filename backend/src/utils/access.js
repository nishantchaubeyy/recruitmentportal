const prisma = require('../services/prisma');
const { ADMIN_ROLES } = require('../config');

const isAdminRole = (role) => ADMIN_ROLES.includes(role);
const isCommittee = (role) => role === 'COMMITTEE_MEMBER';

/**
 * A committee member may only see applications that belong to an interview on
 * which they sit on the panel.
 */
async function committeeAssignedToApplication(userId, applicationId) {
  const panel = await prisma.interviewPanel.findFirst({
    where: {
      userId,
      interview: {
        OR: [
          { applicationId },
          { candidates: { some: { applicationId } } }
        ]
      }
    },
    select: { id: true }
  });
  return Boolean(panel);
}

async function committeeAssignedToApplicant(userId, applicantId) {
  const panel = await prisma.interviewPanel.findFirst({
    where: {
      userId,
      interview: {
        OR: [
          { candidateId: applicantId },
          { candidates: { some: { candidateId: applicantId } } }
        ]
      }
    },
    select: { id: true }
  });
  return Boolean(panel);
}

/**
 * Can this user read the given application (and its documents)?
 * - applicants: only their own
 * - HR/admin roles: everything
 * - committee: only assigned interviews
 */
async function canReadApplication(user, application) {
  if (!user || !application) return false;
  if (user.role === 'APPLICANT') return user.applicantId === application.applicantId;
  if (isAdminRole(user.role)) return true;
  if (isCommittee(user.role)) return committeeAssignedToApplication(user.id, application.id);
  return false;
}

module.exports = {
  isAdminRole,
  isCommittee,
  committeeAssignedToApplication,
  committeeAssignedToApplicant,
  canReadApplication
};
