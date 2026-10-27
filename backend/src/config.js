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

  if (isProduction) {
    console.error(`[FATAL] ${name} must be set to a random string of at least ${MIN_SECRET_LENGTH} characters in production.`);
    process.exit(1);
  }

  console.warn(`[Config] ${name} is missing or weak - using a random ephemeral secret (sessions reset on restart).`);
  return crypto.randomBytes(48).toString('hex');
}

if (isProduction && !process.env.DATABASE_URL) {
  console.error('[FATAL] DATABASE_URL must be set in production.');
  process.exit(1);
}

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (isProduction && (corsOrigins.length === 0 || corsOrigins.includes('*'))) {
  console.error('[FATAL] CORS_ORIGIN must list the allowed frontend origin(s) in production (wildcard is not permitted).');
  process.exit(1);
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
  uploadRoot: process.env.UPLOAD_DIR || 'uploads',
  // Roles that can reach staff endpoints.
  ADMIN_ROLES: ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN'],
  STAFF_ROLES: ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN', 'COMMITTEE_MEMBER']
};
