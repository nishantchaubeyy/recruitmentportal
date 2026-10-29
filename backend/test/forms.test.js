const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { validateQualifications: serverValidateQualifications } = require('../src/utils/qualifications');
const { validateResearch } = require('../src/utils/research');

// The client-side rules are an ES module shared with the React form.
let rules;
test.before(async () => {
  rules = await import(pathToFileURL(path.join(__dirname, '../../frontend/src/utils/formRules.js')).href);
});

const complete = (extra = {}) => ({
  phdUniversity: 'IIT Bombay', phdDepartment: 'CSE', phdSpecialization: 'ML', phdCity: 'Mumbai', phdCountry: 'India',
  phdRegistrationYear: '2018', phdThesisTitle: 'A thesis', phdSupervisor: 'Dr Rao', ...extra
});

test('Ph.D. "Not Applicable" shows no Ph.D. fields and stores none', () => {
  assert.deepEqual(rules.phdFieldsFor('Not Applicable'), { visible: [], required: [] });
  assert.deepEqual(rules.phdFieldsFor(''), { visible: [], required: [] });
  // Anything typed earlier is dropped from what is saved.
  assert.deepEqual(rules.buildPhd('Not Applicable', complete()), { phdStatus: 'Not Applicable' });
  assert.equal(rules.validatePhd('Not Applicable', {}), null);
});

test('Ph.D. fields depend on the status and mirror the server rules', () => {
  const pursuing = rules.phdFieldsFor('Pursuing');
  assert.ok(pursuing.visible.includes('phdExpectedYear'));
  assert.ok(!pursuing.visible.includes('phdYear'));
  const awarded = rules.phdFieldsFor('Awarded');
  assert.ok(awarded.visible.includes('phdYear') && awarded.visible.includes('phdVivaDate'));
  assert.ok(!awarded.visible.includes('phdExpectedYear'));

  // Whatever the form lets through must also pass the server, and vice versa.
  const values = complete({ phdYear: '2023' });
  assert.equal(rules.validatePhd('Awarded', values), null);
  assert.equal(validateResearch(rules.buildPhd('Awarded', values)), null);

  const missing = complete({ phdSupervisor: '' });
  assert.match(rules.validatePhd('Pursuing', missing), /supervisor/);
  assert.match(validateResearch(rules.buildPhd('Pursuing', missing)), /supervisor/);

  assert.match(rules.validatePhd('Thesis Submitted', complete()), /thesis submission date/);
  assert.match(rules.validatePhd('', {}, { requireStatus: true }), /Ph\.D\. status/);
  assert.equal(rules.validatePhd('', {}, { requireStatus: false }), null);
});

test('SSC asks for a board only; HSC adds a stream; degrees ask for a university and mode', () => {
  const ssc = rules.qualificationRule('SSC');
  assert.equal(ssc.specialization, null);
  assert.equal(ssc.instituteLabel, 'Board');
  assert.equal(ssc.mode, false);
  assert.equal(rules.qualificationRule('HSC').specialization.required, true);
  const bachelors = rules.qualificationRule("Bachelor's");
  assert.equal(bachelors.instituteLabel, 'University');
  assert.equal(bachelors.mode, true);
});

test('switching a row to SSC clears fields that do not exist for SSC', () => {
  let row = rules.blankQualification("Master's");
  row = rules.applyQualificationEdit(row, 'specialization', 'Data Science');
  row = rules.applyQualificationEdit(row, 'degreeName', 'M.Sc');
  row = rules.applyQualificationEdit(row, 'qualificationDegree', 'SSC');
  assert.equal(row.specialization, '');
  assert.equal(row.studyMode, '');
  assert.equal(row.degreeName, 'SSC (10th)');
});

test('qualification rows are validated per level', () => {
  const ssc = { qualificationDegree: 'SSC', degreeName: 'SSC (10th)', instituteName: 'CBSE', specialization: '', passingYear: '2010', cgpa: '88', studyMode: '' };
  assert.equal(rules.validateQualification(ssc, 1), null);
  assert.match(rules.validateQualification({ ...ssc, instituteName: '' }, 1), /board/);

  // HSC needs a stream, SSC does not.
  const hsc = { ...ssc, qualificationDegree: 'HSC', degreeName: 'HSC (12th)', passingYear: '2012' };
  assert.match(rules.validateQualification(hsc, 2), /stream/);
  assert.equal(rules.validateQualification({ ...hsc, specialization: 'Science' }, 2), null);

  assert.match(rules.validateQualification({ ...ssc, passingYear: '20' }, 1), /4-digit/);
  assert.match(rules.validateQualification({ ...ssc, cgpa: '140' }, 1), /between 0 and 100/);

  const bachelors = { qualificationDegree: "Bachelor's", degreeName: '', instituteName: 'SPPU', specialization: '', passingYear: '2016', cgpa: '8.4', studyMode: 'Full-Time' };
  assert.match(rules.validateQualification(bachelors, 3), /degree/);
});

