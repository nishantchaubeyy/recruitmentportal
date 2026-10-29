const test = require('node:test');
const assert = require('node:assert/strict');
const { generateApplicationPdf } = require('../src/services/pdfService');

const pageCount = (buffer) => (buffer.toString('latin1').match(/\/Type \/Page\b(?!s)/g) || []).length;

const baseApplication = (overrides = {}) => ({
  applicationNumber: 'DYPIU-2026-000042',
  submittedAt: new Date('2026-10-30T08:00:00Z'),
  job: {
    position: 'Assistant Professor – Computer Science & Engineering',
    vacancyNumber: 'VAC-2026-001',
    employmentType: 'Full Time',
    school: { name: 'School of Computer Science Engineering & Applications' }
  },
  applicant: { name: 'Gita Rao', user: { email: 'gita.rao@example.com' }, mobile: '9876543210' },
  personalInfo: JSON.stringify({ title: 'Dr.', firstName: 'Gita', lastName: 'Rao', dob: '1985-04-10', age: '41', gender: 'Female', maritalStatus: 'Married' }),
  contactDetails: JSON.stringify({ mobile: '9876543210', address: 'Flat 12, Sector 29, Akurdi', city: 'Pune', state: 'Maharashtra', country: 'India', pinCode: '411044' }),
  qualifications: JSON.stringify([
    { qualificationDegree: 'SSC', degreeName: 'SSC (10th)', instituteName: 'CBSE', passingYear: '2001', cgpa: '88' },
    { qualificationDegree: 'HSC', degreeName: 'HSC (12th)', instituteName: 'CBSE', specialization: 'Science', passingYear: '2003', cgpa: '85' },
    { qualificationDegree: "Bachelor's", degreeName: 'B.Tech', instituteName: 'University of Pune', specialization: 'Computer Engineering', passingYear: '2007', cgpa: '8.4', studyMode: 'Full-Time' },
    { qualificationDegree: "Master's", degreeName: 'M.Tech', instituteName: 'IIT Bombay', specialization: 'Data Science', passingYear: '2009', cgpa: '9.1', studyMode: 'Full-Time' }
  ]),
  researchDetails: JSON.stringify({
    phdStatus: 'Awarded', phdUniversity: 'IIT Bombay', phdDepartment: 'Computer Science and Engineering', phdSpecialization: 'Machine Learning',
    phdCity: 'Mumbai', phdCountry: 'India', phdMode: 'Full-Time', phdUgcRecognised: 'Yes', phdFellowship: 'UGC-JRF', phdRegistrationYear: '2012',
    phdThesisTitle: 'Efficient Federated Learning for Resource-Constrained Edge Devices', phdSupervisor: 'Dr A. B. Sharma', phdSupervisorDesignation: 'Professor',
    phdSubmissionDate: '2016-01-10', phdVivaDate: '2016-04-02', phdYear: '2016', phdCertificateNo: 'IITB/PHD/2016/118',
    scopusCount: '12', scopusId: '5700012345', wosCount: '4', conferencePaper: '6',
    publications: [{ type: 'Patents', count: 2 }, { type: 'Book Chapters', count: 3 }],
    net: { cleared: 'Yes', year: '2008' }, setExam: { cleared: 'No' }, slet: { cleared: 'No' }, gate: { cleared: 'Yes', year: '2007' }
  }),
  workExperience: JSON.stringify([
    { organization: 'Pune Institute of Technology', designation: 'Assistant Professor', type: 'Teaching', fromDate: '2016-07-01', toDate: '2020-06-30', salary: '70000', noticePeriod: '30 Days' },
    { organization: 'Some University of Technology and Management', designation: 'Associate Professor', type: 'Teaching', fromDate: '2020-07-01', isCurrent: true, salary: '95000', noticePeriod: '60 Days' }
  ]),
  documents: [{ documentType: 'resume', originalName: 'Gita_Rao_CV.pdf', fileSize: 182000 }],
  ...overrides
});

test('a typical teaching application is a single A4 page', async () => {
  const pdf = await generateApplicationPdf(baseApplication());
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.equal(pageCount(pdf), 1);
});

test('a heavy application (many qualifications, jobs and documents) still fits on one page', async () => {
  const jobs = Array.from({ length: 7 }, (_, i) => ({
    organization: `Institution number ${i + 1} of Technology and Management`, designation: 'Assistant Professor (Senior Scale)', type: 'Teaching',
    fromDate: `${2008 + i}-07-01`, toDate: `${2009 + i}-06-30`, salary: '60000', noticePeriod: '30 Days'
  }));
  const pdf = await generateApplicationPdf(baseApplication({
    workExperience: JSON.stringify(jobs),
    documents: [
      { documentType: 'resume', originalName: 'Gita_Rao_CV_final_v3.pdf', fileSize: 182000 },
      { documentType: 'photo', originalName: 'photo.jpg', fileSize: 42000 },
      { documentType: 'identity', originalName: 'aadhar.pdf', fileSize: 91000 }
    ]
  }));
  assert.equal(pageCount(pdf), 1);
});

test('a non-teaching fresher application is one page and has no research outputs', async () => {
  const pdf = await generateApplicationPdf(baseApplication({
    researchDetails: JSON.stringify({ phdStatus: 'Not Applicable' }),
    workExperience: JSON.stringify([])
  }));
  assert.equal(pageCount(pdf), 1);
});

test('an extreme application degrades to extra pages instead of failing or clipping', async () => {
  const jobs = Array.from({ length: 60 }, (_, i) => ({
    organization: `Institution ${i + 1}`, designation: 'Lecturer', type: 'Teaching', fromDate: '2000-01-01', toDate: '2001-01-01'
  }));
  const pdf = await generateApplicationPdf(baseApplication({ workExperience: JSON.stringify(jobs) }));
  assert.ok(pageCount(pdf) >= 2);
});
