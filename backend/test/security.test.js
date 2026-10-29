/**
 * Security regression tests. Run with:  node --test test/
 *
 * The database layer is replaced by an in-memory stub so the suite needs no
 * PostgreSQL instance - it exercises the real Express app, middleware and controllers.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-0123456789-0123456789-abcdef';
process.env.REFRESH_SECRET = 'test-refresh-secret-0123456789-0123456789-abc';
process.env.VERIFY_SECRET = 'test-verify-secret-0123456789-0123456789-abc';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), `rcp-test-uploads-${process.pid}`);

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const jwt = require('jsonwebtoken');

// ---- in-memory prisma stub ----------------------------------------------
const db = {
  users: new Map(),
  applications: new Map(),
  documents: new Map(),
  jobs: new Map(),
  resumeCount: 0,
  panels: [],
  audit: []
};

const prismaStub = {
  user: {
    findUnique: async ({ where }) => {
      if (where.id) return db.users.get(where.id) || null;
      return [...db.users.values()].find((u) => u.email === where.email) || null;
    },
    create: async ({ data }) => {
      const user = { id: crypto.randomUUID(), status: 'ACTIVE', ...data, applicant: data.applicant?.create ? { id: crypto.randomUUID(), ...data.applicant.create } : null, admin: null };
      db.users.set(user.id, user);
      return user;
    },
    count: async () => 2,
    update: async ({ where, data }) => Object.assign(db.users.get(where.id), data)
  },
  application: {
    findUnique: async ({ where, include }) => {
      const a = db.applications.get(where.id);
      return a && include?.job ? { ...a, job: db.jobs.get(a.jobId) || null } : a || null;
    },
    findMany: async ({ where }) => [...db.applications.values()]
      .filter((a) => (where?.OR || []).some((c) => a.applicationNumber?.startsWith(c.applicationNumber.startsWith)))
      .sort((a, b) => b.applicationNumber.localeCompare(a.applicationNumber)),
    findFirst: async ({ where } = {}) => {
      const all = [...db.applications.values()];
      if (where?.applicantId) {
        return all.find((a) => a.applicantId === where.applicantId && a.jobId === where.jobId && a.status !== 'WITHDRAWN') || null;
      }
      if (where?.applicationNumber) {
        return all.filter((a) => /^APP-/.test(a.applicationNumber)).sort((a, b) => b.applicationNumber.localeCompare(a.applicationNumber))[0] || null;
      }
      return null;
    },
    create: async ({ data }) => {
      const app = { id: crypto.randomUUID(), ...data };
      db.applications.set(app.id, app);
      return app;
    },
    updateMany: async ({ where, data }) => {
      const app = db.applications.get(where.id);
      if (!app || (where.status && app.status !== where.status)) return { count: 0 };
      Object.assign(app, data);
      return { count: 1 };
    },
    update: async ({ where, data }) => Object.assign(db.applications.get(where.id), data)
  },
  applicationDocument: {
    findFirst: async ({ where }) => {
      const doc = db.documents.get(where.id);
      return doc && doc.applicationId === where.applicationId ? { ...doc, application: db.applications.get(doc.applicationId) } : null;
    },
    count: async ({ where } = {}) => (where?.documentType === 'resume' ? db.resumeCount : 0),
    create: async ({ data }) => ({ id: 'doc-new', ...data }),
    createMany: async ({ data }) => {
      data.forEach((row, i) => db.documents.set(`stored-${db.documents.size}-${i}`, { id: `stored-${db.documents.size}-${i}`, ...row }));
      return { count: data.length };
    }
  },
  applicationStatusHistory: { create: async ({ data }) => data },
  interviewPanel: { findFirst: async () => null },
  auditLog: {
    create: async ({ data }) => { db.audit.push(data); return data; },
    findFirst: async () => [...db.audit].reverse().find((r) => r.hash) || null
  },
  job: {
    findUnique: async ({ where }) => db.jobs.get(where.id) || null,
    findFirst: async ({ where }) => {
      const ref = where?.OR?.[0]?.id;
      return db.jobs.get(ref) || null;
    }
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
const authController = require('../src/controllers/authController');
const storageService = require('../src/services/storageService');
const { passwordPolicyError, escapeHtml } = require('../src/utils/validate');
const { detectFileType } = require('../src/utils/fileType');

// ---- helpers ---------------------------------------------------------------
let server;
let base;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  const mk = (id, role, extra = {}) => {
    db.users.set(id, { id, email: `${id}@example.com`, role, status: 'ACTIVE', applicant: null, admin: null, ...extra });
  };
  mk('alice', 'APPLICANT', { applicant: { id: 'app-alice', name: 'Alice' } });
  mk('bob', 'APPLICANT', { applicant: { id: 'app-bob', name: 'Bob' } });
  mk('hr', 'HR_USER', { admin: { id: 'adm-hr', name: 'HR' } });
  mk('boss', 'SUPER_ADMIN', { admin: { id: 'adm-boss', name: 'Boss' } });
  mk('panel', 'COMMITTEE_MEMBER', { admin: { id: 'adm-panel', name: 'Panel' } });

  db.applications.set('a1', {
    id: 'a1', applicantId: 'app-alice', jobId: 'j1', status: 'DRAFT', applicationNumber: 'DRAFT-1',
    personalInfo: '{"firstName":"Alice"}', contactDetails: '{"email":"alice@example.com"}', declaration: true
  });
  db.applications.set('a2', {
    id: 'a2', applicantId: 'app-alice', jobId: 'j1', status: 'SUBMITTED', applicationNumber: 'APP-2026-000001'
  });
  const soon = new Date(Date.now() + 10 * 86400000);
  db.jobs.set('job-open', { id: 'job-open', status: 'PUBLISHED', deadline: soon, openingDate: new Date(Date.now() - 86400000), schoolId: null, departmentId: null });
  db.jobs.set('job-closed', { id: 'job-closed', status: 'PUBLISHED', deadline: new Date(Date.now() - 86400000), openingDate: new Date(Date.now() - 9 * 86400000) });
  db.jobs.set('job-draft', { id: 'job-draft', status: 'DRAFT', deadline: soon, openingDate: new Date(Date.now() - 86400000) });
  db.documents.set('d1', { id: 'd1', applicationId: 'a2', filePath: 'jobs/j1/applications/a2/x.pdf', originalName: 'cv.pdf' });
});

test.after(() => server.close());

const tokenFor = (id) => jwt.sign({ id, typ: 'access' }, config.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });

async function call(method, url, { token, body, headers = {} } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, json, headers: res.headers };
}

// ---- authentication ---------------------------------------------------------
test('protected routes reject anonymous callers', async () => {
  for (const [method, url] of [
    ['GET', '/api/applications'],
    ['GET', '/api/applications/a1'],
    ['PUT', '/api/applications/a1'],
    ['GET', '/api/applications/a2/documents/d1/download'],
    ['GET', '/api/interviews'],
    ['GET', '/api/interviews/calendar'],
    ['GET', '/api/documents/file/x'],
    ['GET', '/api/admin/users'],
    ['GET', '/api/reports']
  ]) {
    const res = await call(method, url);
    assert.equal(res.status, 401, `${method} ${url}`);
  }
});

test('tokens signed with the wrong secret, wrong type or alg=none are rejected', async () => {
  const forged = jwt.sign({ id: 'boss', typ: 'access' }, 'attacker-secret-attacker-secret-1234567');
  assert.equal((await call('GET', '/api/admin/users', { token: forged })).status, 401);

  const refreshAsAccess = jwt.sign({ id: 'boss', typ: 'refresh' }, config.JWT_SECRET, { algorithm: 'HS256' });
  assert.equal((await call('GET', '/api/admin/users', { token: refreshAsAccess })).status, 401);

  const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"id":"boss","typ":"access"}').toString('base64url')}.`;
  assert.equal((await call('GET', '/api/admin/users', { token: none })).status, 401);
});

test('disabled accounts are locked out immediately', async () => {
  db.users.set('ghost', { id: 'ghost', email: 'g@example.com', role: 'HR_ADMIN', status: 'SUSPENDED', applicant: null, admin: { id: 'x', name: 'G' } });
  assert.equal((await call('GET', '/api/admin/users', { token: tokenFor('ghost') })).status, 403);
});

// ---- authorisation (IDOR) -----------------------------------------------------
test('applicants cannot reach staff-only data', async () => {
  const token = tokenFor('alice');
  for (const url of ['/api/interviews', '/api/admin/users', '/api/admin/audit-logs', '/api/reports', '/api/documents', '/api/committee/assignments']) {
    assert.equal((await call('GET', url, { token })).status, 403, url);
  }
});

test('an applicant cannot read, edit, submit or download another applicant\'s application', async () => {
  const bob = tokenFor('bob');
  assert.equal((await call('GET', '/api/applications/a1', { token: bob })).status, 404);
  assert.equal((await call('PUT', '/api/applications/a1', { token: bob, body: { personalInfo: { firstName: 'Mallory' } } })).status, 404);
  assert.equal((await call('POST', '/api/applications/a1/submit', { token: bob, body: {} })).status, 404);
  assert.equal((await call('GET', '/api/applications/a2/documents/d1/download', { token: bob })).status, 404);
  assert.equal((await call('GET', '/api/applications/a2/status', { token: bob })).status, 404);
  assert.equal(db.applications.get('a1').personalInfo, '{"firstName":"Alice"}');
});

test('the owner can read their own application but not HR-only fields', async () => {
  db.applications.get('a2').screeningRemarks = 'internal note';
  Object.assign(db.applications.get('a2'), { job: {}, documents: [], statusHistory: [], applicant: {} });
  const res = await call('GET', '/api/applications/a2', { token: tokenFor('alice') });
  assert.equal(res.status, 200);
  assert.equal(res.json.screeningRemarks, undefined);
});

test('candidates see what changed and when, never HR remarks or who changed it', async () => {
  const entry = { id: 'h1', previousStatus: 'SUBMITTED', newStatus: 'SHORTLISTED', changedAt: new Date(), comment: 'weak research record', changedByUserId: 'hr' };
  Object.assign(db.applications.get('a2'), { job: {}, documents: [], statusHistory: [entry], applicant: {} });
  const own = await call('GET', '/api/applications/a2', { token: tokenFor('alice') });
  assert.equal(own.status, 200);
  assert.equal(own.json.statusHistory.length, 1);
  assert.equal(own.json.statusHistory[0].newStatus, 'SHORTLISTED');
  assert.equal(own.json.statusHistory[0].comment, undefined);
  assert.equal(own.json.statusHistory[0].changedByUserId, undefined);
  assert.match(own.json.nextStep, /shortlisted|received|review/i);
  // Staff still see the full record.
  const staff = await call('GET', '/api/applications/a2', { token: tokenFor('hr') });
  assert.equal(staff.json.statusHistory[0].comment, 'weak research record');
});

test('submitted applications are immutable for the applicant', async () => {
  const res = await call('PUT', '/api/applications/a2', { token: tokenFor('alice'), body: { personalInfo: { firstName: 'X' } } });
  assert.equal(res.status, 403);
});

test('committee members only see applications of interviews they sit on', async () => {
  Object.assign(db.applications.get('a2'), { job: {}, documents: [], statusHistory: [], applicant: {} });
  const res = await call('GET', '/api/applications/a2', { token: tokenFor('panel') });
  assert.equal(res.status, 404);
});

test('illegal workflow transitions and role escalation are rejected', async () => {
  db.applications.set('a3', { id: 'a3', applicantId: 'app-alice', status: 'SUBMITTED', applicant: { userId: 'alice' }, job: { position: 'X' } });
  // Skipping straight to SELECTED is not a legal transition.
  const skip = await call('PATCH', '/api/applications/a3/status', { token: tokenFor('boss'), body: { status: 'SELECTED' } });
  assert.equal(skip.status, 400);
  // HR users cannot record final selections.
  db.applications.get('a3').status = 'INTERVIEW_SCHEDULED';
  const decision = await call('PATCH', '/api/applications/a3/status', { token: tokenFor('hr'), body: { status: 'SELECTED' } });
  assert.equal(decision.status, 403);
  // Applicants cannot change status at all.
  assert.equal((await call('PATCH', '/api/applications/a3/status', { token: tokenFor('alice'), body: { status: 'SELECTED' } })).status, 403);
});

test('user administration is restricted to super administrators', async () => {
  const body = { email: 'new@example.com', password: 'Str0ng!Passw0rd', name: 'N', role: 'SUPER_ADMIN' };
  assert.equal((await call('POST', '/api/admin/users', { token: tokenFor('hr'), body })).status, 403);
  assert.equal((await call('POST', '/api/admin/users', { token: tokenFor('alice'), body })).status, 403);
});

// ---- registration / OTP / login ----------------------------------------------------
test('registration requires proof of e-mail ownership and a strong password', async () => {
  const noProof = await call('POST', '/api/auth/register', {
    body: { name: 'Eve', email: 'eve@example.com', mobile: '9876543210', password: 'Str0ng!Passw0rd', confirmPassword: 'Str0ng!Passw0rd' }
  });
  assert.equal(noProof.status, 400);

  const weak = await call('POST', '/api/auth/register', {
    body: { name: 'Eve', email: 'eve@example.com', mobile: '9876543210', password: 'password', confirmPassword: 'password' }
  });
  assert.equal(weak.status, 400);

  const wrongEmailProof = jwt.sign({ email: 'someone@else.com', typ: 'email-verified' }, config.VERIFY_SECRET, { algorithm: 'HS256' });
  const mismatch = await call('POST', '/api/auth/register', {
    body: { name: 'Eve', email: 'eve@example.com', mobile: '9876543210', password: 'Str0ng!Passw0rd', confirmPassword: 'Str0ng!Passw0rd', verificationToken: wrongEmailProof }
  });
  assert.equal(mismatch.status, 400);
});

test('a verified applicant can register and always becomes an APPLICANT', async () => {
  const proof = jwt.sign({ email: 'carol@example.com', typ: 'email-verified' }, config.VERIFY_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
  const res = await call('POST', '/api/auth/register', {
    body: { name: 'Carol', email: 'carol@example.com', mobile: '9876543210', password: 'Str0ng!Passw0rd', confirmPassword: 'Str0ng!Passw0rd', verificationToken: proof, role: 'SUPER_ADMIN' }
  });
  assert.equal(res.status, 201);
  assert.equal(res.json.user.role, 'APPLICANT');
  assert.equal(res.json.user.password, undefined);
});

test('OTP verification locks after repeated wrong guesses and is single use', async () => {
  const email = 'otp@example.com';
  const { otpStore } = authController._internals;
  const code = '123456';
  const arm = () => otpStore.set(email, {
    hash: crypto.createHmac('sha256', config.VERIFY_SECRET).update(`${email}:${code}`).digest('hex'),
    expiresAt: Date.now() + 60000, attempts: 0, sentAt: Date.now(), sendLog: [Date.now()]
  });

  arm();
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await call('POST', '/api/auth/verify-otp', { body: { email, otp: '000000' } })).status, 400);
  }
  assert.equal((await call('POST', '/api/auth/verify-otp', { body: { email, otp: code } })).status, 429, 'correct code is refused after lock-out');

  arm();
  const ok = await call('POST', '/api/auth/verify-otp', { body: { email, otp: code } });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.verificationToken);
  assert.equal((await call('POST', '/api/auth/verify-otp', { body: { email, otp: code } })).status, 400, 'code cannot be replayed');
});

test('login does not reveal whether an account exists and locks after repeated failures', async () => {
  const unknown = await call('POST', '/api/auth/login', { body: { email: 'nobody@example.com', password: 'whatever-123' } });
  assert.equal(unknown.status, 401);
  assert.equal(unknown.json.error, 'Invalid email or password.');

  let last;
  for (let i = 0; i < 6; i += 1) {
    last = await call('POST', '/api/auth/login', { body: { email: 'lock@example.com', password: 'wrong-password-1' } });
  }
  assert.equal(last.status, 429);
});

// ---- files -------------------------------------------------------------------------
test('file type is decided by content, not by the declared MIME type', async () => {
  assert.equal(detectFileType(Buffer.from('<html><script>alert(1)</script></html>')), null);
  assert.equal(detectFileType(Buffer.from('%PDF-1.7\n....')).mime, 'application/pdf');
  assert.equal(detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])).mime, 'image/png');

  const form = new FormData();
  form.append('file', new Blob(['<html><script>alert(1)</script></html>'], { type: 'application/pdf' }), 'evil.pdf');
  const res = await fetch(`${base}/api/applications/a1/documents`, { method: 'POST', headers: { Authorization: `Bearer ${tokenFor('alice')}` }, body: form });
  assert.equal(res.status, 400);
});

test('stored file keys cannot escape the upload directory', () => {
  assert.throws(() => storageService.getFileLocation('../../etc/passwd'));
  assert.throws(() => storageService.getFileLocation('/etc/passwd'));
  assert.throws(() => storageService.getFileLocation(''));
  assert.ok(storageService.getFileLocation('posters/a/b.png').startsWith(storageService.UPLOAD_ROOT));
  assert.equal(storageService.posterKeyFromUrl('/uploads/posters/../../secret'), null);
  assert.equal(storageService.posterKeyFromUrl('/uploads/candidates/x/y.pdf'), null);
});

test('private uploads are not served statically; only poster images are', async () => {
  const private1 = await call('GET', '/uploads/candidates/some/doc.pdf');
  assert.equal(private1.status, 404);
  const private2 = await call('GET', '/uploads/jobs/j1/applications/a2/x.pdf');
  assert.equal(private2.status, 404);
  const html = await call('GET', '/uploads/posters/x/payload.html');
  assert.equal(html.status, 404);
});

// ---- platform hardening ----------------------------------------------------------------
test('errors never leak internals and security headers are present', async () => {
  const bad = await call('POST', '/api/auth/login', { body: '{not json' });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.error, 'Malformed JSON request body.');

  const missing = await call('GET', '/api/does-not-exist');
  assert.equal(missing.status, 404);

  const health = await call('GET', '/api/health');
  assert.equal(health.json.environment, undefined);
  assert.equal(health.headers.get('x-powered-by'), null);
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.match(health.headers.get('content-security-policy') || '', /default-src 'none'/);
});

test('password policy and HTML escaping helpers', () => {
  assert.ok(passwordPolicyError('short1!A'));
  assert.ok(passwordPolicyError('alllowercase123!'));
  assert.ok(passwordPolicyError('NoSpecialChar123'));
  assert.equal(passwordPolicyError('Str0ng!Passw0rd', 'x@example.com'), null);
  assert.ok(passwordPolicyError('johnsmith!A1xyz', 'johnsmith@example.com'));
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>"\''), '&lt;img src=x onerror=alert(1)&gt;&quot;&#39;');
});

// ---- application lifecycle ---------------------------------------------------------------------------
test('applicants can only start applications for open, published vacancies', async () => {
  const token = tokenFor('bob');
  assert.equal((await call('POST', '/api/applications', { token, body: { jobId: 'job-closed' } })).status, 400);
  assert.equal((await call('POST', '/api/applications', { token, body: { jobId: 'job-draft' } })).status, 400);
  assert.equal((await call('POST', '/api/applications', { token, body: {} })).status, 404);
  // staff cannot apply
  assert.equal((await call('POST', '/api/applications', { token: tokenFor('hr'), body: { jobId: 'job-open' } })).status, 403);
});

test('a draft is bound to the caller; client-supplied owner, status and job links are ignored', async () => {
  const res = await call('POST', '/api/applications', {
    token: tokenFor('bob'),
    body: { jobId: 'job-open', applicantId: 'app-alice', status: 'SELECTED', schoolId: 'x', screeningRemarks: 'hired', declaration: true, personalInfo: { firstName: 'Bob' } }
  });
  assert.equal(res.status, 201);
  const created = db.applications.get(res.json.applicationId);
  assert.equal(created.applicantId, 'app-bob');
  assert.equal(created.status, 'DRAFT');
  assert.equal(created.screeningRemarks, undefined);
  assert.equal(created.schoolId, null);

  // A second attempt resumes the same draft instead of creating a duplicate.
  const again = await call('POST', '/api/applications', { token: tokenFor('bob'), body: { jobId: 'job-open' } });
  assert.equal(again.status, 200);
  assert.equal(again.json.applicationId, res.json.applicationId);
});

test('submission validates the form, assigns a sequential number and cannot be repeated', async () => {
  const draftId = [...db.applications.values()].find((a) => a.applicantId === 'app-bob' && a.status === 'DRAFT').id;
  const token = tokenFor('bob');

  const noDeclaration = await call('POST', `/api/applications/${draftId}/submit`, { token, body: { declaration: false } });
  assert.equal(noDeclaration.status, 400);

  const incomplete = await call('POST', `/api/applications/${draftId}/submit`, { token, body: { declaration: true, personalInfo: {}, contactDetails: {} } });
  assert.equal(incomplete.status, 400);

  const form = {
    declaration: true, personalInfo: { firstName: 'Bob' }, contactDetails: { email: 'bob@example.com' },
    qualifications: [{ qualificationDegree: 'SSC', degreeName: 'SSC (10th)', instituteName: 'CBSE', passingYear: '2010', cgpa: '85' }]
  };

  // The resume is mandatory.
  const noResume = await call('POST', `/api/applications/${draftId}/submit`, { token, body: form });
  assert.equal(noResume.status, 400);
  assert.match(noResume.json.error, /Resume/);
  db.resumeCount = 1;

  // Ph.D. details must be complete when a Ph.D. is held / pursued.
  const incompletePhd = await call('POST', `/api/applications/${draftId}/submit`, {
    token, body: { ...form, phdDetails: { phdStatus: 'Awarded', phdUniversity: 'IIT Bombay' } }
  });
  assert.equal(incompletePhd.status, 400);
  assert.match(incompletePhd.json.error, /Ph\.D\. details are incomplete/);

  const badYears = await call('POST', `/api/applications/${draftId}/submit`, {
    token,
    body: {
      ...form,
      phdDetails: {
        phdStatus: 'Awarded', phdUniversity: 'IIT Bombay', phdDepartment: 'CSE', phdSpecialization: 'ML', phdCity: 'Mumbai',
        phdCountry: 'India', phdRegistrationYear: '2020', phdYear: '2018', phdThesisTitle: 'T', phdSupervisor: 'Dr X'
      }
    }
  });
  assert.equal(badYears.status, 400);

  const ok = await call('POST', `/api/applications/${draftId}/submit`, {
    token,
    body: {
      ...form,
      phdDetails: {
        phdStatus: 'Awarded', phdUniversity: 'IIT Bombay', phdDepartment: 'CSE', phdSpecialization: 'ML', phdCity: 'Mumbai',
        phdCountry: 'India', phdRegistrationYear: '2016', phdYear: '2021', phdThesisTitle: 'T', phdSupervisor: 'Dr X'
      }
    }
  });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.match(ok.json.applicationNumber, /^DYPIU-\d{4}-\d{6}$/);
  // The sequence continues from the legacy APP- numbers instead of restarting.
  assert.equal(ok.json.applicationNumber, `DYPIU-${new Date().getFullYear()}-000002`);
  assert.equal(db.applications.get(draftId).status, 'SUBMITTED');

  const repeat = await call('POST', `/api/applications/${draftId}/submit`, { token, body: { declaration: true } });
  assert.equal(repeat.status, 409);

  const duplicate = await call('POST', '/api/applications', { token, body: { jobId: 'job-open' } });
  assert.equal(duplicate.status, 409, 'cannot apply twice for the same vacancy');
});

// ---- password reset ------------------------------------------------------------------------------------
test('password reset does not reveal accounts and requires the emailed code', async () => {
  const known = await call('POST', '/api/auth/forgot-password', { body: { email: 'alice@example.com' } });
  const unknown = await call('POST', '/api/auth/forgot-password', { body: { email: 'nobody-here@example.com' } });
  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.equal(known.json.message, unknown.json.message);

  const { otpStore } = authController._internals;
  const key = 'reset:alice@example.com';
  const arm = (code) => otpStore.set(key, {
    hash: crypto.createHmac('sha256', config.VERIFY_SECRET).update(`${key}:${code}`).digest('hex'),
    expiresAt: Date.now() + 60000, attempts: 0, sentAt: Date.now(), sendLog: [Date.now()]
  });
  const body = (otp, pw) => ({ email: 'alice@example.com', otp, newPassword: pw, confirmPassword: pw });

  arm('654321');
  assert.equal((await call('POST', '/api/auth/reset-password', { body: body('000000', 'N3w!Passw0rdX') })).status, 400, 'wrong code');
  arm('654321');
  assert.equal((await call('POST', '/api/auth/reset-password', { body: body('654321', 'weak') })).status, 400, 'weak password');
  arm('654321');
  const before = db.users.get('alice').password;
  const ok = await call('POST', '/api/auth/reset-password', { body: body('654321', 'N3w!Passw0rdX') });
  assert.equal(ok.status, 200);
  assert.notEqual(db.users.get('alice').password, before);
  assert.equal((await call('POST', '/api/auth/reset-password', { body: body('654321', 'N3w!Passw0rdY') })).status, 400, 'code is single use');
});

// ---- guest ("apply first") flow --------------------------------------------------------------------------
const guestProof = (email) => jwt.sign({ email, typ: 'email-verified' }, config.VERIFY_SECRET, { algorithm: 'HS256', expiresIn: '10m' });
const guestForm = (email, extra = {}) => ({
  jobId: 'job-open',
  declaration: true,
  personalInfo: { firstName: 'Gita', lastName: 'Rao' },
  contactDetails: { email, mobile: '9876543210' },
  qualifications: [{ qualificationDegree: 'SSC', degreeName: 'SSC (10th)', instituteName: 'CBSE', passingYear: '2010', cgpa: '85' }],
  uploadedDocsList: [{ documentType: 'resume', originalName: 'cv.pdf', fileData: `data:application/pdf;base64,${Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n').toString('base64')}` }],
  ...extra
});

test('guests cannot read, edit or upload to stored applications', async () => {
  assert.equal((await call('GET', '/api/applications/a1')).status, 401);
  assert.equal((await call('PUT', '/api/applications/a1', { body: { personalInfo: { firstName: 'X' } } })).status, 401);
  assert.equal((await call('GET', '/api/applications/a1/documents')).status, 401);
  assert.equal((await call('DELETE', '/api/applications/a1/documents/d1')).status, 401);
  // A guest "draft" never touches the database or any existing account, even when the e-mail is registered.
  const start = await call('POST', '/api/applications', { body: { jobId: 'job-open', email: 'alice@example.com' } });
  assert.equal(start.status, 200);
  assert.match(start.json.applicationId, /^app-local-/);
  assert.equal(start.json.application, undefined);
});

test('guest submission needs a verified e-mail and never touches an existing account', async () => {
  const noProof = await call('POST', '/api/applications/submit', { body: guestForm('newbie@example.com') });
  assert.equal(noProof.status, 400);
  assert.match(noProof.json.error, /verify your email/i);

  const wrongProof = await call('POST', '/api/applications/submit', { body: guestForm('newbie@example.com', { verificationToken: guestProof('other@example.com') }) });
  assert.equal(wrongProof.status, 400);

  // The e-mail already belongs to an account: no password reset, no new application - log in instead.
  const before = db.users.get('alice').password;
  const taken = await call('POST', '/api/applications/submit', { body: guestForm('alice@example.com', { verificationToken: guestProof('alice@example.com') }) });
  assert.equal(taken.status, 409);
  assert.equal(db.users.get('alice').password, before);
});

test('guest submission validates attached documents, then creates the account without leaking credentials', async () => {
  const email = 'gita@example.com';
  const verificationToken = guestProof(email);

  const disguised = await call('POST', '/api/applications/submit', {
    body: guestForm(email, { verificationToken, uploadedDocsList: [{ documentType: 'resume', originalName: 'cv.pdf', fileData: `data:application/pdf;base64,${Buffer.from('<html><script>alert(1)</script></html>').toString('base64')}` }] })
  });
  assert.equal(disguised.status, 400);

  const noResume = await call('POST', '/api/applications/submit', { body: guestForm(email, { verificationToken, uploadedDocsList: [] }) });
  assert.equal(noResume.status, 400);
  assert.match(noResume.json.error, /Resume/);
  assert.equal([...db.users.values()].some((u) => u.email === email), false, 'a rejected submission must not leave an account behind');

  const ok = await call('POST', '/api/applications/submit', { body: guestForm(email, { verificationToken }) });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.isNewUser, true);
  assert.equal(ok.json.credentials, undefined);
  assert.equal(ok.json.password, undefined);
  assert.equal([...db.users.values()].filter((u) => u.email === email).length, 1);

  // The resume is stored together with the application and is what the admin screens read back.
  const stored = [...db.documents.values()].filter((d) => d.applicationId === ok.json.applicationId);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].documentType, 'resume');
  assert.ok(storageService.fileExists(stored[0].filePath), 'the file is on disk');
});

test('if the attached files cannot be stored, nothing is submitted (no application without its resume)', async () => {
  const email = 'meera@example.com';
  const original = storageService.saveFile;
  storageService.saveFile = async () => { throw new Error('disk is full'); };
  const silence = console.error; console.error = () => {};
  const before = db.applications.size;
  try {
    const res = await call('POST', '/api/applications/submit', { body: guestForm(email, { verificationToken: guestProof(email) }) });
    assert.equal(res.status, 500);
    assert.match(res.json.error, /not submitted/);
  } finally {
    storageService.saveFile = original;
    console.error = silence;
  }
  assert.equal(db.applications.size, before, 'no application was created');
  assert.equal([...db.users.values()].some((u) => u.email === email), false, 'and no account either');
});
