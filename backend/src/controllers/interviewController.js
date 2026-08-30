const prisma = require('../services/prisma');
const { logAuditAction } = require('../services/auditService');

/**
 * Schedule a new Interview (HR / Admin).
 */
async function createInterview(req, res) {
  const {
    applicationId,
    jobId,
    candidateId,
    date,
    time,
    mode,
    venue,
    meetingLink,
    round,
    panelMemberUserIds
  } = req.body;

  if (!applicationId || !jobId || !candidateId || !date || !time) {
    return res.status(400).json({ error: 'Application, job, candidate, date, and time are required.' });
  }

  try {
    const interview = await prisma.$transaction(async (tx) => {
      const created = await tx.interview.create({
        data: {
          applicationId,
          jobId,
          candidateId,
          date: new Date(date),
          time,
          mode: mode || 'IN_PERSON',
          venue: venue || 'DYPIU Pune Campus',
          meetingLink: meetingLink || '',
          round: round || 'Round 1',
          status: 'SCHEDULED'
        }
      });

      // Update application status to INTERVIEW_SCHEDULED
      await tx.application.update({
        where: { id: applicationId },
        data: { status: 'INTERVIEW_SCHEDULED' }
      });

      // Assign Panel Members if provided
      if (Array.isArray(panelMemberUserIds) && panelMemberUserIds.length > 0) {
        for (const userId of panelMemberUserIds) {
          await tx.interviewPanel.create({
            data: {
              interviewId: created.id,
              userId
            }
          });
        }
      }

      return created;
    });

    await logAuditAction({
      action: 'INTERVIEW_SCHEDULED',
      userId: req.user.id,
      targetType: 'Interview',
      targetId: interview.id,
      details: { candidateId, date, mode },
      req
    });

    return res.status(201).json({ message: 'Interview scheduled successfully.', interview });
  } catch (error) {
    console.error('Create interview error:', error);
    return res.status(500).json({ error: 'Failed to schedule interview.' });
  }
}

/**
 * List all scheduled interviews.
 */
async function getAllInterviews(req, res) {
  try {
    const interviews = await prisma.interview.findMany({
      include: {
        candidate: true,
        job: true,
        panelMembers: {
          include: {
            user: { select: { id: true, email: true, role: true } }
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    return res.json(interviews);
  } catch (error) {
    console.error('Fetch interviews error:', error);
    return res.status(500).json({ error: 'Failed to retrieve interviews.' });
  }
}

/**
 * Get Interview Calendar view.
 */
async function getInterviewCalendar(req, res) {
  try {
    const interviews = await prisma.interview.findMany({
      select: {
        id: true,
        date: true,
        time: true,
        mode: true,
        round: true,
        status: true,
        candidate: { select: { name: true } },
        job: { select: { position: true, department: true } }
      },
      orderBy: { date: 'asc' }
    });

    return res.json(interviews);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch interview calendar.' });
  }
}

/**
 * Get Interview Details.
 */
async function getInterviewById(req, res) {
  const { id } = req.params;

  try {
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true,
        application: true,
        panelMembers: {
          include: { user: { select: { id: true, email: true } } }
        },
        evaluations: true
      }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    return res.json(interview);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch interview.' });
  }
}

/**
 * Update Interview details.
 */
async function updateInterview(req, res) {
  const { id } = req.params;
  const data = req.body || {};

  try {
    const editable = ['date', 'time', 'mode', 'venue', 'meetingLink', 'round', 'status'];
    const updateData = {};
    for (const key of editable) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    if (updateData.date) updateData.date = new Date(updateData.date);

    const updated = await prisma.interview.update({
      where: { id },
      data: updateData
    });

    return res.json({ message: 'Interview updated.', interview: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update interview.' });
  }
}

/**
 * Assign Panel Members to an Interview.
 */
async function assignPanelMembers(req, res) {
  const { id } = req.params;
  const { panelMemberUserIds } = req.body;

  if (!Array.isArray(panelMemberUserIds)) {
    return res.status(400).json({ error: 'panelMemberUserIds must be an array.' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Clear existing assignments
      await tx.interviewPanel.deleteMany({ where: { interviewId: id } });

      // Add new assignments
      for (const userId of panelMemberUserIds) {
        await tx.interviewPanel.create({
          data: { interviewId: id, userId }
        });
      }
    });

    return res.json({ message: 'Interview panel updated successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to assign panel members.' });
  }
}

/**
 * Cancel / Delete Interview.
 */
async function deleteInterview(req, res) {
  const { id } = req.params;

  try {
    await prisma.interview.delete({ where: { id } });
    return res.json({ message: 'Interview cancelled/removed successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove interview.' });
  }
}

module.exports = {
  createInterview,
  getAllInterviews,
  getInterviewCalendar,
  getInterviewById,
  updateInterview,
  assignPanelMembers,
  deleteInterview
};
