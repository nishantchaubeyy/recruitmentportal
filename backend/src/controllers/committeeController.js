const prisma = require('../services/prisma');

/**
 * Get assigned candidate list for the logged in Committee Member.
 * Strictly filters to candidates where the user is assigned in InterviewPanel.
 */
async function getCommitteeAssignments(req, res) {
  const userId = req.user.id;

  try {
    const panels = await prisma.interviewPanel.findMany({
      where: { userId },
      include: {
        interview: {
          include: {
            candidate: {
              // Mobile intentionally omitted to mask contact info from committee members.
              select: {
                id: true,
                name: true
              }
            },
            job: {
              select: {
                id: true,
                position: true,
                department: true,
                qualification: true,
                experience: true
              }
            },
            application: {
              select: {
                id: true,
                applicationNumber: true,
                qualifications: true,
                experience: true,
                researchDetails: true,
                skillsCertificates: true
              }
            }
          }
        }
      }
    });

    return res.json(panels.map(p => p.interview));
  } catch (error) {
    console.error('Fetch committee assignments error:', error);
    return res.status(500).json({ error: 'Failed to retrieve committee assignments.' });
  }
}

/**
 * Get details of an assigned candidate dossier.
 */
async function getCommitteeCandidateById(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    // Verify Committee Member is assigned to an interview for this candidate
    const isAssigned = await prisma.interviewPanel.findFirst({
      where: {
        userId,
        interview: { candidateId: id }
      }
    });

    if (!isAssigned && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'HR_ADMIN') {
      return res.status(403).json({ error: 'Access forbidden. You are not assigned to evaluate this candidate.' });
    }

    const candidate = await prisma.applicant.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            job: true,
            documents: true
          }
        }
      }
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate dossier not found.' });
    }

    // Mask sensitive contact info for committee members
    if (req.user.role === 'COMMITTEE_MEMBER') {
      candidate.mobile = '●●●●●●●●●●';
    }

    return res.json(candidate);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve candidate dossier.' });
  }
}

module.exports = {
  getCommitteeAssignments,
  getCommitteeCandidateById
};
