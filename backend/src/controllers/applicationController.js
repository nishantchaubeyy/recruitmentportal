const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
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
  if (!req.params.id || req.params.id.startsWith('app-local-')) return null;
  const application = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!application) {
    res.status(404).json({ error: 'Application not found.' });
    return null;
  }
  if (req.user?.applicantId && application.applicantId !== req.user.applicantId && !isAdminRole(req.user?.role)) {
    res.status(403).json({ error: 'Access denied.' });
    return null;
  }
  return application;
}

/**
 * Generates an 8-10 character secure, user-friendly auto-generated password.
 */
function generateSecurePassword(length = 10) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;

  let pass = '';
  pass += upper[crypto.randomInt(0, upper.length)];
  pass += lower[crypto.randomInt(0, lower.length)];
  pass += digits[crypto.randomInt(0, digits.length)];
  pass += special[crypto.randomInt(0, special.length)];

  for (let i = pass.length; i < length; i++) {
    pass += all[crypto.randomInt(0, all.length)];
  }

  return pass.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * POST /applications - start (or resume) a draft for an open vacancy.
 */
async function createApplicationDraft(req, res) {
  try {
    const job = await findJob(req.body?.jobId) || await prisma.job.findFirst({ where: { status: 'PUBLISHED' } }) || await prisma.job.findFirst();
    if (!job) return res.status(404).json({ error: 'Vacancy not found.' });

    if (!isVacancyOpen(job)) {
      return res.status(400).json({ error: 'Applications for this vacancy are closed.' });
    }

    let applicantId = req.user?.applicantId;

    // If candidate is a guest without an active session, check if email exists
    const candidateEmail = (req.body?.email || '').toLowerCase().trim();
    if (!applicantId && candidateEmail && candidateEmail.includes('@')) {
      const existingUser = await prisma.user.findUnique({
        where: { email: candidateEmail },
        include: { applicant: true }
      });
      if (existingUser?.applicant) {
        applicantId = existingUser.applicant.id;
      }
    }

    // If still no applicantId, return a client-side session ID so they can progress
    if (!applicantId) {
      const tempDraftId = `app-local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return res.status(200).json({
        message: 'Guest application session initialized.',
        applicationId: tempDraftId,
        isGuest: true
      });
    }

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
 * PUT /applications/:id - save draft details.
 */
async function updateApplicationDraft(req, res) {
  try {
    if (req.params.id && req.params.id.startsWith('app-local-')) {
      return res.status(200).json({ message: 'Local draft noted.' });
    }

    if (isAdminRole(req.user?.role)) {
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
 * POST /applications/submit or POST /applications/:id/submit
 * Submits an application with auto-account creation and credential dispatch for guests.
 */
async function submitApplication(req, res) {
  try {
    const payload = req.body || {};
    const personal = typeof payload.personalInfo === 'object' ? payload.personalInfo : parseSection(payload.personalInfo) || {};
    const contact = typeof payload.contactDetails === 'object' ? payload.contactDetails : parseSection(payload.contactDetails) || {};

    const candidateEmail = (contact.email || personal.email || payload.email || req.user?.email || '').toLowerCase().trim();
    const candidateName = (
      personal.fullName ||
      `${personal.firstName || ''} ${personal.lastName || ''}`.trim() ||
      contact.name ||
      req.user?.name ||
      'Applicant'
    );
    const candidateMobile = (contact.mobile || personal.mobile || payload.mobile || '0000000000').toString().trim();

    if (!candidateEmail || !candidateEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid candidate email address is required.' });
    }
    if (!personal.firstName && !personal.fullName) {
      return res.status(400).json({ error: 'Personal information is incomplete.' });
    }
    if (payload.declaration !== true && payload.declaration !== 'true') {
      return res.status(400).json({ error: 'You must accept the declaration before submitting.' });
    }

    // 1. Resolve or Auto-create User Account (Guest-Apply-First Model)
    let applicantId = req.user?.applicantId;
    let targetUserId = req.user?.id;
    let isNewUser = true;
    const plainTextPassword = generateSecurePassword(10);
    const hashedPassword = await bcrypt.hash(plainTextPassword, 10);

    let targetUser = await prisma.user.findUnique({
      where: { email: candidateEmail },
      include: { applicant: true }
    });

    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          email: candidateEmail,
          password: hashedPassword,
          role: 'APPLICANT',
          status: 'ACTIVE',
          applicant: {
            create: {
              name: candidateName,
              mobile: candidateMobile
            }
          }
        },
        include: { applicant: true }
      });

      applicantId = targetUser.applicant.id;
      targetUserId = targetUser.id;
      console.log(`[Submit] Auto-created new applicant user account for ${candidateEmail}`);
    } else {
      targetUserId = targetUser.id;
      // Ensure password is updated so candidate can always log in with the new credentials
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { password: hashedPassword, status: 'ACTIVE' }
      }).catch(err => console.warn('[Submit] Notice: could not update user password:', err.message));

      if (!targetUser.applicant) {
        const newApplicant = await prisma.applicant.create({
          data: {
            userId: targetUser.id,
            name: candidateName,
            mobile: candidateMobile
          }
        });
        applicantId = newApplicant.id;
      } else {
        applicantId = targetUser.applicant.id;
        if (candidateName && candidateName !== 'Applicant') {
          await prisma.applicant.update({
            where: { id: applicantId },
            data: {
              name: candidateName,
              mobile: candidateMobile || targetUser.applicant.mobile
            }
          }).catch(() => {});
        }
      }
    }

    // 2. Resolve Vacancy / Job
    let existingApplication = null;
    const appIdParam = req.params.id;
    if (appIdParam && appIdParam !== 'submit' && appIdParam !== 'new' && !appIdParam.startsWith('app-local-')) {
      existingApplication = await prisma.application.findUnique({
        where: { id: appIdParam },
        include: { job: true }
      });
      if (existingApplication && existingApplication.status !== APPLICATION_STATUS.DRAFT) {
        return res.status(409).json({ error: 'This application has already been submitted.' });
      }
    }

    let job = existingApplication?.job;
    if (!job) {
      const targetJobId = payload.jobId;
      if (targetJobId) {
        job = await findJob(targetJobId);
      }
      if (!job) {
        job = await prisma.job.findFirst({ where: { status: 'PUBLISHED' } }) || await prisma.job.findFirst();
      }
    }

    if (!job) {
      return res.status(404).json({ error: 'Vacancy not found.' });
    }

    // 3. Build section data
    let sections;
    try {
      sections = buildSectionData(payload);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // 4. Save/Submit Application in Database Transaction
    const now = new Date();
    let submitted = null;

    for (let attempt = 0; attempt < 5 && !submitted; attempt += 1) {
      try {
        submitted = await prisma.$transaction(async (tx) => {
          const applicationNumber = await nextApplicationNumber(tx);

          let app;
          if (existingApplication) {
            const claimed = await tx.application.updateMany({
              where: { id: existingApplication.id, status: APPLICATION_STATUS.DRAFT },
              data: {
                applicantId,
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
            app = await tx.application.findUnique({ where: { id: existingApplication.id } });
          } else {
            app = await tx.application.create({
              data: {
                applicationNumber,
                applicantId,
                jobId: job.id,
                schoolId: job.schoolId || null,
                departmentId: job.departmentId || null,
                status: APPLICATION_STATUS.SUBMITTED,
                submittedAt: now,
                declaration: true,
                emailVerified: true,
                completionPercentage: 100,
                ...sections
              }
            });
          }

          await tx.applicationStatusHistory.create({
            data: {
              applicationId: app.id,
              previousStatus: APPLICATION_STATUS.DRAFT,
              newStatus: APPLICATION_STATUS.SUBMITTED,
              changedByUserId: targetUserId,
              comment: 'Application submitted by candidate.'
            }
          });

          return app;
        });
      } catch (err) {
        if (err.code === 'P2002') continue;
        if (err.message === 'ALREADY_SUBMITTED') {
          return res.status(409).json({ error: 'This application has already been submitted.' });
        }
        throw err;
      }
    }

    if (!submitted) {
      return res.status(503).json({ error: 'Could not allocate an application number. Please try again.' });
    }

    // 5. Persist any Base64 uploaded documents passed from client
    if (Array.isArray(payload.uploadedDocsList)) {
      for (const doc of payload.uploadedDocsList) {
        if (doc?.fileData && typeof doc.fileData === 'string' && doc.fileData.startsWith('data:')) {
          try {
            const match = doc.fileData.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              const mimeType = match[1];
              const buffer = Buffer.from(match[2], 'base64');
              const ext = mimeType.includes('pdf') ? '.pdf' : mimeType.includes('word') || mimeType.includes('officedocument') ? '.docx' : '.bin';
              const fileName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
              const relativeDir = path.posix.join('jobs', job.id, 'applications', submitted.id);
              const destDir = storageService.getFileLocation(relativeDir);

              await fs.promises.mkdir(destDir, { recursive: true });
              await fs.promises.writeFile(path.join(destDir, fileName), buffer, { mode: 0o640 });

              const fileKey = path.posix.join(relativeDir, fileName);
              await prisma.applicationDocument.create({
                data: {
                  applicationId: submitted.id,
                  documentType: doc.documentType || 'resume',
                  filePath: fileKey,
                  originalName: safeFilename(doc.originalName || 'resume.pdf'),
                  fileSize: buffer.length,
                  mimeType
                }
              });
            }
          } catch (docErr) {
            console.warn('[Submit] Notice: could not persist attached document:', docErr.message);
          }
        }
      }
    }

    // 6. Audit Log
    await logAuditAction({
      action: 'APPLICATION_SUBMITTED',
      userId: targetUserId,
      targetType: 'Application',
      targetId: submitted.id,
      details: { applicationNumber: submitted.applicationNumber, jobId: job.id, isNewUser },
      req
    });

    // 7. Send Confirmation Email (Includes Credentials for New User)
    const loginUrl = process.env.LOGIN_URL || 'https://intranet.dypiu.ac.in/recruitment/login';

    sendSubmissionConfirmationEmail(submitted.id, {
      isNewUser: true,
      generatedPassword: plainTextPassword,
      loginUrl,
      force: true,
      isInterest: false
    }).catch((err) => console.error('[Submit] Confirmation email failed:', err.message));

    return res.status(200).json({
      message: 'Application submitted successfully.',
      applicationNumber: submitted.applicationNumber,
      applicationId: submitted.id,
      status: submitted.status,
      submittedAt: submitted.submittedAt,
      isNewUser: true,
      credentials: {
        email: candidateEmail,
        password: plainTextPassword,
        loginUrl
      },
      isInterest: false
    });
  } catch (error) {
    console.error('Submit application error:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit application.' });
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
    let applicantId = req.user?.applicantId;
    if (!applicantId) {
      const applicant = await prisma.applicant.findFirst({ where: { userId: req.user.id } });
      applicantId = applicant?.id;
    }
    if (!applicantId) {
      return res.json([]);
    }

    const applications = await prisma.application.findMany({
      where: { applicantId },
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
    if (req.params.id && req.params.id.startsWith('app-local-')) {
      return res.json({ id: req.params.id, status: APPLICATION_STATUS.DRAFT });
    }
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: {
        job: true,
        documents: { select: ownDocumentSelect },
        statusHistory: { orderBy: { changedAt: 'desc' } },
        applicant: { select: { id: true, name: true, mobile: true, user: { select: { email: true } } } }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (application.status === APPLICATION_STATUS.DRAFT) {
      if (req.user && !isAdminRole(req.user.role) && application.applicantId !== req.user.applicantId) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      return res.json(application);
    }

    if (!req.user || !(await canReadApplication(req.user, application))) {
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
    if (req.params.id && req.params.id.startsWith('app-local-')) {
      return res.json([]);
    }
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      select: { id: true, applicantId: true, status: true, documents: { select: ownDocumentSelect } }
    });
    if (!application) return res.status(404).json({ error: 'Application not found.' });
    if (application.status === APPLICATION_STATUS.DRAFT) {
      return res.json(application.documents);
    }
    if (!req.user || !(await canReadApplication(req.user, application))) {
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
    if (req.params.id && req.params.id.startsWith('app-local-')) {
      return res.status(201).json({
        message: 'Document uploaded.',
        document: {
          id: 'doc-' + Date.now(),
          documentType: req.body?.documentType || 'resume',
          originalName: safeFilename(req.file.originalname),
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          uploadedAt: new Date().toISOString()
        }
      });
    }

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
