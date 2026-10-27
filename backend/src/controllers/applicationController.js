const prisma = require('../services/prisma');
const storageService = require('../services/storageService');
const { notifyStatusChange } = require('../services/notificationService');
const { logAuditAction } = require('../services/auditService');
const { sendSubmissionConfirmationEmail } = require('../services/emailService');
const {
  APPLICATION_STATUS,
  APPLICATION_STATUS_VALUES,
  STATUS_TRANSITIONS,
  DECISION_STATUSES,
  WITHDRAWABLE_STATUSES,
  LEGACY_STATUS_ALIASES
} = require('../constants/statuses');
const {
  isAdminRole,
  isCommittee,
  canReadApplication
} = require('../utils/access');
const { cleanString, jsonSize, searchTerm, safeFilename } = require('../utils/validate');
const { validateResearch } = require('../utils/research');

const MAX_SECTION_BYTES = 200 * 1024;
const MAX_DOCUMENTS_PER_APPLICATION = 15;
const DOCUMENT_TYPES = [
  'resume', 'qualification', 'experience', 'research', 'identity', 'certificate', 'photo', 'other'
];

const ownDocumentSelect = {
  id: true, documentType: true, originalName: true, fileSize: true, mimeType: true, uploadedAt: true
};

/**
 * Serialize client section payloads into the JSON string columns.
 * Only whitelisted fields are accepted - ownership, status, job/school links,
 * verification flags and screening remarks can never be set from here.
 */
function buildSectionData(payload = {}) {
  const data = {};
  const set = (column, value) => {
    if (value === undefined) return;
    if (value === null) {
      data[column] = null;
      return;
    }
    if (typeof value !== 'object') throw new Error(`Invalid data for "${column}".`);
    if (jsonSize(value) > MAX_SECTION_BYTES) throw new Error(`The "${column}" section is too large.`);
    data[column] = JSON.stringify(value);
  };

  set('personalInfo', payload.personalInfo);
  set('contactDetails', payload.contactDetails);
  set('qualifications', payload.qualifications);
  set('experience', payload.workExperience !== undefined ? payload.workExperience : payload.experience);
  set('researchDetails', payload.phdDetails !== undefined ? payload.phdDetails : payload.researchDetails);
  set('skillsCertificates', payload.skillsCertificates);
  set('references', payload.references);

  if (payload.declaration !== undefined) data.declaration = payload.declaration === true;
  if (payload.currentStep !== undefined) data.currentStep = Math.min(20, Math.max(1, parseInt(payload.currentStep, 10) || 1));
  if (payload.completionPercentage !== undefined) {
    data.completionPercentage = Math.min(100, Math.max(0, parseInt(payload.completionPercentage, 10) || 0));
  }
  return data;
}

function isVacancyOpen(job) {
  if (!job || job.status !== 'PUBLISHED') return false;
  const now = new Date();
  if (job.openingDate && new Date(job.openingDate) > now) return false;
  if (job.deadline) {
    const deadline = new Date(job.deadline);
    // A date-only deadline stays open until the end of that day.
    if (deadline.getUTCHours() === 0 && deadline.getUTCMinutes() === 0) deadline.setUTCHours(23, 59, 59, 999);
    if (deadline < now) return false;
  }
  return true;
}

async function findJob(jobRef) {
  if (typeof jobRef !== 'string' || !jobRef) return null;
  return prisma.job.findFirst({ where: { OR: [{ id: jobRef }, { vacancyNumber: jobRef }] } });
}

