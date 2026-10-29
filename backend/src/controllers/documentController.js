const path = require('path');
const fs = require('fs');
const prisma = require('../services/prisma');
const storageService = require('../services/storageService');
const { logAuditAction } = require('../services/auditService');
const { isAdminRole } = require('../utils/access');
const { STATUS_LABELS } = require('../constants/statuses');
const { cleanString, parseDate, safeFilename } = require('../utils/validate');

const MAX_DOC_ITEMS = 30;
const MAX_VERSIONS_PER_ITEM = 5;

// Documents can be requested once an application has been shortlisted or beyond.
const REQUESTABLE_STATUSES = ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'WAITLISTED', 'SELECTED'];

/** Internal storage paths never leave the server. */
function withoutFilePaths(request) {
  if (!request || !Array.isArray(request.items)) return request;
  return {
    ...request,
    items: request.items.map((item) => ({
      ...item,
      documents: (item.documents || []).map(({ filePath, ...doc }) => doc)
    }))
  };
}

/** Resolve the requesting applicant's id (null for non-applicants). */
async function applicantIdOf(req) {
  if (req.user?.role !== 'APPLICANT') return null;
  if (req.user?.applicantId) return req.user.applicantId;
  const applicant = await prisma.applicant.findFirst({ where: { userId: req.user.id } });
  return applicant ? applicant.id : null;
}

async function canAccessRequest(req, request) {
  if (isAdminRole(req.user.role)) return true;
  if (req.user.role !== 'APPLICANT') return false;
  const appCandidateId = await applicantIdOf(req);
  return request.candidateId === appCandidateId;
}

const {
  sendDocumentRequestEmail,
  sendDocumentVerificationUpdateEmail
} = require('../services/emailService');

/**
 * Standard Document Catalog suggestions for HR Checklist.
 */
const DEFAULT_DOCUMENT_CATALOG = [
  { name: 'Original Resume / CV', type: 'RESUME', isMandatory: true },
  { name: '10th Marksheet & Certificate', type: '10TH_MARKSHEET', isMandatory: true },
  { name: '12th Marksheet & Certificate', type: '12TH_MARKSHEET', isMandatory: true },
  { name: 'Graduation Degree & Marksheet', type: 'GRADUATION', isMandatory: true },
  { name: 'Post Graduation Degree & Marksheet', type: 'POST_GRADUATION', isMandatory: false },
  { name: 'PhD Degree / Thesis Submission Proof', type: 'PHD_CERTIFICATE', isMandatory: false },
  { name: 'Experience & Appointment Letters', type: 'EXPERIENCE_LETTER', isMandatory: false },
  { name: 'Relieving Letter from Previous Employer', type: 'RELIEVING_LETTER', isMandatory: false },
  { name: 'Last 3 Months Salary Slips', type: 'SALARY_SLIP', isMandatory: false },
  { name: 'PAN Card Copy', type: 'PAN_CARD', isMandatory: true },
  { name: 'Aadhar Card Copy', type: 'AADHAR_CARD', isMandatory: true },
  { name: 'Passport Copy', type: 'PASSPORT', isMandatory: false },
  { name: 'Passport Size Photographs', type: 'PHOTO', isMandatory: true },
  { name: 'Bank Passbook / Cancelled Cheque', type: 'BANK_PROOF', isMandatory: false },
  { name: 'Address Proof (Electricity / Voter / Rent)', type: 'ADDRESS_PROOF', isMandatory: false },
  { name: 'Other Merit & Publication Certificates', type: 'OTHER_CERTIFICATE', isMandatory: false }
];

/**
 * Helper to resolve candidate contact details from applicant / application.
 */
function resolveCandidateContact(applicant, application) {
  let email = applicant?.user?.email || '';
  let name = applicant?.name || 'Applicant';

  if (application) {
    try {
      const contact = typeof application.contactDetails === 'string'
        ? JSON.parse(application.contactDetails)
        : application.contactDetails || {};
      const personal = typeof application.personalInfo === 'string'
        ? JSON.parse(application.personalInfo)
        : application.personalInfo || {};

      if (!email) email = contact.email || personal.email || '';
      if (personal.fullName) name = personal.fullName;
      else if (personal.firstName || personal.lastName) {
        name = `${personal.firstName || ''} ${personal.lastName || ''}`.trim();
      } else if (contact.name) name = contact.name;
    } catch (e) {}
  }

  return { email: email.trim().toLowerCase(), name };
}

