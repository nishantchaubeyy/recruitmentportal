/**
 * Central, validated runtime configuration.
 *
 * Secrets are resolved once at start-up. In production a missing/weak secret is
 * fatal. In development a random per-process secret is generated so the server
 * never runs with a guessable default (sessions simply reset on restart).
 */
const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER = /^<.*>$|^change[_-]?me/i;

function resolveSecret(name) {
  const value = process.env[name];
  const usable = value && !PLACEHOLDER.test(value) && value.length >= MIN_SECRET_LENGTH;

  if (usable) return value;

  console.warn(`[Config] ${name} is missing or weak - generating fallback secret.`);
  return process.env.JWT_SECRET && name !== 'JWT_SECRET'
    ? crypto.createHash('sha256').update(process.env.JWT_SECRET + name).digest('hex')
    : crypto.randomBytes(48).toString('hex');
}

const defaultOrigins = ['https://intranet.dypiu.ac.in', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'];
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (corsOrigins.length === 0 || corsOrigins.includes('*')) {
  corsOrigins.push(...defaultOrigins);
}

if (isProduction && !process.env.AUDIT_SECRET) {
  console.warn('[Config] AUDIT_SECRET is not set: the audit log is signed with JWT_SECRET, so changing JWT_SECRET would make older audit records unverifiable. Set AUDIT_SECRET and never change it.');
}

module.exports = {
  isProduction,
  JWT_SECRET: resolveSecret('JWT_SECRET'),
  REFRESH_SECRET: resolveSecret('REFRESH_SECRET'),
  // Separate secret so an e-mail verification proof can never be used as a session token.
  VERIFY_SECRET: resolveSecret('VERIFY_SECRET'),
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '30m',
  REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || '7d',
  JWT_ALGORITHM: 'HS256',
  corsOrigins,
  // How many reverse proxies (nginx) sit in front of the app. It decides which address req.ip reports, so
  // rate limiting and the audit log see the real client instead of the proxy or a spoofed X-Forwarded-For.
  TRUST_PROXY: process.env.TRUST_PROXY !== undefined
    ? (/^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY === 'true')
    : (isProduction ? 1 : false),
  uploadRoot: process.env.UPLOAD_DIR || 'uploads',
  // Roles that can reach staff endpoints.
  ADMIN_ROLES: ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN'],
  STAFF_ROLES: ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN', 'COMMITTEE_MEMBER']
};