/** Sequential, race-safe application number: APP-YYYY-000001. */
async function nextApplicationNumber(tx) {
  const prefix = `APP-${new Date().getFullYear()}-`;
  const last = await tx.application.findFirst({
    where: { applicationNumber: { startsWith: prefix } },
    orderBy: { applicationNumber: 'desc' },
    select: { applicationNumber: true }
  });
  const lastSeq = last ? parseInt(last.applicationNumber.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastSeq + 1).padStart(6, '0')}`;
}

function parseSection(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function loadOwnedDraft(req, res) {
  const application = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!application || application.applicantId !== req.user.applicantId) {
    res.status(404).json({ error: 'Application not found.' });
    return null;
  }
  return application;
}

/**
 * POST /applications - start (or resume) a draft for an open vacancy.
 */
async function createApplicationDraft(req, res) {
  try {
    const job = await findJob(req.body?.jobId);
    if (!job) return res.status(404).json({ error: 'Vacancy not found.' });

    if (!isVacancyOpen(job)) {
      return res.status(400).json({ error: 'Applications for this vacancy are closed.' });
    }

    const applicantId = req.user.applicantId;

    const existing = await prisma.application.findFirst({
      where: { applicantId, jobId: job.id, status: { not: APPLICATION_STATUS.WITHDRAWN } }
    });
    if (existing) {
      if (existing.status !== APPLICATION_STATUS.DRAFT) {
        return res.status(409).json({ error: 'You have already applied for this vacancy.' });
      }
      return res.status(200).json({
        message: 'Existing draft resumed.',
        applicationId: existing.id,
        application: existing
      });
    }

    const application = await prisma.application.create({
      data: {
        applicationNumber: `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        applicantId,
        jobId: job.id,
        schoolId: job.schoolId || null,
        departmentId: job.departmentId || null,
        status: APPLICATION_STATUS.DRAFT,
        ...buildSectionData(req.body)
      }
    });

    return res.status(201).json({
      message: 'Draft application initialized.',
      applicationId: application.id,
      application
    });
  } catch (error) {
    if (/section|Invalid data/.test(error.message)) return res.status(400).json({ error: error.message });
    console.error('Create draft application error:', error);
    return res.status(500).json({ error: 'Failed to initialize draft application.' });
  }
}

/**
 * PUT /applications/:id - the owning applicant saves a draft; HR may only add
 * screening remarks.
 */
async function updateApplicationDraft(req, res) {
  try {
    if (isAdminRole(req.user.role)) {
      if (typeof req.body?.screeningRemarks !== 'string') {
        return res.status(400).json({ error: 'Only screening remarks can be updated by HR.' });
      }
      const updated = await prisma.application.update({
        where: { id: req.params.id },
        data: { screeningRemarks: cleanString(req.body.screeningRemarks, 4000) }
      }).catch(() => null);
      if (!updated) return res.status(404).json({ error: 'Application not found.' });
      return res.json({ message: 'Screening remarks saved.', application: updated });
    }

    const application = await loadOwnedDraft(req, res);
    if (!application) return;

    if (application.status !== APPLICATION_STATUS.DRAFT) {
      return res.status(403).json({ error: 'Submitted applications cannot be modified.' });
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: buildSectionData(req.body)
    });
    return res.json({ message: 'Draft application updated.', application: updated });
  } catch (error) {
    if (/section|Invalid data/.test(error.message)) return res.status(400).json({ error: error.message });
    console.error('Update draft application error:', error);
    return res.status(500).json({ error: 'Failed to save draft application.' });
  }
}

/**
 * POST /applications/:id/submit
 */
