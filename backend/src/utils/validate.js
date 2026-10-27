/**
 * Small, dependency-free input validation helpers.
 */

const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const MOBILE_RE = /^[0-9+()\-\s]{7,15}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value.trim());
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isMobile(value) {
  return typeof value === 'string' && MOBILE_RE.test(value.trim());
}

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Trimmed string with a max length, or '' when not a string. */
function cleanString(value, max = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

/**
 * Password policy: 10+ chars, upper, lower, digit, symbol, no spaces-only, not
 * containing the e-mail local part. Returns an error string or null.
 */
function passwordPolicyError(password, email = '') {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < 10) return 'Password must be at least 10 characters long.';
  if (password.length > 128) return 'Password must not exceed 128 characters.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a special character.';

  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && password.toLowerCase().includes(local)) {
    return 'Password must not contain your e-mail name.';
  }
  return null;
}

/** Parse a date-ish value; returns a Date or null. */
function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whitelist-pick keys from an object. */
function pick(source, keys) {
  const out = {};
  for (const key of keys) {
    if (source && source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

/** Escape a value for safe interpolation into HTML (e-mail bodies etc.). */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape LIKE wildcards are not needed for Prisma `contains`; keep a length cap. */
function searchTerm(value, max = 100) {
  return cleanString(typeof value === 'string' ? value : '', max);
}

/** Safe Content-Disposition filename. */
function safeFilename(name) {
  return String(name || 'file').replace(/[^\w.\- ]/g, '_').slice(0, 120);
}

/** Cap JSON section payloads so a single field cannot bloat the database. */
function jsonSize(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value) || '', 'utf8');
  } catch {
    return Infinity;
  }
}

module.exports = {
  isEmail,
  normalizeEmail,
  isMobile,
  isUuid,
  cleanString,
  passwordPolicyError,
  parseDate,
  pick,
  escapeHtml,
  searchTerm,
  safeFilename,
  jsonSize
};
