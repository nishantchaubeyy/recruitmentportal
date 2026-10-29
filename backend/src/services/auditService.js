/**
 * Audit logging.
 *
 * Every security-relevant action is appended to the AuditLog table with who did it (id, e-mail, role), from
 * where (IP, browser, request id, method and path), what it touched, the outcome and a before/after snapshot.
 *
 * Integrity: each row carries an HMAC over its own content and the previous row's hash, so a changed,
 * removed or inserted row breaks the chain and is reported by verifyChain(). The database additionally
 * refuses UPDATE / DELETE / TRUNCATE on the table (see the audit_log_hardening migration).
 *
 * Auditing never breaks the request it describes, except where the caller asks for `strict: true`
 * (irreversible actions such as deleting a candidate must not happen without a record).
 */
const crypto = require('crypto');
const prisma = require('./prisma');
const config = require('../config');

const GENESIS = 'GENESIS';
const LOCK_SQL = 'SELECT pg_advisory_xact_lock(727001)'; // serialises writers so the chain has a single order
const MAX_JSON = 8000;

/**
 * Secret used to sign the chain. Set AUDIT_SECRET (and never change it) so rotating the JWT secret does not make
 * old records unverifiable; without it the JWT secret is used.
 */
const signingKey = () => process.env.AUDIT_SECRET || config.JWT_SECRET;
/** Short fingerprint of the key (not the key): lets verification tell "wrong key" apart from "record edited". */
const keyIdOf = () => crypto.createHash('sha256').update(`audit-key:${signingKey()}`).digest('hex').slice(0, 12);

// Fields covered by the hash, in a fixed order.
const HASHED_FIELDS = [
  'id', 'createdAt', 'keyId', 'userId', 'actorEmail', 'actorRole', 'action', 'category', 'severity', 'outcome',
  'entity', 'entityId', 'summary', 'oldValue', 'newValue', 'ipAddress', 'userAgent', 'requestId', 'method', 'path'
];

function computeHash(row, prevHash) {
  const parts = HASHED_FIELDS.map((field) => {
    const value = row[field];
    if (value instanceof Date) return value.toISOString();
    return value === null || value === undefined ? '' : String(value);
  });
  return crypto.createHmac('sha256', signingKey()).update([prevHash || GENESIS, ...parts].join('\u001f')).digest('hex');
}

