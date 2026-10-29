const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');
const storageService = require('../services/storageService');
const { notifyStatusChange } = require('../services/notificationService');
const { logAuditAction } = require('../services/auditService');
const { sendSubmissionConfirmationEmail } = require('../services/emailService');
const {
  APPLICATION_STATUS,
  APPLICATION_STATUS_VALUES,
  STATUS_TRANSITIONS,
  STATUS_LABELS,
  STATUS_NEXT_STEP,
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
const { VERIFY_SECRET, JWT_ALGORITHM } = require('../config');
const { getEmailProviderStatus } = require('../services/emailService');
const { listForEntity } = require('../services/emailLogService');
const { detectFileType } = require('../utils/fileType');
const { isEmail, normalizeEmail } = require('../utils/validate');
const { validateResearch } = require('../utils/research');
const { validateQualifications } = require('../utils/qualifications');

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
  if (!req.user?.applicantId || !application || application.applicantId !== req.user.applicantId) {
    res.status(404).json({ error: 'Application not found.' });
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

  const chars = pass.split('');
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
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

    if (req.user && !req.user.applicantId) {
      return res.status(403).json({ error: 'Only candidate accounts can start applications.' });
    }
    const applicantId = req.user?.applicantId;

    // Guests get a client-side session id only. Nothing is stored (and no existing account is
    // looked up or touched) until they verify their e-mail and submit.
    if (!applicantId) {
      const tempDraftId = `app-local-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
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

    if (!req.user) return res.status(401).json({ error: 'Access token required. Please log in.' });

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
 * Decode and validate the documents a guest/applicant attaches to the submit request.
 * Everything is checked BEFORE the application is created so a bad file never leaves a
 * half-submitted application behind.
 */
const MAX_SUBMIT_DOCS = 5;
const MAX_SUBMIT_DOC_BYTES = 5 * 1024 * 1024;
const SUBMIT_DOC_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

function prepareSubmittedDocuments(list) {
  if (list === undefined || list === null) return { documents: [] };
  if (!Array.isArray(list)) return { error: 'Documents are not valid.' };
  if (list.length > MAX_SUBMIT_DOCS) return { error: `A maximum of ${MAX_SUBMIT_DOCS} documents can be attached.` };

  const documents = [];
  for (const doc of list) {
    if (!doc?.fileData) continue; // already stored on the server (logged-in drafts)
    const match = typeof doc.fileData === 'string' && doc.fileData.match(/^data:[^;,]*;base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) return { error: 'An attached document is not valid.' };
    // Reject oversized payloads before decoding them (base64 is ~4/3 of the binary size).
    if (match[1].length > Math.ceil(MAX_SUBMIT_DOC_BYTES * 4 / 3) + 8) return { error: 'Each document must be 5MB or smaller.' };

    const buffer = Buffer.from(match[1], 'base64');
    if (buffer.length > MAX_SUBMIT_DOC_BYTES) return { error: 'Each document must be 5MB or smaller.' };

    const detected = detectFileType(buffer);
    if (!detected || !SUBMIT_DOC_MIMES.includes(detected.mime)) {
      return { error: 'Only PDF or Word documents are accepted. The attached file content does not match an allowed type.' };
    }
    documents.push({
      buffer,
      detected,
      documentType: DOCUMENT_TYPES.includes(doc.documentType) ? doc.documentType : 'other',
      originalName: safeFilename(doc.originalName || `document${detected.ext}`)
    });
  }
  return { documents };
}

/** Proof that the caller controls `email` (issued by POST /auth/verify-otp). */
function hasEmailProof(token, email) {
  try {
    const proof = jwt.verify(String(token || ''), VERIFY_SECRET, { algorithms: [JWT_ALGORITHM] });
    return proof.typ === 'email-verified' && proof.email === email;
  } catch {
    return false;
  }
}

/**
 * POST /applications/submit or POST /applications/:id/submit
 *
 * - Signed-in applicants submit as themselves (their account e-mail is used).
 * - Guests must present an OTP-verified e-mail. A new account is created for them and the
 *   credentials are e-mailed. An e-mail that already has an account is never touched: the
 *   candidate is asked to log in instead.
 */
async function submitApplication(req, res) {
  try {
    const payload = req.body || {};
    const personal = typeof payload.personalInfo === 'object' && payload.personalInfo ? payload.personalInfo : parseSection(payload.personalInfo) || {};
    const contact = typeof payload.contactDetails === 'object' && payload.contactDetails ? payload.contactDetails : parseSection(payload.contactDetails) || {};

    // ---- who is submitting -------------------------------------------------------------------
    let candidateEmail;
    let applicantId = null;
    let targetUserId = null;
    const isGuest = !req.user;

    if (!isGuest) {
      if (req.user.role !== 'APPLICANT' || !req.user.applicantId) {
        return res.status(403).json({ error: 'Only candidate accounts can submit applications.' });
      }
      candidateEmail = normalizeEmail(req.user.email);
      applicantId = req.user.applicantId;
      targetUserId = req.user.id;
    } else {
      candidateEmail = normalizeEmail(contact.email || personal.email || payload.email);
      if (!isEmail(candidateEmail)) {
        return res.status(400).json({ error: 'A valid candidate email address is required.' });
      }
      if (!hasEmailProof(payload.verificationToken, candidateEmail)) {
        return res.status(400).json({ error: 'Please verify your email address with the OTP code before submitting.' });
      }
      const existingUser = await prisma.user.findUnique({ where: { email: candidateEmail }, select: { id: true } });
      if (existingUser) {
        return res.status(409).json({ error: 'An account already exists for this email address. Please log in to submit your application.' });
      }
    }

    // ---- a stored draft must belong to the caller (checked before anything else) ----
    let existingApplication = null;
    const idParam = req.params.id;
    if (idParam && idParam !== 'submit' && idParam !== 'new' && !idParam.startsWith('app-local-')) {
      if (isGuest) return res.status(404).json({ error: 'Application not found.' });
      existingApplication = await prisma.application.findUnique({ where: { id: idParam }, include: { job: true } });
      if (!existingApplication || existingApplication.applicantId !== applicantId) {
        return res.status(404).json({ error: 'Application not found.' });
      }
      if (existingApplication.status !== APPLICATION_STATUS.DRAFT) {
        return res.status(409).json({ error: 'This application has already been submitted.' });
      }
    }

    // ---- form validation -----------------------------------------------------------------------
    if (!personal.firstName && !personal.fullName) {
      return res.status(400).json({ error: 'Personal information is incomplete.' });
    }
    if (payload.declaration !== true && payload.declaration !== 'true') {
      return res.status(400).json({ error: 'You must accept the declaration before submitting.' });
    }

    let sections;
    try {
      sections = buildSectionData(payload);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    // The e-mail on the application is always the verified account e-mail.
    sections.contactDetails = JSON.stringify({ ...contact, email: candidateEmail });

    // ---- the vacancy and any saved draft -----------------------------------------------------------
    const job = existingApplication?.job || await findJob(payload.jobId);
    if (!job) return res.status(404).json({ error: 'Vacancy not found.' });
    if (!isVacancyOpen(job)) {
      return res.status(400).json({ error: 'The deadline for this vacancy has passed or it is no longer accepting applications.' });
    }

    if (!isGuest && !existingApplication) {
      const duplicate = await prisma.application.findFirst({
        where: { applicantId, jobId: job.id, status: { notIn: [APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.DRAFT] } },
        select: { id: true }
      });
      if (duplicate) return res.status(409).json({ error: 'You have already applied for this vacancy.' });
    }

    const researchError = validateResearch(parseSection(sections.researchDetails), { requireStatus: job.type === 'TEACHING' });
    if (researchError) return res.status(400).json({ error: researchError });

    const qualificationError = validateQualifications(parseSection(sections.qualifications));
    if (qualificationError) return res.status(400).json({ error: qualificationError });

    // ---- documents: validate everything before anything is written ------------------------------------
    const prepared = prepareSubmittedDocuments(payload.uploadedDocsList);
    if (prepared.error) return res.status(400).json({ error: prepared.error });

    const storedResume = existingApplication
      ? await prisma.applicationDocument.count({ where: { applicationId: existingApplication.id, documentType: 'resume' } })
      : 0;
    if (storedResume === 0 && !prepared.documents.some((d) => d.documentType === 'resume')) {
      return res.status(400).json({ error: 'Please upload your Resume / CV before submitting. It is mandatory.' });
    }

    // ---- create account (guests) + application in one transaction -----------------------------------------
    const plainTextPassword = isGuest ? generateSecurePassword(12) : null;
    const hashedPassword = isGuest ? await bcrypt.hash(plainTextPassword, 12) : null;
    const candidateName = (
      personal.fullName ||
      [personal.firstName, personal.lastName].filter(Boolean).join(' ').trim() ||
      'Applicant'
    );
    const candidateMobile = String(contact.mobile || personal.mobile || '').trim();
    const now = new Date();
    let submitted = null;

    for (let attempt = 0; attempt < 5 && !submitted; attempt += 1) {
      try {
        submitted = await prisma.$transaction(async (tx) => {
          if (isGuest) {
            const user = await tx.user.create({
              data: {
                email: candidateEmail,
                password: hashedPassword,
                role: 'APPLICANT',
                status: 'ACTIVE',
                applicant: { create: { name: candidateName, mobile: candidateMobile || '0000000000' } }
              },
              include: { applicant: true }
            });
            applicantId = user.applicant.id;
            targetUserId = user.id;
          }

          const applicationNumber = await nextApplicationNumber(tx);
          let app;
          if (existingApplication) {
            const claimed = await tx.application.updateMany({
              where: { id: existingApplication.id, status: APPLICATION_STATUS.DRAFT },
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
        if (err.code === 'P2002') {
          const target = JSON.stringify(err.meta?.target || '');
          if (/email/i.test(target)) {
            return res.status(409).json({ error: 'An account already exists for this email address. Please log in to submit your application.' });
          }
          continue; // application number collision: retry
        }
        if (err.message === 'ALREADY_SUBMITTED') {
          return res.status(409).json({ error: 'This application has already been submitted.' });
        }
        throw err;
      }
    }

    if (!submitted) {
      return res.status(503).json({ error: 'Could not allocate an application number. Please try again.' });
    }

    // ---- store validated documents --------------------------------------------------------------------------
    for (const doc of prepared.documents) {
      try {
        const saved = await storageService.saveFile(
          { buffer: doc.buffer, originalname: doc.originalName, mimetype: doc.detected.mime, size: doc.buffer.length, detectedExt: doc.detected.ext },
          job.id,
          submitted.id
        );
        await prisma.applicationDocument.create({
          data: {
            applicationId: submitted.id,
            documentType: doc.documentType,
            filePath: saved.fileKey,
            originalName: doc.originalName,
            fileSize: saved.size,
            mimeType: saved.mimeType
          }
        });
      } catch (docErr) {
        console.error('[Submit] Could not store an attached document:', docErr.message);
      }
    }

    await logAuditAction({
      action: 'APPLICATION_SUBMITTED',
      userId: targetUserId,
      targetType: 'Application',
      targetId: submitted.id,
      details: { applicationNumber: submitted.applicationNumber, jobId: job.id, newAccount: isGuest },
      req
    });

    // Confirmation e-mail (with login credentials only when an account was just created).
    sendSubmissionConfirmationEmail(submitted.id, {
      isNewUser: isGuest,
      generatedPassword: plainTextPassword,
      loginUrl: process.env.LOGIN_URL || 'https://intranet.dypiu.ac.in/recruitment/login',
      force: true,
      isInterest: false
    }).catch((err) => console.error('[Submit] Confirmation email failed:', err.message));

    // Credentials are only ever delivered by e-mail, never in the API response.
    return res.status(200).json({
      message: 'Application submitted successfully.',
      applicationNumber: submitted.applicationNumber,
      applicationId: submitted.id,
      status: submitted.status,
      submittedAt: submitted.submittedAt,
      isNewUser: isGuest,
      isInterest: false
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
      where: { applicant: { userId: req.user.id } },
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
 * Status history as the viewer may see it. HR remarks and the staff member who made the change are internal:
 * candidates only get what changed and when.
 */
function visibleHistory(history, role) {
  const list = Array.isArray(history) ? history : [];
  if (isAdminRole(role) || isCommittee(role)) return list;
  return list.map(({ id, previousStatus, newStatus, changedAt }) => ({ id, previousStatus, newStatus, changedAt }));
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

    if (!application || !req.user || !(await canReadApplication(req.user, application))) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (!isAdminRole(req.user.role)) delete application.screeningRemarks;
    else application.allowedTransitions = allowedFor(req.user.role, application.status);
    application.statusHistory = visibleHistory(application.statusHistory, req.user.role);
    application.nextStep = STATUS_NEXT_STEP[application.status] || null;

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
/** Next statuses this role may choose from the given status. */
function allowedFor(role, current) {
  const senior = ['SUPER_ADMIN', 'HR_ADMIN', 'ADMIN'].includes(role);
  return (STATUS_TRANSITIONS[current] || []).filter((s) => senior || !DECISION_STATUSES.includes(s));
}

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
        error: `An application that is "${STATUS_LABELS[previousStatus] || previousStatus}" cannot be moved to "${STATUS_LABELS[status] || status}". `
          + (allowed.length ? `Allowed next steps: ${allowed.map((s) => STATUS_LABELS[s] || s).join(', ')}.` : 'No further changes are possible.'),
        allowedTransitions: allowedFor(req.user.role, previousStatus)
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

    const notification = await notifyStatusChange({
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

    return res.json({
      message: `Application status updated to ${STATUS_LABELS[status] || status}.`,
      application: updated,
      // What the candidate was (or was not) told - shown to HR so a silent failure is impossible.
      notification,
      allowedTransitions: allowedFor(req.user.role, status)
    });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Failed to update application status.' });
  }
}

/**
 * GET /applications/:id/email-logs - HR: every e-mail attempt for this application.
 */
async function getApplicationEmailLogs(req, res) {
  try {
    const logs = await listForEntity('Application', req.params.id);
    return res.json({ provider: getEmailProviderStatus(), logs });
  } catch (error) {
    console.error('Email log error:', error);
    return res.status(500).json({ error: 'Failed to load the e-mail log.' });
  }
}

/**
 * POST /applications/:id/resend-status-email - HR: send the current status notice again.
 */
async function resendStatusEmail(req, res) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { applicant: true, job: true }
    });
    if (!application || application.status === APPLICATION_STATUS.DRAFT) {
      return res.status(404).json({ error: 'Application not found.' });
    }
    const notification = await notifyStatusChange({
      userId: application.applicant.userId,
      application,
      newStatus: application.status,
      previousStatus: application.status,
      comment: 'Sent again by the recruitment cell.',
      req
    });
    return res.json({ message: 'Status notification sent again.', notification });
  } catch (error) {
    console.error('Resend status email error:', error);
    return res.status(500).json({ error: 'Failed to resend the notification.' });
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
    rest.statusHistory = visibleHistory(rest.statusHistory, req.user.role);
    rest.nextStep = STATUS_NEXT_STEP[rest.status] || null;
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
    if (!application || !req.user || !(await canReadApplication(req.user, application))) {
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
  getApplicationEmailLogs,
  resendStatusEmail,
  listDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  _internals: { buildSectionData, isVacancyOpen }
};
