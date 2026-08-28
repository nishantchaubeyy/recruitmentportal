const prisma = require('../services/prisma');
const storageService = require('../services/storageService');
const { notifyStatusChange } = require('../services/notificationService');
const { logAuditAction } = require('../services/auditService');

/**
 * Generates a sequential application number (APP-YYYY-XXXXXX format)
 */
async function generateApplicationNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `APP-${currentYear}-`;
  
  const count = await prisma.application.count({
    where: {
      applicationNumber: { startsWith: prefix },
      status: { not: 'DRAFT' }
    }
  });

  const nextNum = (count + 1).toString().padStart(6, '0');
  return `${prefix}${nextNum}`;
}

/**
 * Initialize a new draft application for a job opening.
 */
async function createApplicationDraft(req, res) {
  const { jobId } = req.body;
  const applicantId = req.user.applicantId;

  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required to start an application.' });
  }

  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'VACANCY_NOT_FOUND',
        message: 'The requested job vacancy does not exist.'
      });
    }

    const now = new Date();

    if (job.status !== 'PUBLISHED' || (job.openingDate && new Date(job.openingDate) > now)) {
      return res.status(400).json({
        success: false,
        error: 'VACANCY_NOT_OPEN',
        message: 'Applications are currently not open for this vacancy.'
      });
    }

    if (job.deadline && now > new Date(job.deadline)) {
      return res.status(400).json({
        success: false,
        error: 'APPLICATION_DEADLINE_EXPIRED',
        message: 'The application deadline for this vacancy has passed.'
      });
    }

    // Check existing draft or application
    const existingApp = await prisma.application.findFirst({
      where: { applicantId, jobId }
    });

    if (existingApp) {
      return res.json({
        message: 'Application already exists.',
        applicationId: existingApp.id,
        status: existingApp.status
      });
    }

    const draftNumber = `DRAFT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const newApplication = await prisma.application.create({
      data: {
        applicationNumber: draftNumber,
        applicantId,
        jobId,
        status: 'DRAFT'
      }
    });

    await logAuditAction({
      action: 'APPLICATION_DRAFT_CREATED',
      userId: req.user.id,
      targetType: 'Application',
      targetId: newApplication.id,
      req
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
  const applicantId = req.user.applicantId;
  const data = req.body;

  try {
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Verify ownership
    if (application.applicantId !== applicantId && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'HR_ADMIN') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Block modifications after submission
    if (application.status !== 'DRAFT' && req.user.role === 'APPLICANT') {
      return res.status(403).json({ error: 'Submitted applications cannot be modified by the applicant.' });
    }

    const updateData = {};
    if (data.personalInfo !== undefined) updateData.personalInfo = data.personalInfo;
    if (data.contactDetails !== undefined) updateData.contactDetails = data.contactDetails;
    if (data.qualifications !== undefined) updateData.qualifications = data.qualifications;
    if (data.experience !== undefined) updateData.experience = data.experience;
    if (data.researchDetails !== undefined) updateData.researchDetails = data.researchDetails;
    if (data.skillsCertificates !== undefined) updateData.skillsCertificates = data.skillsCertificates;
    if (data.references !== undefined) updateData.references = data.references;
    if (data.declaration !== undefined) updateData.declaration = data.declaration;
    if (data.screeningRemarks !== undefined && (req.user.role === 'HR_ADMIN' || req.user.role === 'SUPER_ADMIN')) {
      updateData.screeningRemarks = data.screeningRemarks;
    }

    const updatedApp = await prisma.application.update({
      where: { id },
      data: updateData
    });

    return res.json({ message: 'Draft application updated.', application: updatedApp });
  } catch (error) {
    console.error('Update draft application error:', error);
    return res.status(500).json({ error: 'Failed to save draft application.' });
  }
}

/**
 * Submit Application with Deadline and Field Validations.
 */
async function submitApplication(req, res) {
  const { id } = req.params;
  const applicantId = req.user.applicantId;

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: true,
        documents: true
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (application.applicantId !== applicantId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (application.status !== 'DRAFT') {
      return res.status(400).json({ error: 'This application has already been submitted.' });
    }

    // 1. Validate Job vacancy availability and deadline
    const job = application.job;
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'VACANCY_NOT_FOUND',
        message: 'The requested job vacancy does not exist.'
      });
    }

    const now = new Date();

    if (job.status !== 'PUBLISHED' || (job.openingDate && new Date(job.openingDate) > now)) {
      return res.status(400).json({
        success: false,
        error: 'VACANCY_NOT_OPEN',
        message: 'Applications are currently not open for this vacancy.'
      });
    }

    if (job.deadline && now > new Date(job.deadline)) {
      return res.status(400).json({
        success: false,
        error: 'APPLICATION_DEADLINE_EXPIRED',
        message: 'The application deadline for this vacancy has passed.'
      });
    }

    // 2. Validate mandatory application sections
    if (!application.personalInfo || !application.contactDetails) {
      return res.status(400).json({ error: 'Personal Information and Contact Details are required.' });
    }

    if (!application.declaration) {
      return res.status(400).json({ error: 'You must confirm the application declaration before submitting.' });
    }

    // 3. Generate sequential reference number
    const finalAppNumber = await generateApplicationNumber();

    const submittedApp = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id },
        data: {
          applicationNumber: finalAppNumber,
          status: 'SUBMITTED',
          submittedAt: now
        }
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          previousStatus: 'DRAFT',
          newStatus: 'SUBMITTED',
          changedByUserId: req.user.id,
          comment: 'Application submitted by candidate.'
        }
      });

      return app;
    });

    // Notify candidate
    await notifyStatusChange({
      userId: req.user.id,
      application: submittedApp,
      newStatus: 'SUBMITTED',
      previousStatus: 'DRAFT',
      comment: 'Your application has been received successfully.',
      req
    });

    return res.json({
      message: 'Application submitted successfully.',
      applicationNumber: finalAppNumber,
      submittedAt: now
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

    if (application.status === 'WITHDRAWN') {
      return res.status(400).json({ error: 'Application is already withdrawn.' });
    }

    const previousStatus = application.status;

    const updatedApp = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id },
        data: { status: 'WITHDRAWN' }
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          previousStatus,
          newStatus: 'WITHDRAWN',
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
 * Get applicant's applications.
 */
async function getMyApplications(req, res) {
  const applicantId = req.user.applicantId;

  try {
    const applications = await prisma.application.findMany({
      where: { applicantId },
      include: {
        job: true,
        documents: {
          select: {
            id: true,
            documentType: true,
            originalName: true,
            fileSize: true,
            uploadedAt: true
          }
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
 * HR Application Screening List with Server-Side Pagination, Filtering & Search.
 */
async function getAllApplications(req, res) {
  const {
    page = 1,
    limit = 10,
    status,
    type,
    department,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  // Applicants only see their own
  if (req.user.role === 'APPLICANT') {
    where.applicantId = req.user.applicantId;
  } else {
    // HR Filters
    if (status) where.status = status;
    if (type) where.job = { ...where.job, type };
    if (department) where.job = { ...where.job, department: { contains: department, mode: 'insensitive' } };
  }

  // Search filter
  if (search) {
    where.OR = [
      { applicationNumber: { contains: search, mode: 'insensitive' } },
      { applicant: { name: { contains: search, mode: 'insensitive' } } },
      { job: { position: { contains: search, mode: 'insensitive' } } }
    ];
  }

  try {
    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: {
          applicant: {
            select: {
              name: true,
              mobile: true,
              user: { select: { email: true } }
            }
          },
          job: true
        },
        orderBy: { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' },
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
 * Get detailed Application dossier.
 */
async function getApplicationById(req, res) {
  const { id } = req.params;

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: true,
        documents: {
          select: {
            id: true,
            documentType: true,
            originalName: true,
            fileSize: true,
            uploadedAt: true
          }
        },
        statusHistory: { orderBy: { changedAt: 'desc' } },
        applicant: {
          include: {
            user: { select: { email: true } }
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Role check
    const isOwner = req.user.role === 'APPLICANT' && req.user.applicantId === application.applicantId;
    const isAdmin = ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN', 'COMMITTEE_MEMBER'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Confidentiality masking: Hide HR screeningRemarks from applicants
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

    // Notify applicant
    await notifyStatusChange({
      userId: application.applicant.userId,
      application,
      newStatus: status,
      previousStatus,
      comment,
      req
    });

    return res.json({ message: `Application status updated to ${status}.`, application: updatedApp });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Failed to update application status.' });
  }
}

/**
 * Get status and history for tracking.
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

    // Save using storage service abstraction
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
      where: { id: docId, applicationId: id }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
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

    if (doc.application.status !== 'DRAFT' && req.user.role === 'APPLICANT') {
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
  uploadDocument,
  downloadDocument,
  deleteDocument
};
