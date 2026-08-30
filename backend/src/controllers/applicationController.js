const prisma = require('../services/prisma');
const storageService = require('../services/storageService');
const { notifyStatusChange } = require('../services/notificationService');
const { logAuditAction } = require('../services/auditService');
const {
  APPLICATION_STATUS,
  HR_SETTABLE_STATUSES
} = require('../constants/statuses');

const ADMIN_ROLES = ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN'];

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function isStaffRole(role) {
  return isAdminRole(role) || role === 'COMMITTEE_MEMBER';
}

/**
 * Serialize the section payload the client sends into the JSON string columns.
 * Accepts both the applicant form shape (phdDetails/workExperience) and the
 * canonical column names (researchDetails/experience).
 */
function buildSectionData(payload = {}) {
  const data = {};
  const set = (col, value) => {
    if (value !== undefined) data[col] = value === null ? null : JSON.stringify(value);
  };

  set('personalInfo', payload.personalInfo);
  set('contactDetails', payload.contactDetails);
  set('qualifications', payload.qualifications);
  if (payload.experience !== undefined) set('experience', payload.experience);
  if (payload.workExperience !== undefined) set('experience', payload.workExperience);
  if (payload.researchDetails !== undefined) set('researchDetails', payload.researchDetails);
  if (payload.phdDetails !== undefined) set('researchDetails', payload.phdDetails);
  set('skillsCertificates', payload.skillsCertificates);
  set('references', payload.references);

  if (payload.declaration !== undefined) data.declaration = Boolean(payload.declaration);
  return data;
}

/**
 * Generates a sequential application number (APP-YYYY-XXXXXX format).
 */
async function generateApplicationNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `APP-${currentYear}-`;

  const count = await prisma.application.count({
    where: {
      applicationNumber: { startsWith: prefix },
      status: { not: APPLICATION_STATUS.DRAFT }
    }
  });

  const nextNum = (count + 1).toString().padStart(6, '0');
  return `${prefix}${nextNum}`;
}

/**
 * Initialize a new draft application for a job opening.
 * Requires an authenticated applicant (enforced by route middleware).
 */
