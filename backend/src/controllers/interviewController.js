const prisma = require('../services/prisma');
const { logAuditAction } = require('../services/auditService');
const {
  sendInterviewScheduledEmail,
  sendInterviewCancelledEmail
} = require('../services/emailService');

/**
 * Helper to resolve candidate recipient email & display name.
 */
function resolveCandidateContact(candidate, application) {
  let email = '';
  let name = candidate?.name || 'Candidate';

  if (candidate?.user?.email) {
    email = candidate.user.email;
  }

  if (application) {
    try {
      const contact = typeof application.contactDetails === 'string'
        ? JSON.parse(application.contactDetails)
        : application.contactDetails || {};
      const personal = typeof application.personalInfo === 'string'
        ? JSON.parse(application.personalInfo)
        : application.personalInfo || {};

      if (!email) {
        email = contact.email || personal.email || '';
      }
      if (personal.fullName) {
        name = personal.fullName;
      } else if (personal.firstName || personal.lastName) {
        name = `${personal.firstName || ''} ${personal.lastName || ''}`.trim();
      } else if (contact.name) {
        name = contact.name;
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  return { email: email.trim().toLowerCase(), name };
}

/**
 * Schedule a new Zoom Interview (HR / Admin).
 * Supports selecting SINGLE or MULTIPLE candidates for the SAME Zoom meeting link.
 */
async function createInterview(req, res) {
  const {
    title,
    jobId,
    date,
    interviewDate,
    time,
    startTime,
    endTime,
    zoomLink,
    meetingLink,
    zoomMeetingId,
    zoomPassword,
    interviewerName,
    interviewType,
    notes,
    mode,
    venue,
    round,
    candidateIds = [],
    candidateId,
    applicationIds = [],
    applicationId,
    panelMemberUserIds = []
  } = req.body;

  const targetDate = interviewDate || date;
  const targetStartTime = startTime || time || '10:00 AM';
  const targetEndTime = endTime || '';
  const targetZoomLink = zoomLink || meetingLink || '';
  const targetTitle = title || `Interview - ${interviewType || 'Round 1'}`;

  // Normalize candidate IDs (support array or single candidateId)
  let selectedCandidateIds = Array.isArray(candidateIds) ? [...candidateIds] : [];
  if (candidateId && !selectedCandidateIds.includes(candidateId)) {
    selectedCandidateIds.push(candidateId);
  }

  if (!jobId || !targetDate || selectedCandidateIds.length === 0) {
    return res.status(400).json({
      error: 'Job opening, interview date, and at least one candidate are required.'
    });
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job opening not found.' });
    }

    // Resolve applications for all selected candidates
    const candidateApplications = await prisma.application.findMany({
      where: {
        applicantId: { in: selectedCandidateIds },
        jobId: jobId
      },
      include: {
        applicant: { include: { user: true } }
      }
    });

    // Create Interview record in database
    const primaryCandidateId = selectedCandidateIds[0];
    const primaryApp = candidateApplications.find(a => a.applicantId === primaryCandidateId) || candidateApplications[0];

    const interview = await prisma.$transaction(async (tx) => {
      const created = await tx.interview.create({
        data: {
          title: targetTitle,
          jobId,
          applicationId: primaryApp ? primaryApp.id : applicationId || null,
          candidateId: primaryCandidateId,
          date: new Date(targetDate),
          time: targetStartTime,
          startTime: targetStartTime,
          endTime: targetEndTime,
          mode: mode || (targetZoomLink ? 'ZOOM' : 'IN_PERSON'),
          venue: venue || (targetZoomLink ? 'Zoom Video Conference' : 'DYPIU Pune Campus'),
          meetingLink: targetZoomLink,
          zoomLink: targetZoomLink,
          zoomMeetingId: zoomMeetingId || null,
          zoomPassword: zoomPassword || null,
          interviewerName: interviewerName || null,
          interviewType: interviewType || 'Technical',
          notes: notes || null,
          round: round || interviewType || 'Round 1',
          status: 'SCHEDULED',
          emailStatus: 'PENDING'
        }
      });

      // Link all selected candidates to this interview via InterviewCandidate
      for (const cId of selectedCandidateIds) {
        const app = candidateApplications.find(a => a.applicantId === cId);
        await tx.interviewCandidate.create({
          data: {
            interviewId: created.id,
            candidateId: cId,
            applicationId: app ? app.id : null,
            emailStatus: 'PENDING'
          }
        });

        // Update application status to INTERVIEW_SCHEDULED
        if (app) {
          await tx.application.update({
            where: { id: app.id },
            data: { status: 'INTERVIEW_SCHEDULED' }
          });

          await tx.applicationStatusHistory.create({
            data: {
              applicationId: app.id,
              previousStatus: app.status,
              newStatus: 'INTERVIEW_SCHEDULED',
              changedByUserId: req.user.id,
              comment: `Interview scheduled on ${new Date(targetDate).toLocaleDateString('en-IN')} at ${targetStartTime} via Zoom.`
            }
          });
        }
      }

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

    // Asynchronously dispatch personalized emails to ALL selected candidates
    let emailsSentCount = 0;
    for (const cId of selectedCandidateIds) {
      try {
        const candidateRecord = await prisma.applicant.findUnique({
          where: { id: cId },
          include: { user: true }
        });
        const app = candidateApplications.find(a => a.applicantId === cId);
        const contact = resolveCandidateContact(candidateRecord, app);

        if (contact.email) {
          const mailRes = await sendInterviewScheduledEmail({
            to: contact.email,
            candidateName: contact.name,
            jobTitle: job.position,
            interviewTitle: targetTitle,
            interviewDate: targetDate,
            startTime: targetStartTime,
            endTime: targetEndTime,
            zoomLink: targetZoomLink,
            zoomMeetingId,
            zoomPassword,
            interviewerName,
            interviewType: interviewType || 'Technical',
            notes
          });

          const emailStatus = mailRes.success ? 'SENT' : 'FAILED';
          await prisma.interviewCandidate.updateMany({
            where: { interviewId: interview.id, candidateId: cId },
            data: {
              emailSent: mailRes.success,
              emailSentAt: new Date(),
              emailStatus
            }
          });
          if (mailRes.success) emailsSentCount++;
        }

        // In-app Notification
        if (candidateRecord?.userId) {
          await prisma.notification.create({
            data: {
              userId: candidateRecord.userId,
              content: `Interview Scheduled: Your interview for "${job.position}" is set for ${new Date(targetDate).toLocaleDateString('en-IN')} at ${targetStartTime} via Zoom.`
            }
          }).catch(() => {});
        }
      } catch (err) {
        console.error(`Failed to send interview email to candidate ${cId}:`, err.message);
      }
    }

    // Update parent interview email status
    await prisma.interview.update({
      where: { id: interview.id },
      data: {
        emailSent: emailsSentCount > 0,
        emailSentAt: new Date(),
        emailStatus: emailsSentCount > 0 ? 'SENT' : 'FAILED'
      }
    }).catch(() => {});

    await logAuditAction({
      action: 'ZOOM_INTERVIEW_SCHEDULED',
      userId: req.user.id,
      targetType: 'Interview',
      targetId: interview.id,
      details: {
        title: targetTitle,
        jobId,
        candidatesCount: selectedCandidateIds.length,
        zoomLink: targetZoomLink,
        date: targetDate,
        emailsSentCount
      },
      req
    });

    return res.status(201).json({
      message: `Interview scheduled successfully. Zoom meeting link sent to ${selectedCandidateIds.length} candidate(s).`,
      interviewId: interview.id,
      emailsSentCount
    });
  } catch (error) {
    console.error('Create interview error:', error);
    return res.status(500).json({ error: 'Failed to schedule interview.' });
  }
}

/**
 * List all scheduled interviews with candidate details & Zoom link status.
 */
async function getAllInterviews(req, res) {
  try {
    const { status, interviewType, search } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (interviewType && interviewType !== 'ALL') {
      where.interviewType = interviewType;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { zoomMeetingId: { contains: search, mode: 'insensitive' } },
        { interviewerName: { contains: search, mode: 'insensitive' } },
        { job: { position: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const interviews = await prisma.interview.findMany({
      where,
      include: {
        job: true,
        candidate: { include: { user: true } },
        application: true,
        candidates: {
          include: {
            candidate: { include: { user: true } },
            application: true
          }
        },
        panelMembers: {
          include: {
            user: { select: { id: true, email: true, role: true } }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    return res.json(interviews);
  } catch (error) {
    console.error('Fetch interviews error:', error);
    return res.status(500).json({ error: 'Failed to retrieve interviews.' });
  }
}

/**
 * Get interviews for logged-in Applicant (Candidate Portal side).
 */
async function getMyInterviews(req, res) {
  try {
    const userId = req.user.id;
    const applicant = await prisma.applicant.findUnique({
      where: { userId }
    });

    if (!applicant) {
      return res.json([]);
    }

    const interviews = await prisma.interview.findMany({
      where: {
        OR: [
          { candidateId: applicant.id },
          { candidates: { some: { candidateId: applicant.id } } }
        ]
      },
      include: {
        job: true,
        candidates: {
          where: { candidateId: applicant.id }
        }
      },
      orderBy: { date: 'asc' }
    });

    return res.json(interviews);
  } catch (error) {
    console.error('Get my interviews error:', error);
    return res.status(500).json({ error: 'Failed to fetch candidate interviews.' });
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
        title: true,
        date: true,
        time: true,
        startTime: true,
        endTime: true,
        mode: true,
        zoomLink: true,
        round: true,
        interviewType: true,
        status: true,
        candidates: {
          select: {
            candidate: { select: { name: true } }
          }
        },
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
 * Get Interview Details by ID.
 */
async function getInterviewById(req, res) {
  const { id } = req.params;

  try {
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: { include: { user: true } },
        job: true,
        application: true,
        candidates: {
          include: {
            candidate: { include: { user: true } },
            application: true
          }
        },
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
 * Reschedule Interview (Updates details & sends Rescheduled email to all candidates).
 */
async function rescheduleInterview(req, res) {
  const { id } = req.params;
  const {
    date,
    startTime,
    endTime,
    zoomLink,
    zoomMeetingId,
    zoomPassword,
    interviewerName,
    notes
  } = req.body;

  try {
    const existing = await prisma.interview.findUnique({
      where: { id },
      include: {
        job: true,
        candidates: {
          include: {
            candidate: { include: { user: true } },
            application: true
          }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    const updatedDate = date ? new Date(date) : existing.date;
    const updatedStartTime = startTime || existing.startTime || existing.time;
    const updatedEndTime = endTime || existing.endTime;
    const updatedZoomLink = zoomLink || existing.zoomLink;

    const updated = await prisma.interview.update({
      where: { id },
      data: {
        date: updatedDate,
        time: updatedStartTime,
        startTime: updatedStartTime,
        endTime: updatedEndTime,
        zoomLink: updatedZoomLink,
        meetingLink: updatedZoomLink,
        ...(zoomMeetingId !== undefined ? { zoomMeetingId } : {}),
        ...(zoomPassword !== undefined ? { zoomPassword } : {}),
        ...(interviewerName !== undefined ? { interviewerName } : {}),
        ...(notes !== undefined ? { notes } : {}),
        status: 'RESCHEDULED'
      }
    });

    // Notify all candidates of the new schedule via Email
    const candidateList = existing.candidates.length > 0
      ? existing.candidates
      : (existing.candidateId ? [{ candidateId: existing.candidateId, candidate: existing.candidate }] : []);

    for (const item of candidateList) {
      try {
        const contact = resolveCandidateContact(item.candidate, item.application);
        if (contact.email) {
          await sendInterviewScheduledEmail({
            to: contact.email,
            candidateName: contact.name,
            jobTitle: existing.job?.position,
            interviewTitle: existing.title,
            interviewDate: updatedDate,
            startTime: updatedStartTime,
            endTime: updatedEndTime,
            zoomLink: updatedZoomLink,
            zoomMeetingId: zoomMeetingId || existing.zoomMeetingId,
            zoomPassword: zoomPassword || existing.zoomPassword,
            interviewerName: interviewerName || existing.interviewerName,
            interviewType: existing.interviewType,
            notes: notes || existing.notes,
            isRescheduled: true
          });
        }
      } catch (err) {
        console.error('Failed to send rescheduled email:', err.message);
      }
    }

    await logAuditAction({
      action: 'INTERVIEW_RESCHEDULED',
      userId: req.user.id,
      targetType: 'Interview',
      targetId: id,
      details: { newDate: updatedDate, newStartTime: updatedStartTime },
      req
    });

    return res.json({ message: 'Interview rescheduled and updated details emailed to candidates.', interview: updated });
  } catch (error) {
    console.error('Reschedule error:', error);
    return res.status(500).json({ error: 'Failed to reschedule interview.' });
  }
}

/**
 * Cancel Interview (Sends cancellation email to candidate(s)).
 */
async function cancelInterview(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const existing = await prisma.interview.findUnique({
      where: { id },
      include: {
        job: true,
        candidates: {
          include: {
            candidate: { include: { user: true } },
            application: true
          }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    const updated = await prisma.interview.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason || 'Administrative reschedule'
      }
    });

    // Dispatch cancellation email to all candidates
    const candidateList = existing.candidates.length > 0
      ? existing.candidates
      : (existing.candidateId ? [{ candidate: existing.candidate }] : []);

    for (const item of candidateList) {
      try {
        const contact = resolveCandidateContact(item.candidate, item.application);
        if (contact.email) {
          await sendInterviewCancelledEmail({
            to: contact.email,
            candidateName: contact.name,
            jobTitle: existing.job?.position,
            interviewTitle: existing.title,
            interviewDate: existing.date,
            reason: reason || 'Administrative reschedule'
          });
        }
      } catch (err) {
        console.error('Failed to send cancellation email:', err.message);
      }
    }

    await logAuditAction({
      action: 'INTERVIEW_CANCELLED',
      userId: req.user.id,
      targetType: 'Interview',
      targetId: id,
      details: { reason },
      req
    });

    return res.json({ message: 'Interview cancelled and notification sent to candidates.', interview: updated });
  } catch (error) {
    console.error('Cancel interview error:', error);
    return res.status(500).json({ error: 'Failed to cancel interview.' });
  }
}

/**
 * Resend Interview Email to specific or all candidates.
 */
async function resendInterviewEmail(req, res) {
  const { id } = req.params;
  const { candidateId } = req.body;

  try {
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        job: true,
        candidates: {
          include: {
            candidate: { include: { user: true } },
            application: true
          }
        }
      }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    const targets = candidateId
      ? interview.candidates.filter(c => c.candidateId === candidateId)
      : interview.candidates;

    if (targets.length === 0) {
      return res.status(400).json({ error: 'No matching candidates found for this interview.' });
    }

    let sentCount = 0;
    for (const target of targets) {
      const contact = resolveCandidateContact(target.candidate, target.application);
      if (contact.email) {
        const mailRes = await sendInterviewScheduledEmail({
          to: contact.email,
          candidateName: contact.name,
          jobTitle: interview.job?.position,
          interviewTitle: interview.title,
          interviewDate: interview.date,
          startTime: interview.startTime || interview.time,
          endTime: interview.endTime,
          zoomLink: interview.zoomLink || interview.meetingLink,
          zoomMeetingId: interview.zoomMeetingId,
          zoomPassword: interview.zoomPassword,
          interviewerName: interview.interviewerName,
          interviewType: interview.interviewType,
          notes: interview.notes
        });

        if (mailRes.success) {
          await prisma.interviewCandidate.update({
            where: { id: target.id },
            data: {
              emailSent: true,
              emailSentAt: new Date(),
              emailStatus: 'SENT'
            }
          });
          sentCount++;
        }
      }
    }

    return res.json({
      message: `Interview details email resent to ${sentCount} candidate(s).`,
      sentCount
    });
  } catch (error) {
    console.error('Resend email error:', error);
    return res.status(500).json({ error: 'Failed to resend interview email.' });
  }
}

/**
 * Update Interview generic fields.
 */
async function updateInterview(req, res) {
  const { id } = req.params;
  const data = req.body || {};

  try {
    const editable = [
      'title', 'date', 'time', 'startTime', 'endTime', 'mode', 'venue',
      'meetingLink', 'zoomLink', 'zoomMeetingId', 'zoomPassword',
      'interviewerName', 'interviewType', 'notes', 'round', 'status'
    ];
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
      await tx.interviewPanel.deleteMany({ where: { interviewId: id } });
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
 * Delete Interview.
 */
async function deleteInterview(req, res) {
  const { id } = req.params;

  try {
    await prisma.interview.delete({ where: { id } });
    return res.json({ message: 'Interview deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove interview.' });
  }
}

module.exports = {
  createInterview,
  getAllInterviews,
  getMyInterviews,
  getInterviewCalendar,
  getInterviewById,
  updateInterview,
  rescheduleInterview,
  cancelInterview,
  resendInterviewEmail,
  assignPanelMembers,
  deleteInterview
};
