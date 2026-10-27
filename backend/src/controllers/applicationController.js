const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../services/prisma');
const storageService = require('../services/storageService');
const { notifyStatusChange } = require('../services/notificationService');
const { logAuditAction } = require('../services/auditService');
const { sendSubmissionConfirmationEmail } = require('../services/emailService');
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
  if (payload.currentStep !== undefined) data.currentStep = Math.max(1, parseInt(payload.currentStep) || 1);
  if (payload.completionPercentage !== undefined) data.completionPercentage = Math.min(100, Math.max(0, parseInt(payload.completionPercentage) || 0));
  if (payload.emailVerified !== undefined) data.emailVerified = Boolean(payload.emailVerified);
  if (payload.schoolId !== undefined) data.schoolId = payload.schoolId;
  if (payload.departmentId !== undefined) data.departmentId = payload.departmentId;

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
 * Initialize a new draft application for a job opening.
 * Allows authenticated applicants or direct guest applicants filling the form.
 */
async function createApplicationDraft(req, res) {
  try {
    const { jobId, email } = req.body;
    let applicantId = req.user?.applicantId;

    let job = null;
    if (jobId) {
      job = await prisma.job.findFirst({
        where: { OR: [{ id: jobId }, { vacancyNumber: jobId }] }
      });
    }
    if (!job) {
      job = await prisma.job.findFirst({ where: { status: 'PUBLISHED' } }) || await prisma.job.findFirst();
    }

    if (!job) {
      return res.status(404).json({ error: 'No active job position available for application.' });
    }

    // If candidate is a guest without an existing user/applicant profile:
    if (!applicantId && email && email.includes('@')) {
      const cleanEmail = email.toLowerCase().trim();
      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: { applicant: true }
      });
      if (existingUser?.applicant) {
        applicantId = existingUser.applicant.id;
      }
    }

    // If still no applicantId, allow initializing client-side draft session
    if (!applicantId) {
      const tempDraftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return res.status(200).json({
        message: 'Guest application session initialized.',
        applicationId: tempDraftId,
        isGuest: true
      });
    }

    // Reuse an existing draft for the same (applicant, job) instead of creating duplicates.
    const existingDraft = await prisma.application.findFirst({
      where: { applicantId, jobId: job.id, status: APPLICATION_STATUS.DRAFT }
    });
    if (existingDraft) {
      return res.status(200).json({
        message: 'Existing draft resumed.',
        applicationId: existingDraft.id,
        application: existingDraft
      });
    }

    const draftNumber = `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const newApplication = await prisma.application.create({
      data: {
        applicationNumber: draftNumber,
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
      applicationId: newApplication.id,
      application: newApplication
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

    let isOwner = applicantId && application.applicantId === applicantId;
    let canEdit = isOwner || !applicantId || isAdminRole(req.user?.role);

    // If it is an unsubmitted draft, allow active applicant to adopt and edit it
    if (!canEdit && application.status === APPLICATION_STATUS.DRAFT) {
      canEdit = true;
      if (applicantId) {
        await prisma.application.update({
          where: { id },
          data: { applicantId }
        }).catch(() => {});
      }
    }

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
 * Submit Application with guest account auto-creation, password generation, and email dispatch.
 */
async function submitApplication(req, res) {
  const { id } = req.params;
  const payload = req.body || {};
  let applicantId = req.user?.applicantId;

  try {
    // 1. Extract and sanitize candidate details
    const personal = typeof payload.personalInfo === 'object' ? payload.personalInfo : JSON.parse(payload.personalInfo || '{}');
    const contact = typeof payload.contactDetails === 'object' ? payload.contactDetails : JSON.parse(payload.contactDetails || '{}');

    const candidateEmail = (contact?.email || personal?.email || payload.email || req.user?.email || '').toLowerCase().trim();
    const candidateName = (
      contact?.name ||
      personal?.fullName ||
      `${personal?.firstName || ''} ${personal?.lastName || ''}`.trim() ||
      req.user?.name ||
      'Applicant'
    );
    const candidateMobile = (contact?.mobile || personal?.mobile || payload.mobile || '0000000000').toString().trim();

    if (!candidateEmail || !candidateEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid candidate email address is required.' });
    }

    // 2. Declaration check
    const declarationAccepted = payload.declaration !== undefined ? Boolean(payload.declaration) : true;
    if (!declarationAccepted) {
      return res.status(400).json({ error: 'You must accept the declaration before submitting.' });
    }

    // 3. User Lookup or Auto-creation (Guest-Apply-First Model)
    let isNewUser = false;
    let plainTextPassword = null;

    let targetUser = await prisma.user.findUnique({
      where: { email: candidateEmail },
      include: { applicant: true }
    });

    if (!targetUser) {
      // User DOES NOT exist -> Generate random 8-10 character secure password
      plainTextPassword = generateSecurePassword(10);
      const hashedPassword = await bcrypt.hash(plainTextPassword, 10);

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
      isNewUser = true;
      console.log(`[Submit] Auto-created new applicant user account for ${candidateEmail}`);
    } else {
      // User DOES exist -> Link application to their existing userId/applicantId without altering password
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
        // Keep name and mobile current if updated in form
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
      isNewUser = false;
    }

    // 4. Resolve Job Opening & Application Record
    let existingApplication = null;
    if (id && id !== 'submit' && id !== 'new') {
      existingApplication = await prisma.application.findUnique({
        where: { id },
        include: { job: true }
      });
    }

    let job = existingApplication?.job;
    if (!job) {
      const targetJobId = payload.jobId;
      if (targetJobId) {
        job = await prisma.job.findFirst({
          where: { OR: [{ id: targetJobId }, { vacancyNumber: targetJobId }] }
        });
      }
      if (!job) {
        job = await prisma.job.findFirst({ where: { status: 'PUBLISHED' } }) || await prisma.job.findFirst();
      }
    }

    if (!job) {
      return res.status(404).json({ error: 'No active job position found for this application.' });
    }

    // Determine if vacancy is currently open or interest-only
    const now = new Date();
    const isClosedVacancy = (job.deadline && new Date(job.deadline) < now) || (job.status && job.status !== 'PUBLISHED');
    // isInterest = true means vacancy is closed/deadline passed → save details but mark as interest registration

    const finalAppNumber = await generateApplicationNumber();
    const sectionData = buildSectionData(payload);
    const appStatus = APPLICATION_STATUS.SUBMITTED;
    const statusComment = isClosedVacancy
      ? 'Interest registered by candidate for closed/deadline-passed vacancy.'
      : 'Application submitted by candidate.';

    let submittedApp;

    if (existingApplication) {
      if (existingApplication.status !== APPLICATION_STATUS.DRAFT) {
        return res.status(400).json({ error: 'This application has already been submitted.' });
      }

      // Enforce mandatory resume document
      const resumeDoc = await prisma.applicationDocument.findFirst({
        where: { applicationId: existingApplication.id, documentType: 'resume' }
      });
      if (!resumeDoc && !payload.skipDocumentCheck) {
        return res.status(400).json({ error: 'Uploading your Resume / CV (PDF) is mandatory before submitting your application.' });
      }

      submittedApp = await prisma.$transaction(async (tx) => {
        const app = await tx.application.update({
          where: { id: existingApplication.id },
          data: {
            applicantId,
            ...sectionData,
            declaration: true,
            applicationNumber: finalAppNumber,
            status: appStatus,
            submittedAt: now
          }
        });

        await tx.applicationStatusHistory.create({
          data: {
            applicationId: app.id,
            previousStatus: APPLICATION_STATUS.DRAFT,
            newStatus: appStatus,
            changedByUserId: targetUser.id,
            comment: statusComment
          }
        });

        return app;
      });
    } else {
      submittedApp = await prisma.$transaction(async (tx) => {
        const app = await tx.application.create({
          data: {
            applicationNumber: finalAppNumber,
            applicantId,
            jobId: job.id,
            schoolId: job.schoolId || null,
            departmentId: job.departmentId || null,
            status: appStatus,
            submittedAt: now,
            declaration: true,
            ...sectionData
          }
        });

        await tx.applicationStatusHistory.create({
          data: {
            applicationId: app.id,
            previousStatus: APPLICATION_STATUS.DRAFT,
            newStatus: appStatus,
            changedByUserId: targetUser.id,
            comment: statusComment
          }
        });

        return app;
      });
    }

    await logAuditAction({
      action: 'APPLICATION_SUBMITTED',
      userId: targetUser.id,
      targetType: 'Application',
      targetId: submittedApp.id,
      details: { applicationNumber: finalAppNumber, jobId: job.id, isNewUser, isInterest: isClosedVacancy },
      req
    });

    console.log(`[Submit] Application ${finalAppNumber} successfully submitted for ${candidateEmail}${isClosedVacancy ? ' (interest registration — vacancy closed)' : ''}`);

    // Asynchronously send confirmation email with credentials if newly generated
    const loginUrl = process.env.LOGIN_URL || 'https://intranet.dypiu.ac.in/recruitment/login';

    sendSubmissionConfirmationEmail(submittedApp.id, {
      isNewUser,
      generatedPassword: isNewUser ? plainTextPassword : null,
      loginUrl,
      isInterest: isClosedVacancy
    }).catch(err => {
      console.error('[Submit] Confirmation email failed:', err.message);
    });

    return res.status(200).json({
      message: isClosedVacancy
        ? 'Details registered. We will notify you when the vacancy opens.'
        : 'Application submitted successfully.',
      applicationNumber: finalAppNumber,
      applicationId: submittedApp.id,
      status: appStatus,
      submittedAt: now,
      isNewUser,
      isInterest: isClosedVacancy
    });
  } catch (error) {
    console.error('Submit application error:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit application.' });
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
    vacancyId,
    schoolId,
    position,
    candidateName,
    applicationId,
    search,
    q,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const andConditions = [];

  if (req.user.role === 'APPLICANT') {
    andConditions.push({ applicantId: req.user.applicantId });
  } else if (isStaffRole(req.user.role)) {
    if (status && status !== 'ALL') {
      if (status === 'INTERVIEW' || status === 'INTERVIEW_SCHEDULED') {
        andConditions.push({ status: { in: ['INTERVIEW', 'INTERVIEW_SCHEDULED', 'Interview Scheduled'] } });
      } else if (status === 'SUBMITTED') {
        andConditions.push({ status: { in: ['SUBMITTED', 'Application Submitted'] } });
      } else if (status === 'UNDER_REVIEW') {
        andConditions.push({ status: { in: ['UNDER_REVIEW', 'Under Review'] } });
      } else if (status === 'SHORTLISTED') {
        andConditions.push({ status: { in: ['SHORTLISTED', 'Shortlisted'] } });
      } else if (status === 'SELECTED') {
        andConditions.push({ status: { in: ['SELECTED', 'Selected'] } });
      } else if (status === 'REJECTED') {
        andConditions.push({ status: { in: ['REJECTED', 'Not Selected', 'Application Closed'] } });
      } else {
        andConditions.push({ status });
      }
    } else {
      andConditions.push({ status: { not: APPLICATION_STATUS.DRAFT } });
    }

    if (type && type !== 'ALL') {
      andConditions.push({ job: { type } });
    }

    if (department) {
      andConditions.push({ job: { department: { contains: department, mode: 'insensitive' } } });
    }

    if (schoolId && schoolId !== 'ALL') {
      andConditions.push({
        OR: [
          { schoolId },
          { job: { schoolId } }
        ]
      });
    }

    const targetJobId = vacancyId || jobId;
    if (targetJobId && targetJobId !== 'ALL') {
      andConditions.push({ jobId: targetJobId });
    }

    if (position && position !== 'ALL') {
      andConditions.push({
        job: { position: { contains: position, mode: 'insensitive' } }
      });
    }

    if (candidateName && candidateName.trim()) {
      andConditions.push({
        applicant: { name: { contains: candidateName.trim(), mode: 'insensitive' } }
      });
    }

    if (applicationId && applicationId.trim()) {
      andConditions.push({
        applicationNumber: { contains: applicationId.trim(), mode: 'insensitive' }
      });
    }
  } else {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const freeSearch = (q || search || '').trim();
  if (freeSearch) {
    andConditions.push({
      OR: [
        { applicationNumber: { contains: freeSearch, mode: 'insensitive' } },
        { applicant: { name: { contains: freeSearch, mode: 'insensitive' } } },
        { job: { position: { contains: freeSearch, mode: 'insensitive' } } }
      ]
    });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

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
          job: true,
          documents: {
            where: { documentType: 'resume' },
            select: { id: true, documentType: true, originalName: true },
            take: 1
          }
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

    let isOwner = req.user.role === 'APPLICANT' && req.user.applicantId === application.applicantId;
    const isStaff = isStaffRole(req.user.role);

    if (!isOwner && application.status === APPLICATION_STATUS.DRAFT && req.user.role === 'APPLICANT') {
      isOwner = true;
    }

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
    let isOwner = req.user?.applicantId ? application.applicantId === req.user.applicantId : true;
    if (!isOwner && application.status === APPLICATION_STATUS.DRAFT) {
      isOwner = true;
    }
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
      include: { application: true }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    let isOwner = req.user?.applicantId ? doc.application.applicantId === req.user.applicantId : true;
    if (!isOwner && doc.application.status === APPLICATION_STATUS.DRAFT) {
      isOwner = true;
    }
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

    let isOwner = req.user?.applicantId ? doc.application.applicantId === req.user.applicantId : true;
    if (!isOwner && doc.application.status === APPLICATION_STATUS.DRAFT) {
      isOwner = true;
    }
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
  uploadDocument,
  downloadDocument,
  deleteDocument
};