// ---- what each action means -------------------------------------------------------------------------------------
const META = {
  // AUTH
  USER_LOGIN: ['AUTH', 'INFO', 'Signed in'],
  USER_LOGIN_FAILED: ['AUTH', 'WARNING', 'Failed sign-in attempt'],
  USER_LOGOUT: ['AUTH', 'INFO', 'Signed out'],
  USER_REGISTERED: ['AUTH', 'INFO', 'New applicant account registered'],
  OTP_SENT: ['AUTH', 'INFO', 'E-mail verification code sent'],
  OTP_VERIFIED: ['AUTH', 'INFO', 'E-mail address verified'],
  OTP_FAILED: ['AUTH', 'WARNING', 'Wrong or expired verification code'],
  PASSWORD_RESET_REQUESTED: ['AUTH', 'WARNING', 'Password reset requested'],
  PASSWORD_RESET_COMPLETED: ['AUTH', 'WARNING', 'Password reset completed'],
  USER_PASSWORD_CHANGED: ['AUTH', 'WARNING', 'Password changed'],
  // SECURITY
  ACCESS_DENIED: ['SECURITY', 'WARNING', 'Access denied'],
  AUDIT_LOG_VIEWED: ['SECURITY', 'INFO', 'Audit log viewed'],
  AUDIT_LOG_EXPORTED: ['SECURITY', 'WARNING', 'Audit log exported'],
  AUDIT_INTEGRITY_CHECKED: ['SECURITY', 'INFO', 'Audit log integrity checked'],
  // USER MANAGEMENT
  USER_CREATED_BY_ADMIN: ['USER', 'WARNING', 'User account created'],
  USER_UPDATED: ['USER', 'INFO', 'User account updated'],
  USER_STATUS_UPDATED: ['USER', 'WARNING', 'User account enabled / disabled'],
  USER_ROLE_UPDATED: ['USER', 'CRITICAL', 'User role changed'],
  USER_PASSWORD_RESET_BY_ADMIN: ['USER', 'CRITICAL', 'Password reset by an administrator'],
  // APPLICATIONS
  APPLICATION_SUBMITTED: ['APPLICATION', 'INFO', 'Application submitted'],
  APPLICATION_WITHDRAWN: ['APPLICATION', 'INFO', 'Application withdrawn'],
  APPLICATION_STATUS_UPDATED: ['APPLICATION', 'INFO', 'Application status changed'],
  APPLICATION_VIEWED: ['APPLICATION', 'INFO', 'Application opened by staff'],
  APPLICATION_DOCUMENT_ACCESSED: ['DOCUMENT', 'INFO', 'Application document opened'],
  // DOCUMENTS
  DOCUMENT_REQUEST_SENT: ['DOCUMENT', 'INFO', 'Document request created'],
  DOCUMENT_UPLOADED: ['DOCUMENT', 'INFO', 'Candidate uploaded a requested document'],
  CANDIDATE_DOCUMENTS_SUBMITTED: ['DOCUMENT', 'INFO', 'Candidate submitted requested documents'],
  DOCUMENT_VERIFIED: ['DOCUMENT', 'INFO', 'Document verified'],
  DOCUMENT_REJECTED: ['DOCUMENT', 'INFO', 'Document rejected'],
  DOCUMENTS_APPROVED_ALL: ['DOCUMENT', 'INFO', 'All uploaded documents approved'],
  DOCUMENT_FILE_ACCESSED: ['DOCUMENT', 'INFO', 'Candidate document opened'],
  DOCUMENT_ZIP_DOWNLOADED: ['DOCUMENT', 'WARNING', 'Candidate documents downloaded as ZIP'],
  // INTERVIEWS
  INTERVIEW_SCHEDULED: ['INTERVIEW', 'INFO', 'Interview scheduled'],
  ZOOM_INTERVIEW_SCHEDULED: ['INTERVIEW', 'INFO', 'Interview scheduled with meeting link'],
  INTERVIEW_RESCHEDULED: ['INTERVIEW', 'INFO', 'Interview rescheduled'],
  INTERVIEW_CANCELLED: ['INTERVIEW', 'WARNING', 'Interview cancelled'],
  EVALUATION_SUBMITTED: ['INTERVIEW', 'INFO', 'Evaluation submitted'],
  EVALUATION_UPDATED: ['INTERVIEW', 'INFO', 'Evaluation updated'],
  // VACANCIES
  VACANCY_CREATED: ['VACANCY', 'INFO', 'Vacancy created'],
  VACANCY_UPDATED: ['VACANCY', 'INFO', 'Vacancy updated'],
  VACANCY_STATUS_CHANGED: ['VACANCY', 'INFO', 'Vacancy status changed'],
  // DATA PROTECTION
  CANDIDATE_DATA_DELETED: ['DATA', 'CRITICAL', 'Candidate and all their data permanently deleted'],
  CANDIDATE_DELETION_REFUSED: ['DATA', 'WARNING', 'Candidate deletion refused'],
  CANDIDATE_FILES_PURGED: ['DATA', 'INFO', 'Candidate files removed from storage'],
  DATA_EXPORTED: ['EXPORT', 'WARNING', 'Data exported'],
  // COMMUNICATION
  NOTIFICATION_DISPATCHED: ['COMMUNICATION', 'INFO', 'Candidate notified']
};

const categoryFor = (action) => (META[action] ? META[action][0] : 'SYSTEM');

// ---- helpers --------------------------------------------------------------------------------------------------------
const SECRET_KEY = /pass(word)?|token|secret|otp|authorization|cookie|api[-_]?key|credential|cvv|card/i;

/** Copy of `value` that is safe to store: secrets are masked and very long strings are cut. */
function sanitize(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 6) return '[nested]';
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  const out = {};
  Object.entries(value).forEach(([key, item]) => {
    out[key] = SECRET_KEY.test(key) ? '[redacted]' : sanitize(item, depth + 1);
  });
  return out;
}

function toJson(value) {
  if (value === null || value === undefined) return null;
  const text = JSON.stringify(sanitize(value));
  if (text === undefined) return null;
  return text.length > MAX_JSON ? `${text.slice(0, MAX_JSON)}…` : text;
}

const clip = (value, max) => (value ? String(value).slice(0, max) : null);

function describeRequest(req) {
  if (!req) return {};
  return {
    ipAddress: clip(req.ip || req.socket?.remoteAddress, 64),
    userAgent: clip(req.headers?.['user-agent'], 300),
    requestId: clip(req.id, 64),
    method: clip(req.method, 10),
    // The query string is left out on purpose: it can carry identifiers and search terms.
    path: clip((req.originalUrl || req.url || '').split('?')[0], 300)
  };
}

async function actorOf({ actor, userId, req }) {
  if (actor) return { id: actor.id || null, email: actor.email || null, role: actor.role || null };
  const fromRequest = req?.user;
  const id = userId || fromRequest?.id || null;
  if (fromRequest && fromRequest.id === id) return { id, email: fromRequest.email || null, role: fromRequest.role || null };
  if (!id) return { id: null, email: null, role: null };
  try {
    const user = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
    return { id, email: user?.email || null, role: user?.role || null };
  } catch {
    return { id, email: null, role: null };
  }
}