test('an empty qualification list or a duplicate school level is rejected on both sides', () => {
  const blank = [rules.blankQualification('SSC'), rules.blankQualification('HSC')];
  assert.match(rules.validateQualifications(blank), /at least one/);

  const sscRow = { qualificationDegree: 'SSC', degreeName: 'SSC (10th)', instituteName: 'CBSE', specialization: '', passingYear: '2010', cgpa: '88', studyMode: '' };
  assert.equal(rules.validateQualifications([sscRow, rules.blankQualification('HSC')]), null);
  assert.match(rules.validateQualifications([sscRow, sscRow]), /twice/);

  assert.match(serverValidateQualifications([]), /at least one/);
  assert.equal(serverValidateQualifications([sscRow]), null);
  assert.match(serverValidateQualifications([{ ...sscRow, instituteName: '' }]), /board/);
  assert.match(serverValidateQualifications([{ ...sscRow, qualificationDegree: 'HSC' }]), /stream/);
  assert.match(serverValidateQualifications([sscRow, sscRow]), /twice/);
});

test('research outputs and exams apply to teaching posts only, and a year is needed once an exam is cleared', () => {
  assert.equal(rules.showsResearchOutputs('TEACHING'), true);
  assert.equal(rules.showsResearchOutputs('NON_TEACHING'), false);
  assert.deepEqual(rules.normaliseExam({ cleared: 'No', year: '2019' }), { cleared: 'No', year: '' });
  assert.match(rules.validateExam('GATE', { cleared: 'Yes', year: '' }), /GATE/);
  assert.equal(rules.validateExam('GATE', { cleared: 'Yes', year: '2021' }), null);
  assert.equal(rules.validateExam('GATE', { cleared: 'No', year: '' }), null);
  assert.match(rules.validateCount('12a', 'The count'), /whole number/);
});

test('personal and contact details have no silent defaults', () => {
  const ok = { postAppliedFor: 'Professor', title: 'Dr.', firstName: 'A', lastName: 'B', dob: '1985-04-10', gender: 'Female', maritalStatus: 'Married' };
  assert.equal(rules.validatePersonal(ok), null);
  assert.match(rules.validatePersonal({ ...ok, gender: '' }), /gender/);
  assert.match(rules.validatePersonal({ ...ok, maritalStatus: '' }), /marital/);
  assert.match(rules.validatePersonal({ ...ok, title: '' }), /title/);
  assert.match(rules.validatePersonal({ ...ok, dob: `${new Date().getFullYear() - 10}-01-01` }), /18/);

  const contact = { mobile: '9876543210', alternateMobile: '', pinCode: '411044', city: 'Pune', state: 'Maharashtra' };
  assert.equal(rules.validateContact(contact), null);
  assert.match(rules.validateContact({ ...contact, city: '' }), /city/);
  assert.match(rules.validateContact({ ...contact, state: '' }), /state/);
  assert.match(rules.validateContact({ ...contact, mobile: '1234567890' }), /mobile/);
  assert.match(rules.validateContact({ ...contact, pinCode: '123' }), /PIN/);
});

test('work experience needs dates unless the job is current', () => {
  const row = { organization: 'X Univ', designation: 'Lecturer', isCurrent: false, fromDate: '2018-01-01', toDate: '2020-01-01' };
  assert.equal(rules.validateExperience([row]), null);
  assert.match(rules.validateExperience([{ ...row, toDate: '' }]), /end date/);
  assert.equal(rules.validateExperience([{ ...row, toDate: '', isCurrent: true }]), null);
  assert.match(rules.validateExperience([{ ...row, toDate: '2017-01-01' }]), /before/);
  assert.match(rules.validateExperience([{ organization: '', designation: '', fromDate: '', toDate: '' }]), /at least one/);
});