async function createApplicationDraft(req, res) {
  const { jobId } = req.body;
  const applicantId = req.user?.applicantId;

  if (!applicantId) {
    return res.status(403).json({ error: 'Only applicant accounts can create applications.' });
  }

  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required to start an application.' });
  }

  try {
    const job = await prisma.job.findFirst({
      where: { OR: [{ id: jobId }, { vacancyNumber: jobId }] }
    });

    if (!job) {
      return res.status(404).json({ error: 'The selected vacancy could not be found.' });
    }

    // Only allow starting an application against a published vacancy.
    if (job.status !== 'PUBLISHED') {
      return res.status(400).json({ error: 'This vacancy is not open for applications.' });
    }
    if (job.deadline && new Date(job.deadline) < new Date()) {
      return res.status(400).json({ error: 'The application deadline for this vacancy has passed.' });
    }

    // Reuse an existing draft for the same (applicant, job) instead of creating duplicates.
    const existingDraft = await prisma.application.findFirst({
      where: { applicantId, jobId: job.id, status: APPLICATION_STATUS.DRAFT }
    });
    if (existingDraft) {
      return res.status(200).json({
        message: 'Existing draft resumed.',
        applicationId: existingDraft.id
      });
    }

    const draftNumber = `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const newApplication = await prisma.application.create({
      data: {
        applicationNumber: draftNumber,
        applicantId,
        jobId: job.id,
        status: APPLICATION_STATUS.DRAFT,
        ...buildSectionData(req.body)
      }
    });

    return res.status(201).json({
      message: 'Draft application initialized.',
      applicationId: newApplication.id
    });
  } catch (error) {
    console.error('Create draft application error:', error);
    return res.status(500).json({ error: 'Failed to initialize draft application.' });
  }
}

/**
 * Update draft sections of an application.
 * Applicants cannot edit submitted applications.
 */
async function updateApplicationDraft(req, res) {
  const { id } = req.params;
  const applicantId = req.user?.applicantId;
  const data = req.body || {};

  try {
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const isOwner = applicantId && application.applicantId === applicantId;
    const canEdit = isOwner || isAdminRole(req.user?.role);
    if (!canEdit) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Block applicant modifications after submission.
    if (application.status !== APPLICATION_STATUS.DRAFT && req.user?.role === 'APPLICANT') {
      return res.status(403).json({ error: 'Submitted applications cannot be modified.' });
    }

    const updateData = buildSectionData(data);

    // HR screening remarks may only be written by HR/Super admins.
    if (data.screeningRemarks !== undefined && isAdminRole(req.user?.role)) {
      updateData.screeningRemarks = data.screeningRemarks;
    }

    const updatedApp = await prisma.application.update({ where: { id }, data: updateData });

    return res.json({ message: 'Draft application updated.', application: updatedApp });
  } catch (error) {
    console.error('Update draft application error:', error);
    return res.status(500).json({ error: 'Failed to save draft application.' });
  }
}

/**
 * Submit Application with deadline, ownership and field validations.
 */
async function submitApplication(req, res) {
  const { id } = req.params;
  const payload = req.body || {};
  const applicantId = req.user?.applicantId;

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: true }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Ownership: applicants may only submit their own application.
    if (!isAdminRole(req.user?.role) && application.applicantId !== applicantId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Block re-submission.
    if (application.status !== APPLICATION_STATUS.DRAFT) {
      return res.status(400).json({ error: 'This application has already been submitted.' });
    }

    // Vacancy must still be open.
    const job = application.job;
    const now = new Date();
    if (!job || job.status !== 'PUBLISHED') {
      return res.status(400).json({ error: 'This vacancy is no longer open for applications.' });
    }
    if (job.deadline && new Date(job.deadline) < now) {
      return res.status(400).json({ error: 'The application deadline for this vacancy has passed.' });
    }

    // Merge any final edits sent with the submit call.
    const sectionData = buildSectionData(payload);

    // Declaration must be accepted.
    const declarationAccepted =
      payload.declaration !== undefined ? Boolean(payload.declaration) : application.declaration;
    if (!declarationAccepted) {
      return res.status(400).json({ error: 'You must accept the declaration before submitting.' });
    }

    const finalAppNumber = await generateApplicationNumber();

    const submittedApp = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id },
        data: {
          ...sectionData,
          declaration: declarationAccepted,
          applicationNumber: finalAppNumber,
          status: APPLICATION_STATUS.SUBMITTED,
          submittedAt: now
        }
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          previousStatus: APPLICATION_STATUS.DRAFT,
          newStatus: APPLICATION_STATUS.SUBMITTED,
          changedByUserId: req.user?.id || null,
          comment: 'Application submitted by candidate.'
        }
      });

      return app;
    });

    await logAuditAction({
      action: 'APPLICATION_SUBMITTED',
      userId: req.user?.id,
      targetType: 'Application',
      targetId: id,
      details: { applicationNumber: finalAppNumber, jobId: application.jobId },
      req
    });

    return res.json({
      message: 'Application submitted successfully.',
      applicationNumber: finalAppNumber,
      status: APPLICATION_STATUS.SUBMITTED,
      submittedAt: now,
      application: submittedApp
    });
  } catch (error) {
    console.error('Submit application error:', error);
    return res.status(500).json({ error: 'Failed to submit application.' });
  }
}

/**
 * Withdraw a submitted application (Applicant).
 */
async function withdrawApplication(req, res) {
  const { id } = req.params;
  const applicantId = req.user.applicantId;

  try {
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (application.applicantId !== applicantId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (application.status === APPLICATION_STATUS.WITHDRAWN) {
      return res.status(400).json({ error: 'Application is already withdrawn.' });
    }

    if (application.status === APPLICATION_STATUS.DRAFT) {
      return res.status(400).json({ error: 'Draft applications cannot be withdrawn.' });
    }

    const previousStatus = application.status;

    const updatedApp = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id },
        data: { status: APPLICATION_STATUS.WITHDRAWN }
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          previousStatus,
          newStatus: APPLICATION_STATUS.WITHDRAWN,
          changedByUserId: req.user.id,
          comment: 'Application withdrawn by applicant.'
        }
      });

      return app;
    });

    await logAuditAction({
      action: 'APPLICATION_WITHDRAWN',
      userId: req.user.id,
      targetType: 'Application',
      targetId: id,
      details: { previousStatus },
      req
    });

    return res.json({ message: 'Application withdrawn successfully.', application: updatedApp });
  } catch (error) {
    console.error('Withdraw application error:', error);
    return res.status(500).json({ error: 'Failed to withdraw application.' });
  }
}

/**
 * Get the authenticated applicant's own applications.
 */
async function getMyApplications(req, res) {
  const applicantId = req.user.applicantId;

  try {
    const applications = await prisma.application.findMany({
      where: { applicantId },
      include: {
        job: true,
        documents: {
          select: { id: true, documentType: true, originalName: true, fileSize: true, uploadedAt: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json(applications);
  } catch (error) {
    console.error('Get my applications error:', error);
    return res.status(500).json({ error: 'Failed to retrieve applications.' });
  }
}

/**
 * HR Application Screening List with server-side pagination, filtering & search.
 * Requires authentication (applicant sees only their own; staff see all non-drafts).
 */
async function getAllApplications(req, res) {
  const {
    page = 1,
    limit = 10,
    status,
    type,
    department,
    jobId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (req.user.role === 'APPLICANT') {
    where.applicantId = req.user.applicantId;
  } else if (isStaffRole(req.user.role)) {
    where.status = status ? status : { not: APPLICATION_STATUS.DRAFT };
    if (type) where.job = { ...where.job, type };
    if (department) where.job = { ...where.job, department: { contains: department, mode: 'insensitive' } };
    if (jobId) where.jobId = jobId;
  } else {
    return res.status(403).json({ error: 'Access denied.' });
  }

  if (search) {
    where.OR = [
      { applicationNumber: { contains: search, mode: 'insensitive' } },
      { applicant: { name: { contains: search, mode: 'insensitive' } } },
      { job: { position: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const allowedSort = ['createdAt', 'updatedAt', 'submittedAt', 'status'];
  const orderField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const orderDir = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

  try {
    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: {
          applicant: {
            select: { name: true, mobile: true, user: { select: { email: true } } }
          },
          job: true
        },
        orderBy: { [orderField]: orderDir },
        skip,
        take: limitNum
      })
    ]);

    return res.json({
      data: applications,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all applications error:', error);
    return res.status(500).json({ error: 'Failed to retrieve applications.' });
  }
}

/**
 * Get detailed Application dossier. Requires authentication; only the owning
 * applicant or staff may view it.
 */
async function getApplicationById(req, res) {
  const { id } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: true,
        documents: {
          select: { id: true, documentType: true, originalName: true, fileSize: true, uploadedAt: true }
        },
        statusHistory: { orderBy: { changedAt: 'desc' } },
        applicant: { include: { user: { select: { email: true } } } }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const isOwner = req.user.role === 'APPLICANT' && req.user.applicantId === application.applicantId;
    const isStaff = isStaffRole(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Confidentiality: hide HR screening remarks from applicants.
    if (req.user.role === 'APPLICANT') {
      delete application.screeningRemarks;
    }

    return res.json(application);
  } catch (error) {
    console.error('Get application by ID error:', error);
    return res.status(500).json({ error: 'Failed to retrieve application.' });
  }
}

/**
 * HR Status Transition Handler.
 */
async function updateApplicationStatus(req, res) {
  const { id } = req.params;
  const { status, comment, screeningRemarks } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'New status is required.' });
  }

  if (!HR_SETTABLE_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Allowed values: ${HR_SETTABLE_STATUSES.join(', ')}.`
    });
  }

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      include: { applicant: true, job: true }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const previousStatus = application.status;

    const updatedApp = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id },
        data: {
          status,
          ...(screeningRemarks !== undefined ? { screeningRemarks } : {})
        }
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          previousStatus,
          newStatus: status,
          changedByUserId: req.user.id,
          comment: comment || `Status changed from "${previousStatus}" to "${status}".`
        }
      });

      return app;
    });

    // Notify applicant (best-effort; never blocks the response).
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
      targetId: id,
      oldValue: { status: previousStatus },
      details: { status, comment: comment || null },
      req
    });

    return res.json({ message: `Application status updated to ${status}.`, application: updatedApp });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Failed to update application status.' });
  }
}

