/**
 * Audit trail: tamper-evident chain, redaction, coverage of security events and access control of the viewer.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-0123456789-0123456789-abcdef';
process.env.REFRESH_SECRET = 'test-refresh-secret-0123456789-0123456789-abc';
process.env.VERIFY_SECRET = 'test-verify-secret-0123456789-0123456789-abc';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), `rcp-audit-test-uploads-${process.pid}`);

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const db = { users: new Map(), logs: [], seq: 0 };

const matches = (row, where = {}) => Object.entries(where).every(([key, cond]) => {
  if (key === 'OR') return cond.some((c) => matches(row, c));
  if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
    if ('not' in cond) return cond.not === null ? row[key] !== null && row[key] !== undefined : row[key] !== cond.not;
    if ('gt' in cond) return row[key] > cond.gt;
    if ('gte' in cond || 'lte' in cond) return (!cond.gte || row[key] >= cond.gte) && (!cond.lte || row[key] <= cond.lte);
    if ('contains' in cond) return String(row[key] || '').toLowerCase().includes(String(cond.contains).toLowerCase());
  }
  return row[key] === cond;
});

const prismaStub = {
  user: {
    findUnique: async ({ where }) => {
      if (where.id) return db.users.get(where.id) || null;
      return [...db.users.values()].find((u) => u.email === where.email) || null;
    }
  },
  auditLog: {
    create: async ({ data }) => {
      const row = { seq: ++db.seq, ...data };
      db.logs.push(row);
      return row;
    },
    findFirst: async ({ where, orderBy }) => {
      const rows = db.logs.filter((r) => matches(r, where));
      rows.sort((a, b) => (orderBy?.seq === 'desc' ? b.seq - a.seq : a.seq - b.seq));
      return rows[0] || null;
    },
    findMany: async ({ where, orderBy, skip = 0, take = 1000 }) => {
      const rows = db.logs.filter((r) => matches(r, where));
      rows.sort((a, b) => (orderBy?.seq === 'desc' ? b.seq - a.seq : a.seq - b.seq));
      return rows.slice(skip, skip + take);
    },
    count: async ({ where } = {}) => db.logs.filter((r) => matches(r, where)).length,
    groupBy: async () => []
  },
  $transaction: async (fn) => fn(prismaStub),
  $executeRawUnsafe: async () => 0,
  $connect: async () => {},
  $disconnect: async () => {}
};

const prismaPath = require.resolve('../src/services/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prismaStub };

const config = require('../src/config');
const app = require('../src/index');
const { logAuditAction, verifyChain, sanitize } = require('../src/services/auditService');

let server;
let base;
const tokenFor = (id) => jwt.sign({ id, typ: 'access' }, config.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
const settle = () => new Promise((resolve) => setTimeout(resolve, 60)); // fire-and-forget audit writes

async function call(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, json, headers: res.headers };
}

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const mk = (id, role, extra = {}) => db.users.set(id, { id, email: `${id}@example.com`, role, status: 'ACTIVE', applicant: null, admin: null, ...extra });
  mk('boss', 'SUPER_ADMIN', { admin: { id: 'adm-boss', name: 'Boss' } });
  mk('hr', 'HR_USER', { admin: { id: 'adm-hr', name: 'HR' } });
  mk('alice', 'APPLICANT', { applicant: { id: 'app-alice', name: 'Alice' }, password: await bcrypt.hash('Correct#Horse9', 4) });
});

test.after(() => server.close());

test('records are chained and the whole chain verifies', async () => {
  db.logs.length = 0; db.seq = 0;
  await logAuditAction({ action: 'USER_LOGIN', actor: { id: 'boss', email: 'boss@example.com', role: 'SUPER_ADMIN' }, targetType: 'User', targetId: 'boss' });
  await logAuditAction({ action: 'APPLICATION_STATUS_UPDATED', userId: 'boss', targetType: 'Application', targetId: 'a1', summary: 'Moved A to B', details: { status: 'SHORTLISTED' } });
  await logAuditAction({ action: 'USER_LOGIN_FAILED', actor: { email: 'x@example.com' }, targetType: 'User', targetId: 'x@example.com', outcome: 'FAILURE' });

  assert.equal(db.logs.length, 3);
  assert.equal(db.logs[0].prevHash, 'GENESIS');
  assert.equal(db.logs[1].prevHash, db.logs[0].hash);
  assert.equal(db.logs[2].prevHash, db.logs[1].hash);
  // Category, severity and the actor are filled in from the action and the account.
  assert.equal(db.logs[1].category, 'APPLICATION');
  assert.equal(db.logs[1].actorEmail, 'boss@example.com');
  assert.equal(db.logs[1].actorRole, 'SUPER_ADMIN');
  assert.equal(db.logs[2].severity, 'WARNING');

  const result = await verifyChain();
  assert.equal(result.ok, true);
  assert.equal(result.checked, 3);
});

test('changing, removing or inserting a record is detected', async () => {
  // 1. edit the content of the middle record
  const original = db.logs[1].summary;
  db.logs[1].summary = 'Moved A to something else';
  let result = await verifyChain();
  assert.equal(result.ok, false);
  assert.equal(result.brokenAtSeq, db.logs[1].seq);
  assert.match(result.reason, /changed after it was written/);
  db.logs[1].summary = original;
  assert.equal((await verifyChain()).ok, true);

  // 2. remove a record from the middle
  const removed = db.logs.splice(1, 1)[0];
  result = await verifyChain();
  assert.equal(result.ok, false);
  assert.match(result.reason, /removed, inserted or changed/);
  db.logs.splice(1, 0, removed);
  assert.equal((await verifyChain()).ok, true);

  // 3. forging a record without the signing secret
  db.logs.push({ ...db.logs[2], seq: 99, id: 'forged', summary: 'forged', prevHash: db.logs[2].hash, hash: 'f'.repeat(64) });
  assert.equal((await verifyChain()).ok, false);
  db.logs.pop();
});

test('a changed signing secret is reported as a key mismatch, not as tampering', async () => {
  assert.equal((await verifyChain()).ok, true);
  process.env.AUDIT_SECRET = 'a-different-signing-secret-0123456789-abcdef';
  try {
    const result = await verifyChain();
    assert.equal(result.ok, false);
    assert.equal(result.keyMismatch, true);
    assert.match(result.reason, /different secret/);
    // New records written with the new secret start a new key segment but the old records stay readable.
    assert.ok(db.logs.every((r) => r.keyId));
  } finally {
    delete process.env.AUDIT_SECRET;
  }
  assert.equal((await verifyChain()).ok, true);
});

test('passwords, tokens and codes are never stored', async () => {
  const clean = sanitize({ password: 'hunter2', nested: { accessToken: 'abc', otp: '123456', ok: 'fine' }, list: [{ secret: 'x' }] });
  assert.equal(clean.password, '[redacted]');
  assert.equal(clean.nested.accessToken, '[redacted]');
  assert.equal(clean.nested.otp, '[redacted]');
  assert.equal(clean.nested.ok, 'fine');
  assert.equal(clean.list[0].secret, '[redacted]');

  await logAuditAction({ action: 'USER_UPDATED', userId: 'boss', targetType: 'User', targetId: 'u', details: { password: 'hunter2', email: 'a@b.c' } });
  const stored = db.logs[db.logs.length - 1];
  assert.ok(!stored.newValue.includes('hunter2'));
  assert.ok(stored.newValue.includes('[redacted]'));
});

test('a failure to write is swallowed normally but raised for irreversible actions', async () => {
  const original = prismaStub.auditLog.create;
  prismaStub.auditLog.create = async () => { throw new Error('db down'); };
  const silence = console.error; console.error = () => {};
  try {
    assert.equal(await logAuditAction({ action: 'USER_LOGIN', userId: 'boss', targetType: 'User', targetId: 'boss' }), null);
    await assert.rejects(logAuditAction({ action: 'CANDIDATE_DATA_DELETED', userId: 'boss', targetType: 'Applicant', targetId: 'x', strict: true }), /db down/);
  } finally {
    prismaStub.auditLog.create = original;
    console.error = silence;
  }
});

test('failed sign-ins and denied access leave a trail', async () => {
  db.logs.length = 0;
  const bad = await call('POST', '/api/auth/login', { body: { email: 'alice@example.com', password: 'Wrong#Pass123' } });
  assert.equal(bad.status, 401);
  assert.ok(bad.headers.get('x-request-id'), 'every response carries a request id');
  await settle();
  const failed = db.logs.find((r) => r.action === 'USER_LOGIN_FAILED');
  assert.ok(failed);
  assert.equal(failed.outcome, 'FAILURE');
  assert.equal(failed.actorEmail, 'alice@example.com');
  assert.ok(failed.requestId);
  assert.ok(!JSON.stringify(failed).includes('Wrong#Pass123'), 'the attempted password is never recorded');

  const ok = await call('POST', '/api/auth/login', { body: { email: 'alice@example.com', password: 'Correct#Horse9' } });
  assert.equal(ok.status, 200);
  await settle();
  assert.ok(db.logs.find((r) => r.action === 'USER_LOGIN' && r.actorEmail === 'alice@example.com'));

  // An applicant knocking on a staff endpoint is recorded as DENIED.
  const denied = await call('GET', '/api/admin/users', { token: tokenFor('alice') });
  assert.equal(denied.status, 403);
  await settle();
  const entry = db.logs.find((r) => r.action === 'ACCESS_DENIED');
  assert.ok(entry);
  assert.equal(entry.outcome, 'DENIED');
  assert.equal(entry.actorRole, 'APPLICANT');
  assert.equal(entry.method, 'GET');

  // Signing out is recorded too.
  assert.equal((await call('POST', '/api/auth/logout', { token: tokenFor('alice') })).status, 200);
  await settle();
  assert.ok(db.logs.find((r) => r.action === 'USER_LOGOUT'));
});

test('the audit log can only be read by administrators and supports filtering', async () => {
  assert.equal((await call('GET', '/api/admin/audit-logs')).status, 401);
  assert.equal((await call('GET', '/api/admin/audit-logs', { token: tokenFor('alice') })).status, 403);
  assert.equal((await call('GET', '/api/admin/audit-logs', { token: tokenFor('hr') })).status, 403);
  assert.equal((await call('GET', '/api/admin/audit-logs/verify', { token: tokenFor('hr') })).status, 403);

  const all = await call('GET', '/api/admin/audit-logs?limit=100', { token: tokenFor('boss') });
  assert.equal(all.status, 200);
  assert.ok(all.json.data.length >= 3);
  // Newest first.
  assert.ok(all.json.data[0].seq > all.json.data[all.json.data.length - 1].seq);

  const failures = await call('GET', '/api/admin/audit-logs?outcome=FAILURE', { token: tokenFor('boss') });
  assert.ok(failures.json.data.length >= 1);
  failures.json.data.forEach((row) => assert.equal(row.outcome, 'FAILURE'));

  const byCategory = await call('GET', '/api/admin/audit-logs?category=AUTH', { token: tokenFor('boss') });
  byCategory.json.data.forEach((row) => assert.equal(row.category, 'AUTH'));

  const search = await call('GET', '/api/admin/audit-logs?q=alice%40example.com', { token: tokenFor('boss') });
  assert.ok(search.json.data.length >= 1);
});

test('administrators can verify the chain through the API and the check is recorded', async () => {
  const res = await call('GET', '/api/admin/audit-logs/verify', { token: tokenFor('boss') });
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  assert.ok(res.json.checked > 0);
  assert.ok(db.logs.find((r) => r.action === 'AUDIT_INTEGRITY_CHECKED'));

  // Exports are reported by the browser and recorded with who and how many rows.
  const exported = await call('POST', '/api/admin/events/export', { token: tokenFor('hr'), body: { source: 'applications', rows: 42, filters: { status: 'SELECTED' } } });
  assert.equal(exported.status, 200);
  const entry = db.logs.find((r) => r.action === 'DATA_EXPORTED');
  assert.ok(entry);
  assert.match(entry.summary, /42 rows/);
  // HR users may not export the audit log itself.
  assert.equal((await call('POST', '/api/admin/events/export', { token: tokenFor('hr'), body: { source: 'audit-log', rows: 1 } })).status, 403);
});
