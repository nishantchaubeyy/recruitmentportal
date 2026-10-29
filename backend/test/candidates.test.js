/**
 * Permanent candidate deletion: who may do it, what it requires, what it removes and what it records.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-0123456789-0123456789-abcdef';
process.env.REFRESH_SECRET = 'test-refresh-secret-0123456789-0123456789-abc';
process.env.VERIFY_SECRET = 'test-verify-secret-0123456789-0123456789-abc';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), `rcp-cand-test-uploads-${process.pid}`);

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const db = { users: new Map(), applicants: new Map(), logs: [], seq: 0, deleted: [], emailLogDeletes: [], interestDeletes: [] };

const prismaStub = {
  user: {
    findUnique: async ({ where }) => (where.id ? db.users.get(where.id) || null : null),
    // Like the real schema: deleting the account cascades to the candidate record.
    delete: async ({ where }) => {
      db.deleted.push(where.id);
      db.users.delete(where.id);
      [...db.applicants.values()].filter((a) => a.user.id === where.id).forEach((a) => db.applicants.delete(a.id));
      return {};
    }
  },
  applicant: { findUnique: async ({ where }) => db.applicants.get(where.id) || null },
  interview: { count: async () => 1 },
  notification: { count: async () => 3 },
  emailLog: {
    count: async () => 4,
    deleteMany: async ({ where }) => { db.emailLogDeletes.push(where); return { count: 4 }; }
  },
  vacancyInterest: {
    count: async () => 1,
    deleteMany: async ({ where }) => { db.interestDeletes.push(where); return { count: 1 }; }
  },
  auditLog: {
    create: async ({ data }) => { const row = { seq: ++db.seq, ...data }; db.logs.push(row); return row; },
    findFirst: async () => [...db.logs].reverse().find((r) => r.hash) || null,
    findMany: async ({ where, take = 1000 }) => db.logs.filter((r) => r.hash && r.seq > (where?.seq?.gt || 0)).slice(0, take),
    count: async () => 0
  },
  // A transaction that really rolls back what the stub recorded, to prove the deletion is all-or-nothing.
  $transaction: async (fn) => {
    const snapshot = { logs: db.logs.length, deleted: db.deleted.length, users: new Map(db.users), applicants: new Map(db.applicants) };
    try {
      return await fn(prismaStub);
    } catch (error) {
      db.logs.length = snapshot.logs;
      db.deleted.length = snapshot.deleted;
      db.users = snapshot.users;
      db.applicants = snapshot.applicants;
      throw error;
    }
  },
  $executeRawUnsafe: async () => 0,
  $connect: async () => {},
  $disconnect: async () => {}
};

const prismaPath = require.resolve('../src/services/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prismaStub };

const config = require('../src/config');
const app = require('../src/index');
const storageService = require('../src/services/storageService');
const { verifyChain } = require('../src/services/auditService');
const candidateController = require('../src/controllers/candidateController');

let server;
let base;
const PASSWORD = 'Admin#Secure2026';
const tokenFor = (id) => jwt.sign({ id, typ: 'access' }, config.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

async function call(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, json };
}

const writeFile = (key) => {
  const location = storageService.getFileLocation(key);
  fs.mkdirSync(path.dirname(location), { recursive: true });
  fs.writeFileSync(location, 'x');
  return location;
};

const candidate = () => ({
  id: 'cand-1', name: 'Gita Rao', mobile: '9876543210',
  user: { id: 'u-cand', email: 'gita.rao@example.com', role: 'APPLICANT', status: 'ACTIVE' },
  applications: [{ id: 'app-1', applicationNumber: 'DYPIU-2026-000007', status: 'SELECTED', job: { position: 'Professor' }, documents: [{ id: 'd1', filePath: 'jobs/j1/applications/app-1/cv.pdf' }] }],
  documentRequests: [{ id: 'req-1', items: [{ documents: [{ id: 'cd1', filePath: 'candidates/cand-1/pan.pdf' }] }] }]
});

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const hash = await bcrypt.hash(PASSWORD, 4);
  const mk = (id, role, extra = {}) => db.users.set(id, { id, email: `${id}@example.com`, role, status: 'ACTIVE', password: hash, applicant: null, admin: null, ...extra });
  mk('boss', 'SUPER_ADMIN', { admin: { id: 'adm-boss', name: 'Boss' } });
  mk('hradmin', 'HR_ADMIN', { admin: { id: 'adm-hra', name: 'HR Admin' } });
  mk('staff2', 'HR_USER', { admin: { id: 'adm-s2', name: 'Staff' } });
  db.users.set('u-cand', { id: 'u-cand', email: 'gita.rao@example.com', role: 'APPLICANT', status: 'ACTIVE', password: hash, applicant: { id: 'cand-1', name: 'Gita Rao' }, admin: null });
  db.applicants.set('cand-1', candidate());
  db.applicants.set('staff-as-applicant', { id: 'staff-as-applicant', name: 'Staff', mobile: '1', user: { id: 'staff2', email: 'staff2@example.com', role: 'HR_USER', status: 'ACTIVE' }, applications: [], documentRequests: [] });
});

test.after(() => server.close());

const goodBody = { confirmEmail: 'gita.rao@example.com', reason: 'Candidate asked for erasure of their data (ticket 4412)', password: PASSWORD };

test('only a super administrator can preview or delete a candidate', async () => {
  for (const who of [undefined, 'u-cand', 'hradmin', 'staff2']) {
    const token = who ? tokenFor(who) : undefined;
    assert.equal((await call('GET', '/api/admin/candidates/cand-1/deletion-preview', { token })).status, who ? 403 : 401, `preview as ${who}`);
    assert.equal((await call('DELETE', '/api/admin/candidates/cand-1', { token, body: goodBody })).status, who ? 403 : 401, `delete as ${who}`);
  }
  assert.ok(db.applicants.get('cand-1'));
  assert.equal(db.deleted.length, 0);
});

test('the preview lists exactly what would be removed', async () => {
  const res = await call('GET', '/api/admin/candidates/cand-1/deletion-preview', { token: tokenFor('boss') });
  assert.equal(res.status, 200);
  assert.equal(res.json.candidate.email, 'gita.rao@example.com');
  assert.deepEqual(res.json.counts, {
    applications: 1, applicationDocuments: 1, documentRequests: 1, requestedDocuments: 1,
    interviews: 1, notifications: 3, emailRecords: 4, interestRegistrations: 1
  });
  assert.equal(res.json.applications[0].number, 'DYPIU-2026-000007');
  assert.match(res.json.warnings[0], /upcoming interview/);
});

test('a reason, the exact e-mail address and the administrator\'s password are all required', async () => {
  const token = tokenFor('boss');
  assert.equal((await call('DELETE', '/api/admin/candidates/cand-1', { token, body: { ...goodBody, reason: 'short' } })).status, 400);
  assert.equal((await call('DELETE', '/api/admin/candidates/cand-1', { token, body: { ...goodBody, password: '' } })).status, 400);
  const wrongEmail = await call('DELETE', '/api/admin/candidates/cand-1', { token, body: { ...goodBody, confirmEmail: 'someone.else@example.com' } });
  assert.equal(wrongEmail.status, 400);
  assert.match(wrongEmail.json.error, /does not match/);

  const wrongPassword = await call('DELETE', '/api/admin/candidates/cand-1', { token, body: { ...goodBody, password: 'Not#MyPassword1' } });
  assert.equal(wrongPassword.status, 403);
  await settle();
  const refusal = db.logs.find((r) => r.action === 'CANDIDATE_DELETION_REFUSED');
  assert.ok(refusal, 'a refused attempt is recorded');
  assert.equal(refusal.outcome, 'DENIED');
  assert.equal(db.deleted.length, 0);
  assert.ok(db.applicants.get('cand-1'));
});

test('guessing the password is throttled', async () => {
  candidateController._attempts.clear();
  const token = tokenFor('boss');
  let last;
  for (let i = 0; i < 7; i += 1) {
    last = await call('DELETE', '/api/admin/candidates/cand-1', { token, body: { ...goodBody, password: `Wrong#Guess${i}x` } });
  }
  assert.equal(last.status, 429);
  candidateController._attempts.clear();
});

test('staff accounts and the administrator\'s own account cannot be deleted this way', async () => {
  const token = tokenFor('boss');
  const staff = await call('DELETE', '/api/admin/candidates/staff-as-applicant', { token, body: { ...goodBody, confirmEmail: 'staff2@example.com' } });
  assert.equal(staff.status, 400);
  assert.match(staff.json.error, /Only candidate accounts/);

  db.applicants.set('self', { id: 'self', name: 'Boss', mobile: '1', user: { id: 'boss', email: 'boss@example.com', role: 'APPLICANT', status: 'ACTIVE' }, applications: [], documentRequests: [] });
  const self = await call('DELETE', '/api/admin/candidates/self', { token, body: { ...goodBody, confirmEmail: 'boss@example.com' } });
  assert.equal(self.status, 400);
  assert.match(self.json.error, /your own account/);
});

test('if the audit record cannot be written, nothing is deleted', async () => {
  const original = prismaStub.auditLog.create;
  prismaStub.auditLog.create = async () => { throw new Error('audit store unavailable'); };
  const silence = console.error; console.error = () => {};
  try {
    const res = await call('DELETE', '/api/admin/candidates/cand-1', { token: tokenFor('boss'), body: goodBody });
    assert.equal(res.status, 500);
    assert.match(res.json.error, /Nothing was removed/);
  } finally {
    prismaStub.auditLog.create = original;
    console.error = silence;
  }
  assert.equal(db.deleted.length, 0);
  assert.ok(db.users.get('u-cand'), 'the account is still there');
});

test('a confirmed deletion removes the data and files and leaves a signed, minimal audit record', async () => {
  const files = [writeFile('jobs/j1/applications/app-1/cv.pdf'), writeFile('candidates/cand-1/pan.pdf')];
  files.forEach((f) => assert.ok(fs.existsSync(f)));

  const res = await call('DELETE', '/api/admin/candidates/cand-1', { token: tokenFor('boss'), body: goodBody });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.equal(res.json.removed.applications, 1);

  // Database: the account (which cascades to everything else) and the loose e-mail records are removed.
  assert.deepEqual(db.deleted, ['u-cand']);
  assert.equal(db.emailLogDeletes.length, 1);
  assert.equal(db.emailLogDeletes[0].OR[0].toEmail, 'gita.rao@example.com');
  assert.equal(db.interestDeletes.length, 1);

  // Storage: the files and the candidate's folder are gone.
  files.forEach((f) => assert.ok(!fs.existsSync(f), `${f} was removed`));
  assert.ok(!fs.existsSync(storageService.getFileLocation('candidates/cand-1')));
  assert.equal(res.json.files.failed, 0);

  // Audit: who, why and what - without the candidate's personal data.
  await settle();
  const entry = db.logs.find((r) => r.action === 'CANDIDATE_DATA_DELETED');
  assert.ok(entry);
  assert.equal(entry.severity, 'CRITICAL');
  assert.equal(entry.actorEmail, 'boss@example.com');
  assert.match(entry.newValue, /ticket 4412/);
  assert.ok(!entry.summary.includes('gita.rao@example.com') && !entry.newValue.includes('gita.rao@example.com'));
  assert.match(entry.summary, /g\*\*\*@example\.com/);
  assert.ok(!entry.newValue.includes('Rao'), 'only the first name is kept');
  assert.ok(db.logs.find((r) => r.action === 'CANDIDATE_FILES_PURGED'));
  assert.equal((await verifyChain()).ok, true);

  // The candidate can no longer be found or used.
  assert.equal((await call('GET', '/api/admin/candidates/cand-1/deletion-preview', { token: tokenFor('boss') })).status, 404);
  assert.equal((await call('GET', '/api/documents/my', { token: tokenFor('u-cand') })).status, 401);
});