/**
 * Get status and history for tracking (used by the public tracker via number).
 */
async function getApplicationStatus(req, res) {
  const { id } = req.params;

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
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

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    return res.json(application);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve application status.' });
  }
}

/**
 * Public application tracker by application number.
 * GET /api/applications/track?applicationNumber=APP-YYYY-XXXXXX
 */
async function trackApplication(req, res) {
  const { applicationNumber } = req.query;

  if (!applicationNumber) {
    return res.status(400).json({ error: 'Application number is required.' });
  }

  try {
    const application = await prisma.application.findUnique({
      where: { applicationNumber: applicationNumber.trim() },
      select: {
        applicationNumber: true,
        status: true,
        submittedAt: true,
        createdAt: true,
        job: { select: { position: true, department: true } },
        statusHistory: {
          select: { newStatus: true, changedAt: true, comment: true },
          orderBy: { changedAt: 'desc' }
        }
      }
    });

    if (!application || application.status === APPLICATION_STATUS.DRAFT) {
      return res.status(404).json({ error: 'No application found with the provided number.' });
    }

    return res.json({
      applicationNumber: application.applicationNumber,
      position: application.job?.position,
      department: application.job?.department,
      appliedDate: application.submittedAt || application.createdAt,
      status: application.status,
      history: application.statusHistory
    });
  } catch (error) {
    console.error('Track application error:', error);
    return res.status(500).json({ error: 'Failed to look up application.' });
  }
}

