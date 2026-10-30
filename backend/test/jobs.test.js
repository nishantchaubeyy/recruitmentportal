/**
 * Vacancy input handling. The stubbed database cannot notice a field that does not exist, so this checks the
 * handler's output against the real Prisma schema: every key it produces must be a column of Job.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-0123456789-0123456789-abcdef';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const prismaPath = require.resolve('../src/services/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { auditLog: {}, $transaction: async () => null } };
const { _normaliseJobInput: normaliseJobInput } = require('../src/controllers/jobController');

function jobColumns() {
  const schema = fs.readFileSync(path.join(__dirname, '../../prisma/schema.prisma'), 'utf8');
  const body = schema.match(/model Job \{([\s\S]*?)\n\}/)[1];
  return new Set(body.split('\n').map((line) => line.trim().split(/\s+/)[0]).filter((name) => /^[a-z][A-Za-z]*$/.test(name)));
}

// Everything the admin "Create / Edit Vacancy" form can send.
const formPayload = (extra = {}) => ({
  vacancyNumber: '', type: 'CUSTOM', customCategory: 'HR Head', customLabel: 'HR Head', schoolId: null, departmentId: null, positionId: null,
  schoolName: 'School of Digital Sciences', position: 'HR Head', department: 'Registrar Office - HR', employmentType: 'Contract', numPositions: 1,
  location: 'Pune', qualification: 'MBA', experience: '10 years', skills: 'HR', salaryScale: 'x', description: 'Lead HR', eligibilityCriteria: 'x',
  requiredDocuments: 'CV', posterUrl: '', bannerUrl: '', imageUrl: '', openingDate: '2026-10-01', deadline: '2030-01-01', status: 'DRAFT', ...extra
});

test('every field the vacancy handler produces is a real column of Job', async () => {
  const columns = jobColumns();
  assert.ok(columns.has('position') && columns.has('deadline'), 'the schema was read');
  for (const partial of [true, false]) {
    for (const type of ['CUSTOM', 'TEACHING', 'NON_TEACHING']) {
      const { data, error } = await normaliseJobInput(formPayload({ type }), { partial });
      assert.equal(error, undefined);
      const unknown = Object.keys(data).filter((key) => !columns.has(key));
      assert.deepEqual(unknown, [], `fields that are not columns of Job (the database would reject the save): ${unknown.join(', ')}`);
    }
  }
});

test('schoolName is accepted as a form helper but never stored', async () => {
  const { data } = await normaliseJobInput(formPayload({ schoolName: 'School of Digital Sciences' }), { partial: true });
  assert.equal('schoolName' in data, false);
  const bad = await normaliseJobInput(formPayload({ schoolName: 42 }), { partial: true });
  assert.match(bad.error, /schoolName/);
});
