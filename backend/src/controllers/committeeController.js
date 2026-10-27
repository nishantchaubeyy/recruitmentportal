const prisma = require('../services/prisma');
const { isAdminRole } = require('../utils/access');

/**
 * Applications are shown to the panel on merit alone: contact details and
 * storage internals are never returned.
 */
const applicationForPanel = {
  id: true,
  applicationNumber: true,
  qualifications: true,
  experience: true,
  researchDetails: true,
  skillsCertificates: true
};

/**
 * GET /committee/assignments - interviews on which the signed-in member sits.
 */
async function getCommitteeAssignments(req, res) {
  try {
    const where = isAdminRole(req.user.role)
      ? {}
      : { userId: req.user.id };

    const panels = await prisma.interviewPanel.findMany({
      where,
      include: {
        interview: {
          include: {
            candidate: { select: { id: true, name: true } },
            candidates: { include: { candidate: { select: { id: true, name: true } } } },
            job: { select: { id: true, position: true, department: true, qualification: true, experience: true } },
            application: { select: applicationForPanel },
            // Only the member's own score sheet is shown.
            evaluations: { where: { evaluatorId: req.user.id } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const seen = new Set();
    const interviews = panels
      .map((p) => p.interview)
      .filter((i) => i.status !== 'CANCELLED' && !seen.has(i.id) && seen.add(i.id));

    return res.json(interviews);
  } catch (error) {
    console.error('Fetch committee assignments error:', error);
    return res.status(500).json({ error: 'Failed to retrieve committee assignments.' });
  }
}

/**
 * GET /committee/candidates/:id - candidate dossier for an assigned interview.
 */
async function getCommitteeCandidateById(req, res) {
  const { id } = req.params;

  try {
    // Jobs the member has been assigned to interview this candidate for.
    const assignments = await prisma.interviewPanel.findMany({
      where: {
        ...(isAdminRole(req.user.role) ? {} : { userId: req.user.id }),
        interview: {
          status: { not: 'CANCELLED' },
          OR: [{ candidateId: id }, { candidates: { some: { candidateId: id } } }]
        }
      },
      select: { interview: { select: { jobId: true } } }
    });

    if (assignments.length === 0) {
      return res.status(404).json({ error: 'Candidate dossier not found.' });
    }
    const jobIds = [...new Set(assignments.map((a) => a.interview.jobId))];

    const candidate = await prisma.applicant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        applications: {
          where: { jobId: { in: jobIds } },
          select: {
            id: true,
            applicationNumber: true,
            status: true,
            personalInfo: true,
            qualifications: true,
            experience: true,
            researchDetails: true,
            skillsCertificates: true,
            references: true,
            job: { select: { id: true, position: true, department: true, qualification: true, experience: true } },
            documents: { select: { id: true, documentType: true, originalName: true, fileSize: true, mimeType: true } }
          }
        }
      }
    });

    if (!candidate) return res.status(404).json({ error: 'Candidate dossier not found.' });
    return res.json(candidate);
  } catch (error) {
    console.error('Fetch committee candidate error:', error);
    return res.status(500).json({ error: 'Failed to retrieve candidate dossier.' });
  }
}

module.exports = {
  getCommitteeAssignments,
  getCommitteeCandidateById
};
