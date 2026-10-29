/**
 * Document-request workflow: eligibility, candidate uploads, file privacy and the ZIP download.
 * Uses the same in-memory prisma stub approach as security.test.js (no PostgreSQL needed).
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-0123456789-0123456789-abcdef';
process.env.REFRESH_SECRET = 'test-refresh-secret-0123456789-0123456789-abc';
process.env.VERIFY_SECRET = 'test-verify-secret-0123456789-0123456789-abc';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), `rcp-doc-test-uploads-${process.pid}`);

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const jwt = require('jsonwebtoken');

const db = {
  users: new Map(),
  applicants: new Map(),
  applications: new Map(),
  requests: new Map(),
  items: new Map(),
  docs: new Map()
};

const itemsOf = (requestId) => [...db.items.values()].filter((i) => i.documentRequestId === requestId);
const docsOf = (itemId) => [...db.docs.values()].filter((d) => d.documentRequestItemId === itemId).sort((a, b) => b.uploadDate - a.uploadDate);
const hydrate = (request) => request && ({
  ...request,
  candidate: db.applicants.get(request.candidateId),
  application: db.applications.get(request.applicationId) || null,
  items: itemsOf(request.id).map((item) => ({ ...item, documents: docsOf(item.id) }))
});

const prismaStub = {
  user: {
    findUnique: async ({ where }) => db.users.get(where.id) || null,
    update: async () => ({})
  },
  applicant: {
    findUnique: async ({ where }) => {
      const a = db.applicants.get(where.id);
      return a ? { ...a, user: { id: a.userId, email: `${a.userId}@example.com` } } : null;
    },
    findFirst: async ({ where }) => [...db.applicants.values()].find((a) => a.userId === where.userId) || null,
    findMany: async ({ where }) => [...db.applicants.values()].filter((a) => a.userId === where.OR[0].userId)
  },
  application: {
    findUnique: async ({ where }) => {
      const a = db.applications.get(where.id);
      return a ? { ...a, job: { position: 'Professor' } } : null;
    },
    findFirst: async ({ where }) => {
      const found = [...db.applications.values()].find((a) => a.applicantId === where.applicantId
        && (!where.status || where.status.in.includes(a.status)));
      return found ? { ...found, job: { position: 'Professor' } } : null;
    }
  },
  documentRequest: {
    create: async ({ data }) => {
      const request = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
      db.requests.set(request.id, request);
      return request;
    },
    findUnique: async ({ where }) => hydrate(db.requests.get(where.id)),
    findMany: async () => [...db.requests.values()].map(hydrate),
    update: async ({ where, data }) => Object.assign(db.requests.get(where.id), data)
  },
  documentRequestItem: {
    createMany: async ({ data }) => {
      data.forEach((row, index) => {
        const item = { id: crypto.randomUUID(), createdAt: new Date(Date.now() + index), ...row };
        db.items.set(item.id, item);
      });
      return { count: data.length };
    },
    findFirst: async ({ where }) => {
      const item = db.items.get(where.id);
      return item && item.documentRequestId === where.documentRequestId
        ? { ...item, _count: { documents: docsOf(item.id).length } }
        : null;
    },
    update: async ({ where, data }) => Object.assign(db.items.get(where.id), data)
  },
  candidateDocument: {
    create: async ({ data }) => {
      const doc = { id: crypto.randomUUID(), uploadDate: new Date(), ...data };
      db.docs.set(doc.id, doc);
      return doc;
    },
    findUnique: async ({ where }) => db.docs.get(where.id) || null
  },
  notification: { create: async () => ({}) },
  auditLog: { create: async ({ data }) => data },
  $transaction: async (fn) => fn(prismaStub),
  $connect: async () => {},
  $disconnect: async () => {}
};

const prismaPath = require.resolve('../src/services/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prismaStub };

const config = require('../src/config');
const app = require('../src/index');
const storageService = require('../src/services/storageService');

let server;
let base;
const tokenFor = (id) => jwt.sign({ id, typ: 'access' }, config.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n');

async function call(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const type = res.headers.get('content-type') || '';
  return {
    status: res.status,
    type,
    json: type.includes('json') ? await res.json() : null,
    buffer: type.includes('json') ? null : Buffer.from(await res.arrayBuffer())
  };
}

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  db.users.set('hr', { id: 'hr', email: 'hr@example.com', role: 'HR_ADMIN', status: 'ACTIVE', applicant: null, admin: { id: 'adm', name: 'HR' } });
  db.users.set('cand', { id: 'cand', email: 'cand@example.com', role: 'APPLICANT', status: 'ACTIVE', applicant: { id: 'c1', name: 'Gita Rao' }, admin: null });
  db.users.set('other', { id: 'other', email: 'other@example.com', role: 'APPLICANT', status: 'ACTIVE', applicant: { id: 'c2', name: 'Someone Else' }, admin: null });
  db.applicants.set('c1', { id: 'c1', userId: 'cand', name: 'Gita Rao' });
  db.applicants.set('c2', { id: 'c2', userId: 'other', name: 'Someone Else' });
  db.applications.set('sel', { id: 'sel', applicantId: 'c1', status: 'SELECTED', applicationNumber: 'APP-2026-000010', personalInfo: '{"firstName":"Gita"}', contactDetails: '{}' });
  db.applications.set('sub', { id: 'sub', applicantId: 'c1', status: 'SUBMITTED', applicationNumber: 'APP-2026-000011' });
});

test.after(() => server.close());

const deadline = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
let requestId;
let firstItemId;

test('documents can only be requested for shortlisted-or-later applications', async () => {
  const body = { candidateId: 'c1', applicationId: 'sub', deadline, documents: [{ name: 'PAN Card', isMandatory: true }] };
  const early = await call('POST', '/api/documents', { token: tokenFor('hr'), body });
  assert.equal(early.status, 400);
  assert.match(early.json.error, /shortlisted/i);

  // Applicants can never create requests.
  assert.equal((await call('POST', '/api/documents', { token: tokenFor('cand'), body: { ...body, applicationId: 'sel' } })).status, 403);
});

test('a request for a selected candidate keeps mandatory/optional flags, drops duplicates and reports the e-mail honestly', async () => {
  const res = await call('POST', '/api/documents', {
    token: tokenFor('hr'),
    body: {
      candidateId: 'c1',
      applicationId: 'sel',
      deadline,
      message: 'Please upload scans.',
      documents: [
        { name: 'PAN Card', type: 'PAN_CARD', isMandatory: true },
        { name: 'pan card', isMandatory: true },
        { name: 'Passport Copy', type: 'PASSPORT', isMandatory: false }
      ]
    }
  });
  assert.equal(res.status, 201);
  // No e-mail provider is configured in tests: the response must say so rather than claim it was e-mailed.
  assert.equal(res.json.emailStatus, 'SKIPPED');
  assert.match(res.json.message, /not sent/i);

  requestId = res.json.documentRequest.id;
  const items = itemsOf(requestId);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => [i.documentName, i.isMandatory]), [['PAN Card', true], ['Passport Copy', false]]);
  firstItemId = items[0].id;
});

test('candidates upload once; the upload option is closed until HR rejects the file', async () => {
  const send = async (token, itemId) => {
    const form = new FormData();
    form.append('file', new Blob([PDF], { type: 'application/pdf' }), 'pan.pdf');
    const res = await fetch(`${base}/api/documents/${requestId}/items/${itemId}/upload`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form
    });
    return { status: res.status, json: await res.json() };
  };

  // Somebody else's request is invisible.
  assert.equal((await send(tokenFor('other'), firstItemId)).status, 404);

  assert.equal((await send(tokenFor('cand'), firstItemId)).status, 201);
  const again = await send(tokenFor('cand'), firstItemId);
  assert.equal(again.status, 409);
  assert.match(again.json.error, /already uploaded/i);

  // After a rejection the candidate may upload a replacement.
  db.items.get(firstItemId).status = 'REJECTED';
  assert.equal((await send(tokenFor('cand'), firstItemId)).status, 201);
});

test('submitting is refused while a mandatory document is rejected and not yet replaced', async () => {
  // PAN Card (mandatory) is uploaded; Passport is optional and empty.
  db.items.get(firstItemId).status = 'REJECTED';
  const blocked = await call('POST', `/api/documents/${requestId}/submit`, { token: tokenFor('cand') });
  assert.equal(blocked.status, 400);
  assert.match(blocked.json.error, /PAN Card/);

  db.items.get(firstItemId).status = 'UPLOADED';
  const ok = await call('POST', `/api/documents/${requestId}/submit`, { token: tokenFor('cand') });
  assert.equal(ok.status, 200);
  // Re-open for the remaining tests.
  db.requests.get(requestId).status = 'PARTIALLY_UPLOADED';
});

test('internal storage paths are never sent to the browser', async () => {
  const mine = await call('GET', '/api/documents/my', { token: tokenFor('cand') });
  assert.equal(mine.status, 200);
  const docs = mine.json.flatMap((r) => r.items.flatMap((i) => i.documents));
  assert.ok(docs.length > 0);
  docs.forEach((doc) => assert.equal(doc.filePath, undefined));

  const all = await call('GET', '/api/documents', { token: tokenFor('hr') });
  all.json.flatMap((r) => r.items.flatMap((i) => i.documents)).forEach((doc) => assert.equal(doc.filePath, undefined));
});

test('the ZIP download works for HR, is closed to candidates and names every file uniquely', async () => {
  // Real files on disk for the two uploads (the stub stored only metadata).
  for (const doc of db.docs.values()) {
    const location = storageService.getFileLocation(doc.filePath);
    fs.mkdirSync(path.dirname(location), { recursive: true });
    if (!fs.existsSync(location)) fs.writeFileSync(location, PDF);
  }

  assert.equal((await call('GET', `/api/documents/${requestId}/download-zip`, { token: tokenFor('cand') })).status, 403);
  assert.equal((await call('GET', `/api/documents/${requestId}/download-zip`)).status, 401);

  const res = await call('GET', `/api/documents/${requestId}/download-zip`, { token: tokenFor('hr') });
  assert.equal(res.status, 200);
  assert.match(res.type, /application\/zip/);
  assert.equal(res.buffer.subarray(0, 2).toString(), 'PK');
  // Only the first item has an upload; its entry is numbered and named after the document.
  assert.ok(res.buffer.includes(Buffer.from('01_PAN_Card.pdf')));
});

test('a ZIP with nothing uploaded is a clear error, not an empty file', async () => {
  const empty = await prismaStub.documentRequest.create({ data: { candidateId: 'c1', applicationId: 'sel', status: 'PENDING', deadline: new Date() } });
  await prismaStub.documentRequestItem.createMany({ data: [{ documentRequestId: empty.id, documentName: 'Aadhar Card', documentType: 'AADHAR_CARD', isMandatory: true, status: 'PENDING' }] });
  const res = await call('GET', `/api/documents/${empty.id}/download-zip`, { token: tokenFor('hr') });
  assert.equal(res.status, 404);
  assert.match(res.json.error, /not uploaded/i);
});
