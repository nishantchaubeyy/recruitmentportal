const prisma = require('../services/prisma');

/**
 * Get assigned candidate list for the logged in Committee Member.
 * Strictly filters to candidates where the user is assigned in InterviewPanel.
 */
async function getCommitteeAssignments(req, res) {
  const userEmail = req.user.email?.toLowerCase();

  try {
    const memberRecords = await prisma.panelMember.findMany({
      where: {
        email: { equals: userEmail, mode: 'insensitive' }
      },
      include: {
        interviewAssignments: {
          include: {
            interview: {
              include: {
                candidate: {
                  select: { id: true, name: true }
                },
                job: {
                  select: { id: true, position: true, department: true, qualification: true, experience: true }
                },
                application: {
                  select: { id: true, applicationNumber: true, qualifications: true, experience: true, researchDetails: true, skillsCertificates: true }
                }
              }
            }
          }
        }
      }
    });

    const interviews = memberRecords.flatMap(m => m.interviewAssignments.map(a => a.interview)).filter(Boolean);
    return res.json(interviews);
  } catch (error) {
    console.error('Fetch committee assignments error:', error);
    return res.status(500).json({ error: 'Failed to retrieve committee assignments.' });
  }
}

/**
 * Get details of an assigned candidate dossier.
 */
async function getCommitteeCandidateById(req, res) {
  const { id } = req.params;

  try {
    // Verify Committee Member is assigned to an interview for this candidate
    const isAssigned = await prisma.interviewPanelist.findFirst({
      where: {
        member: { email: { equals: req.user.email, mode: 'insensitive' } },
        interview: { candidateId: id }
      }
    });

    if (!isAssigned && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'HR_ADMIN' && req.user.role !== 'ADMIN') {
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