/**
 * Document Upload Endpoint.
 */
async function uploadDocument(req, res) {
  const { id } = req.params;
  const { documentType } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Ownership: applicants may only upload to their own draft application.
    const isOwner = req.user?.applicantId && application.applicantId === req.user.applicantId;
    if (!isOwner && !isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const saved = await storageService.saveFile(file, application.jobId, id);

    const doc = await prisma.applicationDocument.create({
      data: {
        applicationId: id,
        documentType: documentType || 'other',
        filePath: saved.fileKey,
        originalName: saved.originalName,
        fileSize: saved.size,
        mimeType: saved.mimeType
      }
    });

    return res.status(201).json({ message: 'Document uploaded successfully.', document: doc });
  } catch (error) {
    console.error('Document upload error:', error);
    return res.status(500).json({ error: 'Failed to upload document.' });
  }
}

/**
 * Download Document via Authenticated Endpoint.
 */
async function downloadDocument(req, res) {
  const { id, docId } = req.params;

  try {
    const doc = await prisma.applicationDocument.findFirst({
      where: { id: docId, applicationId: id },
      include: { application: { select: { applicantId: true } } }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const isOwner = req.user?.applicantId && doc.application.applicantId === req.user.applicantId;
    if (!isOwner && !isStaffRole(req.user?.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const absolutePath = storageService.getFileLocation(doc.filePath);
    return res.download(absolutePath, doc.originalName);
  } catch (error) {
    console.error('Document download error:', error);
    return res.status(500).json({ error: 'Failed to download document.' });
  }
}

/**
 * Delete Document.
 */
async function deleteDocument(req, res) {
  const { id, docId } = req.params;

  try {
    const doc = await prisma.applicationDocument.findFirst({
      where: { id: docId, applicationId: id },
      include: { application: true }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const isOwner = req.user?.applicantId && doc.application.applicantId === req.user.applicantId;
    if (!isOwner && !isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (doc.application.status !== APPLICATION_STATUS.DRAFT && req.user?.role === 'APPLICANT') {
      return res.status(403).json({ error: 'Documents cannot be deleted after application submission.' });
    }

    await storageService.deleteFile(doc.filePath);
    await prisma.applicationDocument.delete({ where: { id: docId } });

    return res.json({ message: 'Document deleted successfully.' });
  } catch (error) {
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
  trackApplication,
  uploadDocument,
  downloadDocument,
  deleteDocument
};
