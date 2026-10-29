/**
 * Permanent removal of a candidate and everything held about them (right to erasure / data clean-up).
 *
 * Safeguards: super administrators only, the acting administrator must re-enter their password, type the
 * candidate's e-mail address and give a reason, staff accounts can never be removed this way, and the deletion
 * is written to the append-only audit log in the same database transaction (no record, no deletion).
 * The audit record keeps a minimal, masked reference to the candidate, not their personal data.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../services/prisma');
const storageService = require('../services/storageService');
const { logAuditAction } = require('../services/auditService');
const { cleanString, normalizeEmail } = require('../utils/validate');

// Wrong-password attempts per administrator, so this endpoint cannot be used to guess a password.
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function tooManyAttempts(userId) {
  const entry = attempts.get(userId);
  if (!entry || entry.resetAt < Date.now()) return false;
  return entry.count >= MAX_ATTEMPTS;
}
function noteFailure(userId) {
  const entry = attempts.get(userId);
  if (!entry || entry.resetAt < Date.now()) attempts.set(userId, { count: 1, resetAt: Date.now() + WINDOW_MS });
  else entry.count += 1;
}

const maskEmail = (email) => {
  const [name = '', domain = ''] = String(email).split('@');
  return `${name.slice(0, 1)}***@${domain}`;
};
const fingerprint = (email) => crypto.createHash('sha256').update(String(email).toLowerCase()).digest('hex').slice(0, 12);

/** Loads the candidate with everything that would be removed. Returns null when it is not a candidate account. */
async function loadCandidate(applicantId) {
  const applicant = await prisma.applicant.findUnique({
    where: { id: applicantId },
    include: {
      user: { select: { id: true, email: true, role: true, status: true } },
      applications: {
        select: {
          id: true, applicationNumber: true, status: true, job: { select: { position: true } },
          documents: { select: { id: true, filePath: true } }
        }
      },
      documentRequests: {
        select: { id: true, items: { select: { documents: { select: { id: true, filePath: true } } } } }
      }
    }
  });
  return applicant;
}

async function summarise(applicant) {
  const applicationIds = applicant.applications.map((a) => a.id);
  const requestIds = applicant.documentRequests.map((r) => r.id);
  const candidateDocs = applicant.documentRequests.flatMap((r) => r.items.flatMap((i) => i.documents));
  const email = applicant.user.email;

  const [interviews, upcoming, notifications, emails, interests] = await Promise.all([
    prisma.interview.count({ where: { OR: [{ candidateId: applicant.id }, { applicationId: { in: applicationIds } }] } }),
    prisma.interview.count({ where: { OR: [{ candidateId: applicant.id }, { applicationId: { in: applicationIds } }], status: 'SCHEDULED', scheduledAt: { gt: new Date() } } }),
    prisma.notification.count({ where: { userId: applicant.user.id } }),
    prisma.emailLog.count({ where: { OR: [{ toEmail: email }, { entityId: { in: [...applicationIds, ...requestIds] } }] } }),
    prisma.vacancyInterest.count({ where: { email: { equals: email, mode: 'insensitive' } } })
  ]);

  return {
    candidate: { name: applicant.name, email, mobile: applicant.mobile },
    counts: {
      applications: applicant.applications.length,
      applicationDocuments: applicant.applications.reduce((n, a) => n + a.documents.length, 0),
      documentRequests: requestIds.length,
      requestedDocuments: candidateDocs.length,
      interviews,
      notifications,
      emailRecords: emails,
      interestRegistrations: interests
    },
    applications: applicant.applications.map((a) => ({ number: a.applicationNumber, status: a.status, position: a.job?.position || null })),
    warnings: upcoming > 0 ? [`${upcoming} upcoming interview${upcoming === 1 ? ' is' : 's are'} scheduled for this candidate and will be removed.`] : []
  };
}

function blockerFor(applicant, req) {
  if (!applicant || !applicant.user) return { status: 404, error: 'Candidate not found.' };
  if (applicant.user.role !== 'APPLICANT') return { status: 400, error: 'Only candidate accounts can be deleted here. Staff accounts are managed under User Management.' };
  if (applicant.user.id === req.user.id) return { status: 400, error: 'You cannot delete your own account.' };
  return null;
}

/** GET /admin/candidates/:id/deletion-preview */
async function previewDeletion(req, res) {
  try {
    const applicant = await loadCandidate(req.params.id);
    const blocked = blockerFor(applicant, req);
    if (blocked) return res.status(blocked.status).json({ error: blocked.error });
    return res.json(await summarise(applicant));
  } catch (error) {
    console.error('Deletion preview error:', error);
    return res.status(500).json({ error: 'Could not prepare the deletion summary.' });
  }
}