async function appendEntry(client, entry) {
  // Writers queue on a transaction-scoped lock, so "last hash" is always the true tail of the chain.
  await client.$executeRawUnsafe(LOCK_SQL);
  const last = await client.auditLog.findFirst({
    where: { hash: { not: null } },
    orderBy: { seq: 'desc' },
    select: { hash: true }
  });
  const row = { ...entry, id: crypto.randomUUID(), createdAt: new Date(), keyId: keyIdOf(), prevHash: last?.hash || GENESIS };
  row.hash = computeHash(row, row.prevHash);
  return client.auditLog.create({ data: row });
}

/**
 * Record an audit event.
 *
 * @param {string}  opts.action      e.g. APPLICATION_STATUS_UPDATED (see META for the known ones)
 * @param {?string} opts.userId      acting user (defaults to req.user)
 * @param {Object}  [opts.actor]     { id, email, role } when the actor is not on the request (e.g. a failed login)
 * @param {string}  opts.targetType  entity type, e.g. 'Application'
 * @param {string}  opts.targetId    entity id
 * @param {string}  [opts.summary]   one readable sentence ("Moved APP-… to Shortlisted")
 * @param {Object}  [opts.details]   what happened (stored as the new value, secrets masked)
 * @param {Object}  [opts.oldValue]  the state before
 * @param {string}  [opts.outcome]   SUCCESS (default) | FAILURE | DENIED
 * @param {string}  [opts.severity]  INFO | WARNING | CRITICAL (defaults from the action)
 * @param {Object}  [opts.req]       express request: IP, browser, request id, method and path are taken from it
 * @param {Object}  [opts.tx]        prisma transaction client, to make the record atomic with the change it describes
 * @param {boolean} [opts.strict]    throw when the record cannot be written (for irreversible actions)
 */
async function logAuditAction(opts) {
  const {
    action, userId = null, actor = null, targetType, targetId, summary = null, details = null, oldValue = null,
    outcome = 'SUCCESS', severity = null, req = null, tx = null, strict = false
  } = opts;

  let entry = null;
  try {
    const who = await actorOf({ actor, userId, req });
    const meta = META[action];
    entry = {
      userId: who.id,
      actorEmail: clip(who.email, 200),
      actorRole: clip(who.role, 40),
      action: clip(action, 80),
      category: categoryFor(action),
      severity: severity || (meta ? meta[1] : 'INFO'),
      outcome,
      entity: clip(targetType || 'System', 60),
      entityId: targetId ? clip(targetId, 120) : '',
      summary: clip(summary || (meta ? meta[2] : String(action).replace(/_/g, ' ').toLowerCase()), 400),
      oldValue: toJson(oldValue),
      newValue: toJson(details),
      ...describeRequest(req)
    };

    if (tx) return await appendEntry(tx, entry);
    return await prisma.$transaction((client) => appendEntry(client, entry));
  } catch (error) {
    // Never lose the event silently: it goes to the process log (PM2) in a greppable form.
    console.error('[Audit] FAILED to write audit record:', error.message);
    console.error('[AUDIT-FALLBACK]', JSON.stringify(entry || { action, targetType, targetId }));
    if (strict) throw error;
    return null;
  }
}

/**
 * Walk the chain from the beginning and recompute every hash.
 * Rows written before the chain existed (no hash) are counted but cannot be verified.
 */
async function verifyChain({ batch = 500 } = {}) {
  let lastSeq = 0;
  let prev = GENESIS;
  let checked = 0;
  let first = null;
  let last = null;

  for (;;) {
    const rows = await prisma.auditLog.findMany({
      where: { seq: { gt: lastSeq }, hash: { not: null } },
      orderBy: { seq: 'asc' },
      take: batch
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      if (row.keyId && row.keyId !== keyIdOf()) {
        return {
          ok: false, keyMismatch: true, checked, brokenAtSeq: row.seq, firstSeq: first, lastSeq: last,
          reason: 'These records were signed with a different secret than the one the server is using now. Set AUDIT_SECRET to the original value to verify them. This does not by itself mean they were changed.'
        };
      }
      if (row.prevHash !== prev) {
        return { ok: false, checked, brokenAtSeq: row.seq, reason: 'The link to the previous record does not match: a record before this one was removed, inserted or changed.', firstSeq: first, lastSeq: last };
      }
      if (computeHash(row, row.prevHash) !== row.hash) {
        return { ok: false, checked, brokenAtSeq: row.seq, reason: 'This record\'s content no longer matches its signature: it was changed after it was written.', firstSeq: first, lastSeq: last };
      }
      prev = row.hash;
      lastSeq = row.seq;
      first = first === null ? row.seq : first;
      last = row.seq;
      checked += 1;
    }
  }

  const unsigned = await prisma.auditLog.count({ where: { hash: null } });
  return { ok: true, checked, unsignedLegacyRecords: unsigned, firstSeq: first, lastSeq: last, headHash: prev === GENESIS ? null : prev };
}

module.exports = { logAuditAction, verifyChain, computeHash, sanitize, categoryFor, META, GENESIS };
