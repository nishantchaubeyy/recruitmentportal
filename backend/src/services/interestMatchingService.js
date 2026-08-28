const prisma = require('./prisma');
const { sendEmail } = require('./emailService');

/**
 * Service to match interested applicants with newly published vacancies
 * and trigger portal/email notifications.
 */
async function matchAndNotifyInterestedApplicants(vacancyId) {
  try {
    const vacancy = await prisma.job.findUnique({
      where: { id: vacancyId },
      include: { school: true, departmentRef: true, positionRef: true }
    });

    if (!vacancy) {
      throw new Error(`Vacancy with ID ${vacancyId} not found.`);
    }

    // Find pending interest records matching category and (schoolId OR position name)
    const matchingInterests = await prisma.vacancyInterest.findMany({
      where: {
        status: 'PENDING',
        category: vacancy.type,
        OR: [
          ...(vacancy.schoolId ? [{ schoolId: vacancy.schoolId }] : []),
          { interestedPosition: { contains: vacancy.position } },
          { interestedPosition: { contains: vacancy.department } }
        ]
      }
    });

    if (matchingInterests.length === 0) {
      return { count: 0, message: 'No matching interested candidates found.' };
    }

    const now = new Date();
    const notifiedIds = [];

    for (const interest of matchingInterests) {
      // 1. Hook into Email Service
      const emailSubject = `New Vacancy Announcement: ${vacancy.position} at DYPIU`;
      const emailBody = `
        Dear ${interest.name},

        A new vacancy matching your expressed interest has just been published at D Y Patil International University:

        Position: ${vacancy.position}
        Department/School: ${vacancy.department}
        Category: ${vacancy.type}
        Application Deadline: ${new Date(vacancy.deadline).toLocaleDateString()}

        You can view details and submit your application on our Recruitment Portal.

        Best regards,
        HR Recruitment Cell
        D Y Patil International University (DYPIU)
      `;

      try {
        await sendEmail({
          to: interest.email,
          subject: emailSubject,
          text: emailBody
        });
      } catch (err) {
        console.warn(`[InterestMatchingService] Email dispatch to ${interest.email} failed:`, err.message);
      }

      // 2. Mark Vacancy Interest record as NOTIFIED
      await prisma.vacancyInterest.update({
        where: { id: interest.id },
        data: {
          status: 'NOTIFIED',
          notifiedAt: now
        }
      });

      notifiedIds.push(interest.id);
    }

    return {
      count: notifiedIds.length,
      message: `Successfully notified ${notifiedIds.length} interested candidates for vacancy "${vacancy.position}".`
    };
  } catch (error) {
    console.error('[InterestMatchingService] Error matching interested applicants:', error);
    throw error;
  }
}

module.exports = {
  matchAndNotifyInterestedApplicants
};