async function submitApplication(req, res) {
  try {
    const application = await loadOwnedDraft(req, res);
    if (!application) return;

    if (application.status !== APPLICATION_STATUS.DRAFT) {
      return res.status(409).json({ error: 'This application has already been submitted.' });
    }

    const job = await prisma.job.findUnique({ where: { id: application.jobId } });
    if (!isVacancyOpen(job)) {
      return res.status(400).json({ error: 'The deadline for this vacancy has passed or it is no longer accepting applications.' });
    }

    // Merge any final edits sent with the submit call, then validate the result.
    let sections;
    try {
      sections = buildSectionData(req.body);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const merged = { ...application, ...sections };
    const personal = parseSection(merged.personalInfo);
    const contact = parseSection(merged.contactDetails);

    if (!personal || !(personal.fullName || personal.firstName)) {
      return res.status(400).json({ error: 'Personal information is incomplete.' });
    }
    if (!contact || !contact.email) {
      return res.status(400).json({ error: 'Contact details are incomplete.' });
    }
    if (merged.declaration !== true) {
      return res.status(400).json({ error: 'You must accept the declaration before submitting.' });
    }

    const researchError = validateResearch(parseSection(merged.researchDetails), { requireStatus: job.type === 'TEACHING' });
    if (researchError) {
      return res.status(400).json({ error: researchError });
    }

    const resumeCount = await prisma.applicationDocument.count({
      where: { applicationId: application.id, documentType: 'resume' }
    });
    if (resumeCount === 0) {
      return res.status(400).json({ error: 'Please upload your Resume / CV (PDF) before submitting. It is mandatory.' });
    }

    const now = new Date();
    let submitted = null;

    for (let attempt = 0; attempt < 5 && !submitted; attempt += 1) {
      try {
        submitted = await prisma.$transaction(async (tx) => {
          const applicationNumber = await nextApplicationNumber(tx);

          // Compare-and-set on status so a double-click cannot submit twice.
          const claimed = await tx.application.updateMany({
            where: { id: application.id, status: APPLICATION_STATUS.DRAFT },
            data: {
              ...sections,
              declaration: true,
              emailVerified: true,
              applicationNumber,
              status: APPLICATION_STATUS.SUBMITTED,
              submittedAt: now,
              completionPercentage: 100
            }
          });
          if (claimed.count !== 1) throw new Error('ALREADY_SUBMITTED');

          await tx.applicationStatusHistory.create({
            data: {
              applicationId: application.id,
              previousStatus: APPLICATION_STATUS.DRAFT,
              newStatus: APPLICATION_STATUS.SUBMITTED,
              changedByUserId: req.user.id,
              comment: 'Application submitted by candidate.'
            }
          });
          return tx.application.findUnique({ where: { id: application.id } });
        });
      } catch (err) {
        if (err.code === 'P2002') continue; // application-number collision: retry
        if (err.message === 'ALREADY_SUBMITTED') {
          return res.status(409).json({ error: 'This application has already been submitted.' });
        }
        throw err;
      }
    }

    if (!submitted) {
      return res.status(503).json({ error: 'Could not allocate an application number. Please try again.' });
    }

    await logAuditAction({
      action: 'APPLICATION_SUBMITTED',
      userId: req.user.id,
      targetType: 'Application',
      targetId: submitted.id,
      details: { applicationNumber: submitted.applicationNumber, jobId: job.id },
      req
    });

    sendSubmissionConfirmationEmail(submitted.id, {
      loginUrl: process.env.LOGIN_URL || undefined
    }).catch((err) => console.error('[Submit] Confirmation email failed:', err.message));

    return res.status(200).json({
      message: 'Application submitted successfully.',
      applicationNumber: submitted.applicationNumber,
      applicationId: submitted.id,
      status: submitted.status,
      submittedAt: submitted.submittedAt
    });
  } catch (error) {
    console.error('Submit application error:', error);
    return res.status(500).json({ error: 'Failed to submit application.' });
  }
}

/**
 * POST /applications/:id/withdraw
 */
async function withdrawApplication(req, res) {
  try {
    const application = await loadOwnedDraft(req, res);
    if (!application) return;

    if (!WITHDRAWABLE_STATUSES.includes(application.status)) {
      return res.status(400).json({ error: 'This application can no longer be withdrawn.' });
    }

    const previousStatus = application.status;
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.application.updateMany({
        where: { id: application.id, status: previousStatus },
        data: { status: APPLICATION_STATUS.WITHDRAWN }
      });
      if (claimed.count !== 1) return null;

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          previousStatus,
          newStatus: APPLICATION_STATUS.WITHDRAWN,
          changedByUserId: req.user.id,
          comment: 'Application withdrawn by applicant.'
        }
      });
      // Cancel interviews that were scheduled for this application.
      await tx.interviewCandidate.deleteMany({ where: { applicationId: application.id } });
      return tx.application.findUnique({ where: { id: application.id } });
    });

    if (!result) return res.status(409).json({ error: 'Application status changed. Please refresh and try again.' });

    await logAuditAction({
      action: 'APPLICATION_WITHDRAWN',
      userId: req.user.id,
      targetType: 'Application',
      targetId: application.id,
      details: { previousStatus },
      req
    });

    return res.json({ message: 'Application withdrawn successfully.', application: result });
  } catch (error) {
    console.error('Withdraw application error:', error);
    return res.status(500).json({ error: 'Failed to withdraw application.' });
  }
}

/**
 * GET /applications/my
 */
async function getMyApplications(req, res) {
  try {
    const applications = await prisma.application.findMany({
      where: { applicantId: req.user.applicantId },
      include: {
        job: true,
        documents: { select: ownDocumentSelect }
      },
      orderBy: { updatedAt: 'desc' }
    });
    // Screening remarks are internal to HR.
    return res.json(applications.map(({ screeningRemarks, ...rest }) => rest));
  } catch (error) {
    console.error('Get my applications error:', error);
    return res.status(500).json({ error: 'Failed to retrieve applications.' });
  }
}

/**
 * GET /applications - screening list for HR, own applications for applicants.
 */