/**
 * 1. Create Document Upload Request (Admin / HR).
 */
async function createDocumentRequest(req, res) {
  const {
    candidateId,
    applicationId,
    documents = [],
    deadline,
    priority = 'NORMAL',
    message
  } = req.body;

  const deadlineDate = parseDate(deadline);
  if (!candidateId || !Array.isArray(documents) || documents.length === 0 || !deadlineDate) {
    return res.status(400).json({
      error: 'Candidate, a valid deadline date, and at least one requested document are required.'
    });
  }
  if (documents.length > MAX_DOC_ITEMS) {
    return res.status(400).json({ error: `At most ${MAX_DOC_ITEMS} documents can be requested at once.` });
  }
  const seenNames = new Set();
  const cleanDocs = documents
    .map((doc) => ({
      name: cleanString(typeof doc === 'string' ? doc : doc?.name || doc?.documentName, 200),
      type: cleanString(typeof doc === 'string' ? 'CUSTOM' : doc?.type || doc?.documentType || 'CUSTOM', 50),
      isMandatory: typeof doc === 'object' && doc?.isMandatory !== undefined ? Boolean(doc.isMandatory) : true
    }))
    .filter((doc) => {
      const key = doc.name && doc.name.toLowerCase();
      if (!key || seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });
  if (cleanDocs.length === 0) {
    return res.status(400).json({ error: 'Each requested document needs a name.' });
  }

  try {
    const applicant = await prisma.applicant.findUnique({
      where: { id: candidateId },
      include: { user: { select: { id: true, email: true } } }
    });

    if (!applicant) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    let application = null;
    if (applicationId) {
      application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { job: true }
      });
      if (!application || application.applicantId !== candidateId) {
        return res.status(400).json({ error: 'The application does not belong to this candidate.' });
      }
    } else {
      application = await prisma.application.findFirst({
        where: { applicantId: candidateId, status: { in: REQUESTABLE_STATUSES } },
        include: { job: true },
        orderBy: { createdAt: 'desc' }
      });
    }
    if (!application) {
      return res.status(400).json({ error: 'This candidate has no shortlisted, interview-stage, waitlisted or selected application to request documents for.' });
    }
    if (!REQUESTABLE_STATUSES.includes(application.status)) {
      return res.status(400).json({
        error: `Documents can be requested once an application is shortlisted or further along. This one is "${STATUS_LABELS[application.status] || application.status}".`
      });
    }

    // Create DocumentRequest & Items in transaction
    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.documentRequest.create({
        data: {
          candidateId,
          applicationId: application ? application.id : null,
          requestedById: req.user.id,
          deadline: deadlineDate,
          priority: priority === 'URGENT' ? 'URGENT' : 'NORMAL',
          message: cleanString(message, 2000) || null,
          status: 'PENDING'
        }
      });

      await tx.documentRequestItem.createMany({
        data: cleanDocs.map((doc) => ({
          documentRequestId: created.id,
          documentName: doc.name,
          documentType: doc.type,
          isMandatory: doc.isMandatory,
          status: 'PENDING'
        }))
      });

      return created;
    });

    // Notify candidate via Email
    const contact = resolveCandidateContact(applicant, application);
    const loginUrl = process.env.LOGIN_URL || 'https://intranet.dypiu.ac.in/recruitment/login';

    let emailOutcome = { status: 'SKIPPED', error: 'The candidate has no e-mail address on file.' };
    if (contact.email) {
      emailOutcome = await sendDocumentRequestEmail({
        to: contact.email,
        candidateName: contact.name,
        applicationNumber: application?.applicationNumber,
        jobTitle: application?.job?.position || 'Faculty Position',
        requiredDocuments: cleanDocs,
        deadline: deadlineDate,
        priority,
        message,
        loginUrl,
        meta: { kind: 'DOCUMENT_REQUEST', entityType: 'DocumentRequest', entityId: request.id }
      }).then((result) => {
        if (result && result.success) return { status: 'SENT' };
        if (result && result.skipped) return { status: 'SKIPPED', error: result.error || 'No e-mail provider is configured on this server.' };
        return { status: 'FAILED', error: (result && result.error) || 'The e-mail could not be sent.' };
      }).catch((err) => {
        console.error('Document request email failed:', err.message);
        return { status: 'FAILED', error: err.message };
      });
    }

    // In-app Notification for candidate
    if (applicant.userId) {
      await prisma.notification.create({
        data: {
          userId: applicant.userId,
          content: `Document Upload Required: HR has requested original documents for your application. Please upload them before ${deadlineDate.toLocaleDateString('en-IN')}.`
        }
      }).catch(() => {});
    }

    await logAuditAction({
      action: 'DOCUMENT_REQUEST_SENT',
      userId: req.user.id,
      targetType: 'DocumentRequest',
      targetId: request.id,
      details: { candidateId, itemCount: cleanDocs.length, priority, deadline: deadlineDate },
      req
    });

    return res.status(201).json({
      message: emailOutcome.status === 'SENT'
        ? 'Document request created and e-mailed to the candidate.'
        : 'Document request created. It is visible in the candidate\'s portal, but the e-mail was not sent.',
      emailStatus: emailOutcome.status,
      emailError: emailOutcome.error || null,
      documentRequest: request
    });
  } catch (error) {
    console.error('Create document request error:', error);
    return res.status(500).json({ error: 'Failed to create document upload request.' });
  }
}

