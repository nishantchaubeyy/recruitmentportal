const prisma = require('../services/prisma');
const { APPLICATION_STATUS, REPORT_BUCKETS } = require('../constants/statuses');

/**
 * Generates job-wise recruitment reports for Admins.
 * Returns counts for total submitted applications, under review, shortlisted, and rejected.
 */
async function getRecruitmentReport(req, res) {
  try {
    // Retrieve jobs along with non-draft applications
    const jobs = await prisma.job.findMany({
      include: {
        applications: {
          where: {
            status: {
              not: APPLICATION_STATUS.DRAFT // Exclude drafts from official reports
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map each job to report metrics
    const reportData = jobs.map(job => {
      const apps = job.applications;
      const total = apps.length;
      
      const shortlisted = apps.filter(a => REPORT_BUCKETS.shortlisted.includes(a.status)).length;
      const rejected = apps.filter(a => REPORT_BUCKETS.rejected.includes(a.status)).length;
      const underReview = apps.filter(a => REPORT_BUCKETS.underReview.includes(a.status)).length;

      return {
        jobId: job.id,
        position: job.position,
        type: job.type,
        department: job.department,
        postedDate: job.createdAt,
        totalApplications: total,
        shortlisted,
        rejected,
        underReview
      };
    });

    return res.json(reportData);
  } catch (error) {
    console.error('Generate report error:', error);
    return res.status(500).json({ error: 'Failed to generate recruitment report.' });
  }
}

module.exports = {
  getRecruitmentReport
};