async function getAllApplications(req, res) {
  const { status, type, department, jobId, search } = req.query;
  const sortBy = ['createdAt', 'updatedAt', 'submittedAt', 'status'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  const sortOrder = String(req.query.sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';
  const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const where = {};

  if (req.user.role === 'APPLICANT') {
    where.applicantId = req.user.applicantId;
  } else if (isAdminRole(req.user.role)) {
    if (status && status !== 'ALL') {
      if (!APPLICATION_STATUS_VALUES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter.' });
      }
      where.status = LEGACY_STATUS_ALIASES[status] ? { in: LEGACY_STATUS_ALIASES[status] } : status;
    } else {
      where.status = { not: APPLICATION_STATUS.DRAFT };
    }
    if (type === 'TEACHING' || type === 'NON_TEACHING') where.job = { ...where.job, type };
    if (department) where.job = { ...where.job, department: { contains: searchTerm(department), mode: 'insensitive' } };
    if (jobId) where.jobId = String(jobId);
  } else {
    // Committee members work from /committee/assignments.
    return res.status(403).json({ error: 'You do not have permission to perform this action.' });
  }

  const term = searchTerm(search);
  if (term) {
    where.OR = [
      { applicationNumber: { contains: term, mode: 'insensitive' } },
      { applicant: { name: { contains: term, mode: 'insensitive' } } },
      { job: { position: { contains: term, mode: 'insensitive' } } }
    ];
  }

  try {
    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: {
          applicant: { select: { name: true, mobile: true, user: { select: { email: true } } } },
          job: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      })
    ]);

    const data = req.user.role === 'APPLICANT'
      ? applications.map(({ screeningRemarks, ...rest }) => rest)
      : applications;

    return res.json({
      data,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Get all applications error:', error);
    return res.status(500).json({ error: 'Failed to retrieve applications.' });
  }
}

/**
 * GET /applications/:id
 */
async function getApplicationById(req, res) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: {
        job: true,
        documents: { select: ownDocumentSelect },
        statusHistory: { orderBy: { changedAt: 'desc' } },
        applicant: { select: { id: true, name: true, mobile: true, user: { select: { email: true } } } }
      }
    });

    if (!application || !(await canReadApplication(req.user, application))) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (!isAdminRole(req.user.role)) delete application.screeningRemarks;

    // Committee members evaluate on merit: contact details are withheld.
    if (isCommittee(req.user.role)) {
      delete application.contactDetails;
      if (application.applicant) {
        delete application.applicant.mobile;
        delete application.applicant.user;
      }
    }

    return res.json(application);
  } catch (error) {
    console.error('Get application by ID error:', error);
    return res.status(500).json({ error: 'Failed to retrieve application.' });
  }
}

/**
 * PATCH /applications/:id/status - HR workflow transitions.
 */