/**
 * 2. Get All Document Requests (Admin / HR Dashboard).
 */
async function getAllDocumentRequests(req, res) {
  try {
    const { status, priority, search } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }
    if (search) {
      where.OR = [
        { candidate: { name: { contains: search, mode: 'insensitive' } } },
        { candidate: { user: { email: { contains: search, mode: 'insensitive' } } } },
        { application: { applicationNumber: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const requests = await prisma.documentRequest.findMany({
      where,
      include: {
        candidate: {
          include: {
            user: { select: { id: true, email: true } }
          }
        },
        application: {
          include: { job: true }
        },
        requestedBy: {
          select: { id: true, email: true }
        },
        items: {
          include: {
            documents: {
              orderBy: { uploadDate: 'desc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(requests.map(withoutFilePaths));
  } catch (error) {
    console.error('Fetch document requests error:', error);
    return res.status(500).json({ error: 'Failed to fetch document requests.' });
  }
}

/**
 * 3. Get Document Requests for Logged-in Candidate (Candidate Portal "My Documents").
 */
async function getMyDocumentRequests(req, res) {
  try {
    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase().trim();

    const applicants = await prisma.applicant.findMany({
      where: {
        OR: [
          { userId },
          { user: { email: { equals: userEmail, mode: 'insensitive' } } }
        ]
      },
      select: { id: true }
    });

    const candidateIds = applicants.map(a => a.id);
    if (req.user.applicantId && !candidateIds.includes(req.user.applicantId)) {
      candidateIds.push(req.user.applicantId);
    }

    if (candidateIds.length === 0) {
      return res.json([]);
    }

    const requests = await prisma.documentRequest.findMany({
      where: {
        OR: [
          { candidateId: { in: candidateIds } },
          { candidate: { userId } },
          { candidate: { user: { email: { equals: userEmail, mode: 'insensitive' } } } }
        ]
      },
      include: {
        application: {
          include: { job: true }
        },
        items: {
          include: {
            documents: {
              orderBy: { uploadDate: 'desc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Only return document requests that actually have items requested by HR
    const activeRequests = requests.filter(r => Array.isArray(r.items) && r.items.length > 0);
    return res.json(activeRequests.map(withoutFilePaths));
  } catch (error) {
    console.error('Get my document requests error:', error);
    return res.status(500).json({ error: 'Failed to retrieve requested documents.' });
  }
}

/**
 * 4. Get Document Request by ID.
 */
async function getDocumentRequestById(req, res) {
  const { id } = req.params;

  try {
    const request = await prisma.documentRequest.findUnique({
      where: { id },
      include: {
        candidate: {
          include: { user: { select: { id: true, email: true } } }
        },
        application: {
          include: { job: true }
        },
        items: {
          include: {
            documents: {
              include: {
                verifiedBy: { select: { id: true, email: true } }
              },
              orderBy: { uploadDate: 'desc' }
            }
          }
        }
      }
    });

    const hasAccess = await canAccessRequest(req, request);
    if (!request || !hasAccess) {
      return res.status(404).json({ error: 'Document request not found.' });
    }

    return res.json(withoutFilePaths(request));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load document request.' });
  }
}

/**
 * 5. Candidate Uploads an Individual Document Item.
 */
async function uploadCandidateDocumentItem(req, res) {
  const { requestId, itemId } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please choose a PDF, JPG, JPEG, or PNG file (max 5MB).' });
  }

  try {
    const request = await prisma.documentRequest.findUnique({
      where: { id: requestId }
    });

    const userAppId = await applicantIdOf(req);
    if (!request || request.candidateId !== userAppId) {
      return res.status(404).json({ error: 'Document request not found.' });
    }
    if (['SUBMITTED', 'VERIFIED'].includes(request.status)) {
      return res.status(409).json({ error: 'This request has already been submitted. Contact HR to reopen it.' });
    }

    const item = await prisma.documentRequestItem.findFirst({
      where: { id: itemId, documentRequestId: requestId },
      include: { _count: { select: { documents: true } } }
    });

    if (!item) {
      return res.status(404).json({ error: 'Document item not found in this request.' });
    }
    if (item.status === 'VERIFIED') {
      return res.status(409).json({ error: 'This document has already been verified.' });
    }
    // Once a file is uploaded it waits for HR; a new upload is only possible after HR rejects it.
    if (item.status === 'UPLOADED') {
      return res.status(409).json({ error: 'This document is already uploaded and waiting for HR review.' });
    }
    if (item._count.documents >= MAX_VERSIONS_PER_ITEM) {
      return res.status(400).json({ error: 'Maximum number of uploads reached for this document.' });
    }

    // Save file to storage
    const saved = await storageService.saveCandidateDocumentFile(req.file, request.candidateId);

    // Create CandidateDocument record
    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.candidateDocument.create({
        data: {
          documentRequestItemId: itemId,
          candidateId: request.candidateId,
          filePath: saved.fileKey,
          fileName: safeFilename(req.file.originalname),
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          verificationStatus: 'UNDER_REVIEW'
        }
      });

      // Update item status to UPLOADED
      await tx.documentRequestItem.update({
        where: { id: itemId },
        data: { status: 'UPLOADED' }
      });

      // Update overall request status
      await tx.documentRequest.update({
        where: { id: requestId },
        data: { status: 'PARTIALLY_UPLOADED' }
      });

      return doc;
    });

    return res.status(201).json({
      message: 'Document uploaded successfully.',
      document
    });
  } catch (error) {
    console.error('Candidate document upload error:', error);
    return res.status(500).json({ error: 'Failed to upload document.' });
  }
}

/**
 * 6. Candidate Submits All Uploaded Documents.
 */
async function submitAllDocuments(req, res) {
  const { requestId } = req.params;

  try {
    const request = await prisma.documentRequest.findUnique({
      where: { id: requestId },
      include: {
        candidate: { include: { user: { select: { id: true, email: true } } } },
        items: {
          include: { documents: true }
        }
      }
    });

    const userAppId = await applicantIdOf(req);
    if (!request || request.candidateId !== userAppId) {
      return res.status(404).json({ error: 'Document request not found.' });
    }
    if (['SUBMITTED', 'VERIFIED'].includes(request.status)) {
      return res.status(409).json({ error: 'These documents have already been submitted.' });
    }

    // Mandatory documents need a file that HR has not rejected (a rejected one has to be replaced first).
    const missingMandatory = request.items.filter(item => item.isMandatory && (item.documents.length === 0 || item.status === 'REJECTED'));
    if (missingMandatory.length > 0) {
      const missingNames = missingMandatory.map(m => m.documentName).join(', ');
      return res.status(400).json({
        error: `Please upload all mandatory documents before submitting: ${missingNames}`
      });
    }

    const updated = await prisma.documentRequest.update({
      where: { id: requestId },
      data: { status: 'SUBMITTED' }
    });

    await logAuditAction({
      action: 'CANDIDATE_DOCUMENTS_SUBMITTED',
      userId: req.user.id,
      targetType: 'DocumentRequest',
      targetId: requestId,
      details: { candidateName: request.candidate?.name },
      req
    });

    return res.json({
      message: 'All documents submitted successfully for HR verification.',
      documentRequest: updated
    });
  } catch (error) {
    console.error('Submit all documents error:', error);
    return res.status(500).json({ error: 'Failed to finalize document submission.' });
  }
}

/**
 * 7. Admin Verifies or Rejects an Individual Document Item.
 */
async function verifyCandidateDocumentItem(req, res) {
  const { requestId, itemId } = req.params;
  const { status, rejectionReason } = req.body; // status: 'VERIFIED' | 'REJECTED'

  if (!['VERIFIED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be either VERIFIED or REJECTED.' });
  }

  if (status === 'REJECTED' && !cleanString(rejectionReason, 1000)) {
    return res.status(400).json({ error: 'Rejection reason is mandatory when rejecting a document.' });
  }

  try {
    const item = await prisma.documentRequestItem.findFirst({
      where: { id: itemId, documentRequestId: requestId },
      include: {
        documents: { orderBy: { uploadDate: 'desc' }, take: 1 },
        documentRequest: {
          include: {
            candidate: { include: { user: { select: { id: true, email: true } } } },
            application: true
          }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Document item not found.' });
    }

    const latestDoc = item.documents[0];
    if (!latestDoc) {
      return res.status(400).json({ error: 'The candidate has not uploaded a file for this item yet.' });
    }

    await prisma.$transaction(async (tx) => {
      if (latestDoc) {
        await tx.candidateDocument.update({
          where: { id: latestDoc.id },
          data: {
            verificationStatus: status,
            verifiedById: req.user.id,
            verifiedAt: new Date(),
            rejectionReason: status === 'REJECTED' ? cleanString(rejectionReason, 1000) : null
          }
        });
      }

      await tx.documentRequestItem.update({
        where: { id: itemId },
        data: { status }
      });

      // Recalculate parent DocumentRequest status
      const allItems = await tx.documentRequestItem.findMany({
        where: { documentRequestId: requestId }
      });

      const allVerified = allItems.every(i => i.status === 'VERIFIED');
      const anyRejected = allItems.some(i => i.status === 'REJECTED');

      let parentStatus = 'UNDER_REVIEW';
      if (allVerified) parentStatus = 'VERIFIED';
      else if (anyRejected) parentStatus = 'REJECTED';

      await tx.documentRequest.update({
        where: { id: requestId },
        data: { status: parentStatus }
      });
    });

    // Send notification/email to candidate if rejected
    const contact = resolveCandidateContact(item.documentRequest.candidate, item.documentRequest.application);
    if (status === 'REJECTED' && contact.email) {
      await sendDocumentVerificationUpdateEmail({
        to: contact.email,
        candidateName: contact.name,
        applicationNumber: item.documentRequest.application?.applicationNumber,
        status: 'REJECTED',
        remarks: rejectionReason,
        rejectedItems: [{ name: item.documentName, reason: rejectionReason }]
      }).catch(() => {});
    }

    return res.json({
      message: `Document has been marked as ${status}.`
    });
  } catch (error) {
    console.error('Verify document item error:', error);
    return res.status(500).json({ error: 'Failed to update document verification status.' });
  }
}

/**
 * 8. Admin Approves All Uploaded Documents for a Request.
 */
async function approveAllDocuments(req, res) {
  const { requestId } = req.params;

  try {
    const request = await prisma.documentRequest.findUnique({
      where: { id: requestId },
      include: {
        candidate: { include: { user: { select: { id: true, email: true } } } },
        application: true,
        items: {
          include: { documents: { orderBy: { uploadDate: 'desc' } } }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Document request not found.' });
    }

    const missing = request.items.filter((item) => item.isMandatory && item.documents.length === 0);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Mandatory documents have not been uploaded: ${missing.map((m) => m.documentName).join(', ')}`
      });
    }

    await prisma.$transaction(async (tx) => {
      // Mark all items as VERIFIED
      for (const item of request.items) {
        if (item.documents.length === 0) continue; // optional item with no upload
        await tx.documentRequestItem.update({
          where: { id: item.id },
          data: { status: 'VERIFIED' }
        });

        for (const doc of item.documents) {
          await tx.candidateDocument.update({
            where: { id: doc.id },
            data: {
              verificationStatus: 'VERIFIED',
              verifiedById: req.user.id,
              verifiedAt: new Date(),
              rejectionReason: null
            }
          });
        }
      }

      await tx.documentRequest.update({
        where: { id: requestId },
        data: { status: 'VERIFIED' }
      });
    });

    // Send approval confirmation email to candidate
    const contact = resolveCandidateContact(request.candidate, request.application);
    if (contact.email) {
      await sendDocumentVerificationUpdateEmail({
        to: contact.email,
        candidateName: contact.name,
        applicationNumber: request.application?.applicationNumber,
        status: 'VERIFIED',
        remarks: 'All submitted original documents have been successfully verified.'
      }).catch(() => {});
    }

    return res.json({
      message: 'All candidate documents have been verified and approved.'
    });
  } catch (error) {
    console.error('Approve all documents error:', error);
    return res.status(500).json({ error: 'Failed to approve all documents.' });
  }
}

/**
 * 9. Download or View an Individual Candidate Document.
 */
async function downloadDocumentFile(req, res) {
  const { docId } = req.params;
  const { inline } = req.query;

  try {
    const doc = await prisma.candidateDocument.findUnique({
      where: { id: docId }
    });

    // Applicants may only open their own files; HR roles may open any.
    const userAppId = await applicantIdOf(req);
    const allowed = doc && (isAdminRole(req.user.role) || (req.user.role === 'APPLICANT' && doc.candidateId === userAppId));
    if (!allowed) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (!storageService.fileExists(doc.filePath)) {
      return res.status(404).json({ error: 'File not found on storage server.' });
    }
    const filePath = storageService.getFileLocation(doc.filePath);
    const fileName = safeFilename(doc.fileName);

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");

    if (inline === 'true' && ['application/pdf', 'image/jpeg', 'image/png'].includes(doc.fileType)) {
      res.setHeader('Content-Type', doc.fileType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      return fs.createReadStream(filePath).pipe(res);
    }

    return res.download(filePath, fileName);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to download file.' });
  }
}

/**
 * 10. Download All Uploaded Candidate Documents as a ZIP archive.
 */
async function downloadAllDocumentsZip(req, res) {
  const { requestId } = req.params;

  try {
    const request = await prisma.documentRequest.findUnique({
      where: { id: requestId },
      include: {
        candidate: true,
        application: { select: { applicationNumber: true } },
        items: {
          orderBy: { createdAt: 'asc' },
          include: { documents: { orderBy: { uploadDate: 'desc' } } }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Document request not found.' });
    }

    // Latest upload of every item that has one, and that is still on disk.
    const entries = [];
    const missing = [];
    request.items.forEach((item) => {
      const latest = item.documents[0];
      if (!latest) return;
      if (!storageService.fileExists(latest.filePath)) {
        missing.push(item.documentName);
        return;
      }
      entries.push({ item, latest });
    });

    if (entries.length === 0) {
      return res.status(404).json({
        error: missing.length
          ? 'The uploaded files could not be found on the server. Ask the candidate to upload them again.'
          : 'The candidate has not uploaded any documents yet.'
      });
    }

    // archiver 8 is an ES module with named exports (it is no longer a callable function).
    const { ZipArchive } = await import('archiver');

    const candidateName = (request.candidate?.name || 'Candidate').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Candidate';
    const reference = (request.application?.applicationNumber || '').replace(/[^a-zA-Z0-9-]/g, '');
    const zipFilename = `Documents_${candidateName}${reference ? `_${reference}` : ''}_${new Date().toISOString().slice(0, 10)}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on('warning', (err) => console.warn('Archive warning:', err.message));
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to generate ZIP archive.' });
      else res.destroy(err);
    });
    archive.pipe(res);

    // 01_Name.pdf, 02_Name.pdf ... so two items can never overwrite each other.
    entries.forEach(({ item, latest }, index) => {
      const ext = path.extname(latest.fileName) || '.pdf';
      const cleanName = item.documentName.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'Document';
      archive.file(storageService.getFileLocation(latest.filePath), {
        name: `${String(index + 1).padStart(2, '0')}_${cleanName}${ext}`
      });
    });

    if (missing.length) {
      archive.append(
        `These documents were uploaded but could not be found on the server:\r\n- ${missing.join('\r\n- ')}\r\n`,
        { name: 'MISSING_FILES.txt' }
      );
    }

    await logAuditAction({
      action: 'DOCUMENT_ZIP_DOWNLOADED',
      userId: req.user.id,
      targetType: 'DocumentRequest',
      targetId: request.id,
      details: { files: entries.length, missing: missing.length },
      req
    });

    await archive.finalize();
  } catch (error) {
    console.error('Download ZIP error:', error);
    if (!res.headersSent) return res.status(500).json({ error: 'Failed to generate ZIP archive.' });
    return res.destroy(error);
  }
}

/**
 * 11. Get Standard Document Catalog checklist.
 */
async function getDocumentCatalog(req, res) {
  return res.json(DEFAULT_DOCUMENT_CATALOG);
}

module.exports = {
  createDocumentRequest,
  getAllDocumentRequests,
  getMyDocumentRequests,
  getDocumentRequestById,
  uploadCandidateDocumentItem,
  submitAllDocuments,
  verifyCandidateDocumentItem,
  approveAllDocuments,
  downloadDocumentFile,
  downloadAllDocumentsZip,
  getDocumentCatalog
};