/** Removes the stored files; reports how many could not be removed. */
async function purgeFiles(keys, directories) {
  let deleted = 0;
  let failed = 0;
  for (const key of keys) {
    try {
      await storageService.deleteFile(key);
      deleted += 1;
    } catch (error) {
      failed += 1;
      console.error('[Candidate delete] could not remove file', key, error.message);
    }
  }
  // Then the now-empty folders (restricted to the candidate's own folders under the upload root).
  for (const dir of directories) {
    try {
      await fs.promises.rm(storageService.getFileLocation(dir), { recursive: true, force: true });
    } catch (error) {
      console.error('[Candidate delete] could not remove folder', dir, error.message);
    }
  }
  return { deleted, failed };
}

/** DELETE /admin/candidates/:id  body: { confirmEmail, reason, password } */
async function deleteCandidate(req, res) {
  const reason = cleanString(req.body?.reason, 500);
  const confirmEmail = normalizeEmail(req.body?.confirmEmail);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const deny = (status, error, summary) => {
    logAuditAction({ action: 'CANDIDATE_DELETION_REFUSED', targetType: 'Applicant', targetId: req.params.id, outcome: 'DENIED', summary, req });
    return res.status(status).json({ error });
  };

  try {
    if (!reason || reason.length < 10) return res.status(400).json({ error: 'Please give a reason of at least 10 characters. It is kept in the audit log.' });
    if (!password) return res.status(400).json({ error: 'Enter your password to confirm.' });
    if (tooManyAttempts(req.user.id)) return deny(429, 'Too many wrong passwords. Try again in a few minutes.', 'Too many wrong passwords on a candidate deletion');

    const applicant = await loadCandidate(req.params.id);
    const blocked = blockerFor(applicant, req);
    if (blocked) return deny(blocked.status, blocked.error, `Deletion refused: ${blocked.error}`);

    if (confirmEmail !== applicant.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'The e-mail address you typed does not match this candidate.' });
    }

    const admin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { password: true } });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      noteFailure(req.user.id);
      return deny(403, 'Your password is not correct.', 'Wrong password entered to confirm a candidate deletion');
    }

    const summary = await summarise(applicant);
    const email = applicant.user.email;
    const applicationIds = applicant.applications.map((a) => a.id);
    const requestIds = applicant.documentRequests.map((r) => r.id);

    // Files to remove once the database rows are gone.
    const keys = [
      ...applicant.applications.flatMap((a) => a.documents.map((d) => d.filePath)),
      ...applicant.documentRequests.flatMap((r) => r.items.flatMap((i) => i.documents.map((d) => d.filePath)))
    ];
    const directories = [
      `candidates/${applicant.id}`,
      ...applicant.applications.flatMap((a) => a.documents.map((d) => path.posix.dirname(d.filePath)).filter((dir) => dir.endsWith(`/applications/${a.id}`)))
    ];

    await prisma.$transaction(async (tx) => {
      // The record is written first and inside the same transaction: if it cannot be saved, nothing is deleted.
      await logAuditAction({
        action: 'CANDIDATE_DATA_DELETED',
        targetType: 'Applicant',
        targetId: applicant.id,
        summary: `Permanently deleted candidate ${maskEmail(email)} and all their data (${applicant.applications.map((a) => a.applicationNumber).join(', ') || 'no applications'})`,
        details: {
          reason,
          candidate: { reference: fingerprint(email), email: maskEmail(email), name: applicant.name.split(' ')[0] },
          applications: summary.applications,
          removed: summary.counts,
          filesToRemove: keys.length
        },
        req,
        tx,
        strict: true
      });

      await tx.emailLog.deleteMany({ where: { OR: [{ toEmail: email }, { entityId: { in: [...applicationIds, ...requestIds] } }] } });
      await tx.vacancyInterest.deleteMany({ where: { email: { equals: email, mode: 'insensitive' } } });
      // Deleting the account cascades to the candidate, applications, documents, requests, interviews and notifications.
      await tx.user.delete({ where: { id: applicant.user.id } });
    });

    const files = await purgeFiles(keys, directories);
    await logAuditAction({
      action: 'CANDIDATE_FILES_PURGED',
      targetType: 'Applicant',
      targetId: applicant.id,
      outcome: files.failed ? 'FAILURE' : 'SUCCESS',
      severity: files.failed ? 'WARNING' : 'INFO',
      summary: files.failed ? `${files.failed} candidate file(s) could not be removed from storage and need manual clean-up` : `Removed ${files.deleted} candidate file(s) from storage`,
      details: files,
      req
    });

    return res.json({
      message: 'The candidate and all their data have been permanently deleted.',
      removed: summary.counts,
      files
    });
  } catch (error) {
    console.error('Delete candidate error:', error);
    return res.status(500).json({ error: 'The candidate could not be deleted. Nothing was removed.' });
  }
}

module.exports = { previewDeletion, deleteCandidate, _attempts: attempts };