async function updateApplicationStatus(req, res) {
  const { status } = req.body || {};
  const comment = cleanString(req.body?.comment, 1000);
  const screeningRemarks = req.body?.screeningRemarks;

  if (!APPLICATION_STATUS_VALUES.includes(status)) {
    return res.status(400).json({ error: 'A valid application status is required.' });
  }
  if (DECISION_STATUSES.includes(status) && !['SUPER_ADMIN', 'HR_ADMIN', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only an HR administrator can record a final selection.' });
  }

  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { applicant: true, job: true }
    });
    if (!application) return res.status(404).json({ error: 'Application not found.' });

    const previousStatus = application.status;
    const allowed = STATUS_TRANSITIONS[previousStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot move an application from "${previousStatus}" to "${status}".`,
        allowedTransitions: allowed
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.application.updateMany({
        where: { id: application.id, status: previousStatus },
        data: {
          status,
          ...(typeof screeningRemarks === 'string' ? { screeningRemarks: cleanString(screeningRemarks, 4000) } : {})
        }
      });
      if (claimed.count !== 1) return null;

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          previousStatus,
          newStatus: status,
          changedByUserId: req.user.id,
          comment: comment || `Status changed from "${previousStatus}" to "${status}".`
        }
      });
      return tx.application.findUnique({ where: { id: application.id } });
    });

    if (!updated) {
      return res.status(409).json({ error: 'The application was updated by someone else. Please refresh and retry.' });
    }

    await notifyStatusChange({
      userId: application.applicant.userId,
      application,
      newStatus: status,
      previousStatus,
      comment,
      req
    });

    await logAuditAction({
      action: 'APPLICATION_STATUS_UPDATED',
      userId: req.user.id,
      targetType: 'Application',
      targetId: application.id,
      oldValue: { status: previousStatus },
      details: { status, comment: comment || null },
      req
    });

    return res.json({ message: `Application status updated to ${status}.`, application: updated });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Failed to update application status.' });
  }
}

/**
 * GET /applications/:id/status
 */
async function getApplicationStatus(req, res) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        applicantId: true,
        applicationNumber: true,
        status: true,
        submittedAt: true,
        job: { select: { position: true, department: true } },
        statusHistory: {
          select: { newStatus: true, changedAt: true, comment: true },
          orderBy: { changedAt: 'desc' }
        }
      }
    });

    if (!application || !(await canReadApplication(req.user, application))) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const { applicantId, ...rest } = application;
    return res.json(rest);
  } catch (error) {
    console.error('Get application status error:', error);
    return res.status(500).json({ error: 'Failed to retrieve application status.' });
  }
}

/**
 * GET /applications/:id/documents
 */
async function listDocuments(req, res) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      select: { id: true, applicantId: true, documents: { select: ownDocumentSelect } }
    });
    if (!application || !(await canReadApplication(req.user, application))) {
      return res.status(404).json({ error: 'Application not found.' });
    }
    return res.json(application.documents);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
}

/**
 * POST /applications/:id/documents - applicant uploads to their own draft.
 */
async function uploadDocument(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  try {
    const application = await loadOwnedDraft(req, res);
    if (!application) return;

    if (application.status !== APPLICATION_STATUS.DRAFT) {
      return res.status(403).json({ error: 'Documents cannot be added after the application is submitted.' });
    }

    const count = await prisma.applicationDocument.count({ where: { applicationId: application.id } });
    if (count >= MAX_DOCUMENTS_PER_APPLICATION) {
      return res.status(400).json({ error: `A maximum of ${MAX_DOCUMENTS_PER_APPLICATION} documents is allowed.` });
    }

    const documentType = DOCUMENT_TYPES.includes(req.body?.documentType) ? req.body.documentType : 'other';
    const saved = await storageService.saveFile(req.file, application.jobId, application.id);

    const document = await prisma.applicationDocument.create({
      data: {
        applicationId: application.id,
        documentType,
        filePath: saved.fileKey,
        originalName: safeFilename(saved.originalName),
        fileSize: saved.size,
        mimeType: saved.mimeType
      },
      select: ownDocumentSelect
    });

    return res.status(201).json({ message: 'Document uploaded successfully.', document });
  } catch (error) {
    console.error('Document upload error:', error);
    return res.status(500).json({ error: 'Failed to upload document.' });
  }
}

/**
 * GET /applications/:id/documents/:docId/download
 */
async function downloadDocument(req, res) {
  try {
    const doc = await prisma.applicationDocument.findFirst({
      where: { id: req.params.docId, applicationId: req.params.id },
      include: { application: { select: { id: true, applicantId: true } } }
    });

    if (!doc || !(await canReadApplication(req.user, doc.application))) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    if (!storageService.fileExists(doc.filePath)) {
      return res.status(404).json({ error: 'File not found on storage server.' });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    return res.download(storageService.getFileLocation(doc.filePath), safeFilename(doc.originalName));
  } catch (error) {
    console.error('Document download error:', error);
    return res.status(500).json({ error: 'Failed to download document.' });
  }
}

/**
 * DELETE /applications/:id/documents/:docId - only on the applicant's own draft.
 */
async function deleteDocument(req, res) {
  try {
    const doc = await prisma.applicationDocument.findFirst({
      where: { id: req.params.docId, applicationId: req.params.id },
      include: { application: { select: { id: true, applicantId: true, status: true } } }
    });

    if (!doc || doc.application.applicantId !== req.user.applicantId) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    if (doc.application.status !== APPLICATION_STATUS.DRAFT) {
      return res.status(403).json({ error: 'Documents cannot be deleted after application submission.' });
    }

    await prisma.applicationDocument.delete({ where: { id: doc.id } });
    await storageService.deleteFile(doc.filePath).catch((err) => console.warn('Could not remove file:', err.message));

    return res.json({ message: 'Document deleted successfully.' });
  } catch (error) {
    console.error('Document delete error:', error);
    return res.status(500).json({ error: 'Failed to delete document.' });
  }
}

module.exports = {
  createApplicationDraft,
  updateApplicationDraft,
  submitApplication,
  withdrawApplication,
  getMyApplications,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  getApplicationStatus,
  listDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  _internals: { buildSectionData, isVacancyOpen }
};
