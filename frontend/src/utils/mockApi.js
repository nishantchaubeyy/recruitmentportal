// ============================================================
// MOCK API HANDLER  (dev/demo only — VITE_MOCK_API=true)
// Simulates the real backend contract with local static data:
//  - MACHINE status values (SUBMITTED, UNDER_REVIEW, …)
//  - Paginated list shape { data, pagination } for /applications
//  - The same endpoint paths the real backend exposes
// ============================================================

import {
  MOCK_JOBS,
  MOCK_APPLICATIONS,
  MOCK_NOTIFICATIONS,
  MOCK_USERS
} from './mockData';

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Reference data ────────────────────────────────────────────
const DEFAULT_SCHOOLS = [
  { id: 'sch-1', name: 'School of Computing', type: 'TEACHING', code: 'SOC', posterUrl: null },
  { id: 'sch-2', name: 'School of Management', type: 'TEACHING', code: 'SOM', posterUrl: null },
  { id: 'sch-3', name: 'School of Biosciences & Bioengineering', type: 'TEACHING', code: 'SOB', posterUrl: null },
  { id: 'sch-4', name: 'School of Architecture & Design', type: 'TEACHING', code: 'SOA', posterUrl: null },
  { id: 'sch-5', name: 'School of Media & Communication', type: 'TEACHING', code: 'SOMC', posterUrl: null },
  { id: 'sch-6', name: 'School of Pharmacy', type: 'TEACHING', code: 'SOP', posterUrl: null },
  { id: 'sch-7', name: 'School of Humanities & Social Sciences', type: 'TEACHING', code: 'SOH', posterUrl: null },
  { id: 'sch-8', name: 'Research & Innovation Centres', type: 'TEACHING', code: 'RIC', posterUrl: null },
  { id: 'sch-9', name: 'University Administration & Operations', type: 'NON_TEACHING', code: 'ADM', posterUrl: null },
  { id: 'sch-10', name: 'Systems & IT Infrastructure', type: 'NON_TEACHING', code: 'IT', posterUrl: null },
  { id: 'sch-11', name: 'Technical & Laboratory Services', type: 'NON_TEACHING', code: 'LAB', posterUrl: null },
  { id: 'sch-12', name: 'Finance & Accounts', type: 'NON_TEACHING', code: 'FIN', posterUrl: null },
  { id: 'sch-13', name: 'Library & Information Services', type: 'NON_TEACHING', code: 'LIB', posterUrl: null },
  { id: 'sch-14', name: 'Branding, Media & Promotion', type: 'NON_TEACHING', code: 'BMP', posterUrl: null },
  { id: 'sch-15', name: 'Estate & Civil Engineering', type: 'NON_TEACHING', code: 'ECE', posterUrl: null }
];

const getStoredSchools = () => {
  try {
    const stored = localStorage.getItem('MOCK_SCHOOLS_PERSIST');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse stored schools:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_SCHOOLS));
};

let schools = getStoredSchools();

const saveSchools = () => {
  try {
    localStorage.setItem('MOCK_SCHOOLS_PERSIST', JSON.stringify(schools));
  } catch (e) {
    console.error('Failed to persist schools:', e);
  }
};

const DEPARTMENTS = {
  'sch-1': [{ id: 'dep-1', name: 'Computer Science & Engineering' }, { id: 'dep-2', name: 'AI & Data Science' }],
  'sch-2': [{ id: 'dep-3', name: 'Business Administration' }],
  'sch-3': [{ id: 'dep-4', name: 'Biotechnology & Bioengineering' }],
  'sch-4': [{ id: 'dep-5', name: 'Graphic & Visual Communication Design' }],
  'sch-5': [{ id: 'dep-6', name: 'Journalism & Mass Media' }],
  'sch-9': [{ id: 'dep-7', name: 'Registrar & Secretarial Office' }, { id: 'dep-8', name: 'University Administrative Services' }],
  'sch-10': [{ id: 'dep-9', name: 'Campus IT & Network Systems' }],
  'sch-14': [{ id: 'dep-10', name: 'Media Studio & Photography' }],
  'sch-15': [{ id: 'dep-11', name: 'Civil Infrastructure & Planning' }]
};
const POSITIONS = {
  'dep-1': [{ id: 'pos-1', title: 'Assistant Professor' }, { id: 'pos-2', title: 'Associate Professor' }],
  'dep-3': [{ id: 'pos-3', title: 'Assistant Professor' }],
  'dep-9': [{ id: 'pos-4', title: 'Systems Administrator' }]
};

// ── In-memory state ───────────────────────────────────────────
const getStoredApplications = () => {
  try {
    const stored = localStorage.getItem('MOCK_APPLICATIONS_PERSIST');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse stored applications:', e);
  }
  return JSON.parse(JSON.stringify(MOCK_APPLICATIONS));
};

const getStoredJobs = () => {
  try {
    const stored = localStorage.getItem('MOCK_JOBS_PERSIST');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse stored jobs:', e);
  }
  return JSON.parse(JSON.stringify(MOCK_JOBS)).map((j, i) => ({
    vacancyNumber: `VAC-2026-${String(i + 1).padStart(3, '0')}`,
    openingDate: j.createdAt,
    ...j
  }));
};

const saveJobs = () => {
  try {
    localStorage.setItem('MOCK_JOBS_PERSIST', JSON.stringify(jobs));
  } catch (e) {
    console.error('Failed to persist jobs:', e);
  }
};

const DEFAULT_MOCK_USERS = [
  {
    id: 'user-admin',
    email: 'admin@dypiu.edu',
    password: 'AdminPassword123',
    role: 'ADMIN',
    status: 'ACTIVE',
    name: 'HR Administrator',
    admin: { name: 'HR Administrator' },
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'user-demo-applicant',
    email: 'demo@applicant.com',
    password: 'Demo@1234',
    role: 'APPLICANT',
    status: 'ACTIVE',
    name: 'Demo Applicant',
    applicant: { name: 'Demo Applicant', mobile: '9000000000' },
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

const getStoredUsers = () => {
  try {
    const stored = localStorage.getItem('MOCK_USERS_PERSIST');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse stored users:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_MOCK_USERS));
};

const saveUsers = () => {
  try {
    localStorage.setItem('MOCK_USERS_PERSIST', JSON.stringify(users));
  } catch (e) {
    console.error('Failed to persist users:', e);
  }
};

let jobs = getStoredJobs();
let applications = getStoredApplications();
let notifications = JSON.parse(JSON.stringify(MOCK_NOTIFICATIONS));
let interviews = [];
let users = getStoredUsers();
let auditLogs = [];

let currentUser = null;

const saveApplications = () => {
  try {
    localStorage.setItem('MOCK_APPLICATIONS_PERSIST', JSON.stringify(applications));
  } catch (e) {
    console.error('Failed to persist applications:', e);
  }
};

const isOpen = (job) => job.status === 'PUBLISHED' && (!job.deadline || new Date(job.deadline) >= new Date());

// ── AUTH ──────────────────────────────────────────────────────
async function mockLogin(body) {
  await delay();
  const { email, password } = body;
  const searchEmail = (email || '').trim().toLowerCase();
  users = getStoredUsers();

  const found = users.find((u) => u.email.toLowerCase() === searchEmail);
  if (!found) {
    throw new Error('Invalid email or password.');
  }

  if (found.status !== 'ACTIVE') {
    throw new Error('Your account is currently disabled. Please contact HR administrator.');
  }

  if (found.password && password && found.password !== password) {
    throw new Error('Invalid email or password.');
  }

  currentUser = {
    id: found.id,
    email: found.email,
    role: found.role,
    status: found.status,
    name: found.name || found.admin?.name || found.applicant?.name || 'User',
    admin: found.admin || (['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN', 'COMMITTEE_MEMBER'].includes(found.role) ? { name: found.name || 'Staff User' } : null),
    applicant: found.applicant || (found.role === 'APPLICANT' ? { name: found.name || 'Applicant', mobile: found.mobile || '9000000000' } : null)
  };

  return { token: 'mock-token-' + currentUser.role, user: currentUser, message: 'Login successful.' };
}

async function mockRegister(body) {
  await delay();
  const { name, email, mobile, password, confirmPassword } = body;
  if (!name || !email || !mobile || !password) throw new Error('All fields are mandatory.');
  if (password !== confirmPassword) throw new Error('Passwords do not match.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');

  users = getStoredUsers();
  if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
    throw new Error('An account with this email address already exists.');
  }

  const newUser = {
    id: 'user-' + Date.now(),
    email: email.trim().toLowerCase(),
    password,
    role: 'APPLICANT',
    status: 'ACTIVE',
    name,
    applicant: { name, mobile },
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers();

  currentUser = newUser;
  return { token: 'mock-token-APPLICANT', user: currentUser, message: 'Registration successful.' };
}

async function mockGetMe() {
  await delay();
  if (!currentUser) throw new Error('Not authenticated.');
  return { ...currentUser, profileDetails: {} };
}

// ── JOBS / VACANCIES ──────────────────────────────────────────
function publicVacancy(j) {
  return { ...j, isApplicationOpen: isOpen(j) };
}

async function mockGetPublicVacancies(params) {
  await delay();
  let result = jobs.filter((j) => j.status === 'PUBLISHED');
  const type = params.get('type') || params.get('category');
  if (type) result = result.filter((j) => j.type === type);
  if (params.get('search')) {
    const s = params.get('search').toLowerCase();
    result = result.filter((j) => j.position.toLowerCase().includes(s) || j.department.toLowerCase().includes(s));
  }
  return result.map(publicVacancy);
}

async function mockGetVacancyById(id) {
  await delay();
  const job = jobs.find((j) => j.id === id || j.vacancyNumber === id);
  if (!job) throw new Error('Vacancy opening not found.');
  return publicVacancy(job);
}

async function mockGetAdminVacancies(params) {
  await delay();
  let result = [...jobs];
  if (params.get('type')) result = result.filter((j) => j.type === params.get('type'));
  if (params.get('status')) result = result.filter((j) => j.status === params.get('status'));
  if (params.get('search')) {
    const s = params.get('search').toLowerCase();
    result = result.filter((j) =>
      j.position.toLowerCase().includes(s) ||
      j.department.toLowerCase().includes(s) ||
      (j.vacancyNumber || '').toLowerCase().includes(s)
    );
  }
  return result.map((j) => ({
    ...j,
    applicationsCount: applications.filter((a) => a.jobId === j.id && a.status !== 'DRAFT').length,
    interestCount: 0,
    isApplicationOpen: isOpen(j)
  }));
}

async function mockCreateJob(body) {
  await delay();
  const newJob = {
    ...body,
    id: 'job-' + Date.now(),
    vacancyNumber: body.vacancyNumber || `VAC-2026-${String(jobs.length + 1).padStart(3, '0')}`,
    numPositions: parseInt(body.numPositions) || 1,
    deadline: body.deadline ? new Date(body.deadline).toISOString() : null,
    openingDate: body.openingDate ? new Date(body.openingDate).toISOString() : new Date().toISOString(),
    status: body.status || 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  jobs.push(newJob);
  saveJobs();
  return { message: 'Vacancy created successfully.', job: newJob };
}

async function mockUpdateJob(id, body) {
  await delay();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) throw new Error('Vacancy not found.');
  jobs[idx] = { ...jobs[idx], ...body, updatedAt: new Date().toISOString() };
  saveJobs();
  return { message: 'Vacancy updated.', job: jobs[idx] };
}

async function mockUpdateJobStatus(id, body) {
  await delay();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) throw new Error('Vacancy not found.');
  jobs[idx].status = body.status;
  saveJobs();
  return { message: `Status changed to ${body.status}.`, job: jobs[idx] };
}

// ── APPLICATIONS ──────────────────────────────────────────────
function paginate(list, params) {
  const page = parseInt(params.get('page')) || 1;
  const limit = parseInt(params.get('limit')) || 10;
  const start = (page - 1) * limit;
  return {
    data: list.slice(start, start + limit),
    pagination: { total: list.length, page, limit, totalPages: Math.ceil(list.length / limit) || 1 }
  };
}

async function mockGetApplications(params) {
  await delay();
  applications = getStoredApplications();
  let result = applications.filter((a) => a.status !== 'DRAFT');

  if (currentUser?.role === 'APPLICANT') {
    result = applications.filter((a) => a.applicantId === currentUser.id || a.applicant?.user?.email === currentUser.email);
  } else {
    if (params.get('jobId')) result = result.filter((a) => a.jobId === params.get('jobId'));
    if (params.get('status')) result = result.filter((a) => a.status === params.get('status'));
    if (params.get('type')) result = result.filter((a) => a.job?.type === params.get('type'));
    if (params.get('search')) {
      const s = params.get('search').toLowerCase();
      result = result.filter((a) =>
        a.applicationNumber.toLowerCase().includes(s) ||
        a.applicant?.name?.toLowerCase().includes(s) ||
        a.job?.position?.toLowerCase().includes(s)
      );
    }
  }
  return paginate(result, params);
}

async function mockGetMyApplications() {
  await delay();
  applications = getStoredApplications();
  return applications.filter((a) => a.applicant?.user?.email === currentUser?.email || a.applicantId === currentUser?.id);
}

async function mockGetApplicationById(id) {
  await delay();
  applications = getStoredApplications();
  const app = applications.find((a) => a.id === id || a.applicationNumber === id);
  if (!app) throw new Error('Application not found.');
  if (app.status !== 'DRAFT' && !app.submittedAt) {
    const submitHistory = app.statusHistory?.find((h) => h.newStatus === 'SUBMITTED');
    app.submittedAt = submitHistory?.changedAt || app.updatedAt || new Date().toISOString();
  }
  return app;
}

async function mockCreateDraft(body) {
  await delay();
  const job = jobs.find((j) => j.id === body.jobId) || jobs[0];
  const applicantEmail = body.personalInfo?.email || currentUser?.email || 'applicant@example.com';
  const existing = applications.find((a) => a.jobId === body.jobId && a.status === 'DRAFT' && a.applicant?.user?.email === applicantEmail);
  if (existing) return { message: 'Draft resumed.', applicationId: existing.id };

  const applicantName = body.personalInfo?.firstName
    ? `${body.personalInfo.firstName} ${body.personalInfo.lastName || ''}`.trim()
    : (currentUser?.name || 'Applicant');

  const newApp = {
    id: 'app-' + Date.now(),
    applicationNumber: 'DRAFT-' + Date.now(),
    jobId: job.id,
    applicantId: currentUser?.id || 'applicant-' + Date.now(),
    status: 'DRAFT',
    job,
    personalInfo: body.personalInfo || {},
    contactDetails: body.contactDetails || {},
    qualifications: body.qualifications || [],
    researchDetails: body.phdDetails || body.researchDetails || {},
    experience: body.workExperience || [],
    declaration: body.declaration || false,
    applicant: { name: applicantName, mobile: body.contactDetails?.mobile || '', user: { email: applicantEmail } },
    documents: [],
    statusHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  applications.unshift(newApp);
  saveApplications();
  return { message: 'Draft initialized.', applicationId: newApp.id };
}

async function mockUpdateDraft(id, body) {
  await delay();
  const idx = applications.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Application not found.');
  applications[idx] = { ...applications[idx], ...body, updatedAt: new Date().toISOString() };
  saveApplications();
  return { message: 'Draft saved.', application: applications[idx] };
}

async function mockSubmitApplication(id, body = {}) {
  await delay();
  const idx = applications.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Application not found.');
  if (applications[idx].status !== 'DRAFT') throw new Error('This application has already been submitted.');

  if (body.personalInfo) applications[idx].personalInfo = body.personalInfo;
  if (body.contactDetails) applications[idx].contactDetails = body.contactDetails;
  if (body.qualifications) applications[idx].qualifications = body.qualifications;
  if (body.workExperience) applications[idx].experience = body.workExperience;
  if (body.phdDetails) applications[idx].researchDetails = body.phdDetails;

  const fullName = body.personalInfo?.firstName
    ? `${body.personalInfo.firstName} ${body.personalInfo.lastName || ''}`.trim()
    : (applications[idx].applicant?.name || 'Applicant');
  applications[idx].applicant = {
    name: fullName,
    mobile: body.contactDetails?.mobile || applications[idx].applicant?.mobile || '',
    user: { email: body.personalInfo?.email || applications[idx].applicant?.user?.email || '' }
  };

  const year = new Date().getFullYear();
  const submittedCount = applications.filter((a) => a.status !== 'DRAFT').length;
  const appNumber = `APP-${year}-${String(submittedCount + 1).padStart(6, '0')}`;

  applications[idx].applicationNumber = appNumber;
  applications[idx].status = 'SUBMITTED';
  applications[idx].submittedAt = new Date().toISOString();
  applications[idx].updatedAt = new Date().toISOString();
  applications[idx].statusHistory = [
    { newStatus: 'SUBMITTED', changedAt: new Date().toISOString(), comment: 'Application submitted by candidate.' }
  ];

  notifications.unshift({
    id: 'notif-' + Date.now(),
    content: `New application (${appNumber}) received for "${applications[idx].job?.position || 'Vacancy'}" by ${fullName}.`,
    isRead: false,
    createdAt: new Date().toISOString()
  });
  saveApplications();
  return { message: 'Submitted successfully.', applicationNumber: appNumber, status: 'SUBMITTED' };
}

async function mockUploadDocument(id, formData) {
  await delay(200);
  let idx = applications.findIndex((a) => a.id === id);
  if (idx === -1) {
    const draft = {
      id: id || 'app-' + Date.now(),
      applicationNumber: 'DRAFT-' + Date.now(),
      status: 'DRAFT',
      documents: [],
      createdAt: new Date().toISOString()
    };
    applications.unshift(draft);
    idx = 0;
  }
  const docType = (formData && typeof formData.get === 'function') ? formData.get('documentType') : (formData?.documentType || 'document');
  const file = (formData && typeof formData.get === 'function') ? formData.get('file') : (formData?.file);
  let fileData = (formData && typeof formData.get === 'function') ? formData.get('fileData') : (formData?.fileData);

  if (!fileData && file && typeof file === 'object' && file.name) {
    try {
      fileData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    } catch (e) {
      fileData = null;
    }
  }

  applications[idx].documents = (applications[idx].documents || []).filter((d) => d.documentType !== docType);
  const doc = {
    id: 'doc-' + Date.now(),
    documentType: docType,
    originalName: file?.name || 'document.pdf',
    fileSize: file?.size || 100000,
    fileData: fileData || null,
    url: fileData || null,
    uploadedAt: new Date().toISOString()
  };
  applications[idx].documents.push(doc);
  saveApplications();
  return { message: 'File uploaded.', document: doc };
}

async function mockUpdateStatus(id, body) {
  await delay();
  const idx = applications.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Application not found.');
  const prev = applications[idx].status;
  applications[idx].status = body.status;
  applications[idx].statusHistory = applications[idx].statusHistory || [];
  applications[idx].statusHistory.unshift({
    newStatus: body.status,
    previousStatus: prev,
    changedAt: new Date().toISOString(),
    comment: body.comment || `Status changed to "${body.status}".`
  });
  saveApplications();
  return { message: 'Status updated.', application: applications[idx] };
}

async function mockTrackApplication(params) {
  await delay();
  const num = params.get('applicationNumber');
  const app = applications.find((a) => a.applicationNumber === num && a.status !== 'DRAFT');
  if (!app) throw new Error('No application found with the provided number.');
  return {
    applicationNumber: app.applicationNumber,
    position: app.job.position,
    department: app.job.department,
    appliedDate: app.submittedAt || app.createdAt,
    status: app.status,
    history: app.statusHistory
  };
}

// ── INTERVIEWS ────────────────────────────────────────────────
async function mockGetInterviews() {
  await delay();
  return interviews;
}

async function mockCreateInterview(body) {
  await delay();
  const app = applications.find((a) => a.id === body.applicationId);
  const interview = {
    id: 'int-' + Date.now(),
    ...body,
    candidate: { name: app?.applicant?.name || 'Candidate' },
    job: app?.job || jobs.find((j) => j.id === body.jobId) || {},
    status: 'SCHEDULED',
    createdAt: new Date().toISOString()
  };
  interviews.unshift(interview);
  return { message: 'Interview scheduled successfully.', interview };
}

async function mockSubmitEvaluation() {
  await delay();
  return { message: 'Evaluation submitted successfully.' };
}

async function mockGetCommitteeAssignments() {
  await delay();
  return interviews;
}

// ── ADMIN USERS / AUDIT ───────────────────────────────────────
async function mockGetUsers() {
  await delay();
  users = getStoredUsers();
  return users;
}

async function mockCreateUser(body) {
  await delay();
  users = getStoredUsers();
  const searchEmail = (body.email || '').trim().toLowerCase();
  if (users.some((u) => u.email.toLowerCase() === searchEmail)) {
    throw new Error('A user with this email address already exists.');
  }

  const newUser = {
    id: 'user-' + Date.now(),
    email: searchEmail,
    password: body.password || 'AdminPassword123',
    role: body.role || 'HR_ADMIN',
    status: 'ACTIVE',
    name: body.name || 'Staff User',
    admin: { name: body.name || 'Staff User' },
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers();
  return { message: 'User created successfully.', user: newUser };
}

async function mockUpdateUserStatus(id, body) {
  await delay();
  users = getStoredUsers();
  const u = users.find((x) => x.id === id);
  if (u) {
    u.status = body.status;
    saveUsers();
  }
  return { message: `User status changed to ${body.status}.`, user: u };
}

async function mockGetAuditLogs(params) {
  await delay();
  return paginate(auditLogs, params);
}

// ── VACANCY INTERESTS ─────────────────────────────────────────
let interests = [];
async function mockGetVacancyInterests() {
  await delay();
  const counts = {};
  interests.forEach((i) => { counts[i.interestedPosition] = (counts[i.interestedPosition] || 0) + 1; });
  return { success: true, data: interests, counts };
}

// ── NOTIFICATIONS / REPORTS ───────────────────────────────────
async function mockGetNotifications() {
  await delay();
  return notifications;
}
async function mockMarkRead(id) {
  await delay();
  const n = notifications.find((x) => x.id === id);
  if (n) n.isRead = true;
  return { message: 'Marked as read.', notification: n };
}
async function mockGetReports() {
  await delay();
  applications = getStoredApplications();
  return jobs.map((job) => ({
    jobId: job.id,
    position: job.position,
    type: job.type,
    department: job.department,
    postedDate: job.createdAt,
    totalApplications: applications.filter((a) => a.jobId === job.id && a.status !== 'DRAFT').length,
    shortlisted: applications.filter((a) => a.jobId === job.id && ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED'].includes(a.status)).length,
    rejected: applications.filter((a) => a.jobId === job.id && ['REJECTED', 'CLOSED'].includes(a.status)).length,
    underReview: applications.filter((a) => a.jobId === job.id && ['UNDER_REVIEW', 'SUBMITTED', 'WAITLISTED'].includes(a.status)).length
  }));
}

// ── SCHOOLS & RECRUITMENT POSTERS ────────────────────────────
async function mockGetSchools(params) {
  await delay();
  schools = getStoredSchools();
  jobs = getStoredJobs();
  const type = params.get('type');
  const filtered = type ? schools.filter((s) => s.type === type) : schools;
  return filtered.map((s) => {
    const activeJobs = jobs.filter((j) => {
      const matchSchool = (j.department || '').toLowerCase().includes(s.name.toLowerCase()) ||
        (j.school?.name || '').toLowerCase().includes(s.name.toLowerCase()) ||
        (j.schoolId === s.id);
      return matchSchool && j.status === 'PUBLISHED';
    });
    return {
      ...s,
      recruitmentPosterUrl: s.posterUrl || null,
      _count: {
        jobs: activeJobs.length
      }
    };
  });
}

async function mockUploadSchoolPoster(schoolId, formData) {
  await delay(200);
  schools = getStoredSchools();
  const school = schools.find((s) => s.id === schoolId);
  if (!school) throw new Error('School/Faculty not found.');

  let posterUrl = null;
  if (formData instanceof FormData) {
    const file = formData.get('poster');
    if (file && typeof file === 'object' && file.name) {
      posterUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      });
    }
  } else if (formData && formData.posterUrl) {
    posterUrl = formData.posterUrl;
  }

  if (!posterUrl) {
    throw new Error('No valid poster image file uploaded.');
  }

  school.posterUrl = posterUrl;
  school.recruitmentPosterUrl = posterUrl;
  school.updatedAt = new Date().toISOString();
  saveSchools();

  return {
    message: 'Recruitment poster uploaded successfully.',
    school
  };
}

async function mockDeleteSchoolPoster(schoolId) {
  await delay(150);
  schools = getStoredSchools();
  const school = schools.find((s) => s.id === schoolId);
  if (!school) throw new Error('School/Faculty not found.');

  school.posterUrl = null;
  school.recruitmentPosterUrl = null;
  school.updatedAt = new Date().toISOString();
  saveSchools();

  return {
    message: 'Recruitment poster removed successfully.',
    school
  };
}

async function mockUpdateSchool(schoolId, body) {
  await delay(150);
  schools = getStoredSchools();
  const school = schools.find((s) => s.id === schoolId);
  if (!school) throw new Error('School/Faculty not found.');

  Object.assign(school, body);
  school.recruitmentPosterUrl = school.posterUrl;
  school.updatedAt = new Date().toISOString();
  saveSchools();

  return {
    message: 'School updated successfully.',
    school
  };
}

// ── MAIN DISPATCHER ───────────────────────────────────────────
export async function mockApiRequest(endpoint, options = {}) {
  const method = options.method || 'GET';
  const body = options.body instanceof FormData ? options.body : (options.body ? JSON.parse(options.body) : {});

  const [path, qs] = endpoint.split('?');
  const params = new URLSearchParams(qs || '');
  const parts = path.replace(/^\//, '').split('/');

  const storedUser = localStorage.getItem('user');
  if (storedUser && !currentUser) currentUser = JSON.parse(storedUser);

  // AUTH
  if (path === '/auth/login' && method === 'POST') return mockLogin(body);
  if (path === '/auth/register' && method === 'POST') return mockRegister(body);
  if (path === '/auth/me' && method === 'GET') return mockGetMe();
  if ((path === '/auth/send-otp' || path === '/applicant/auth/send-otp') && method === 'POST') {
    await delay();
    return { success: true, message: `Verification code sent to ${body.email || 'your email'}.`, demoOTP: '123456' };
  }
  if ((path === '/auth/verify-otp' || path === '/applicant/auth/verify-otp') && method === 'POST') {
    await delay();
    return { success: true, token: 'mock-jwt-token-verified', message: 'Email verified successfully.' };
  }

  // PUBLIC VACANCIES & STRUCTURE
  if ((path === '/public/vacancies' || path === '/jobs') && method === 'GET') return mockGetPublicVacancies(params);
  if ((parts[0] === 'public' && parts[1] === 'vacancies' && parts.length === 3) || (parts[0] === 'jobs' && parts.length === 2)) {
    if (method === 'GET') return mockGetVacancyById(parts[2] || parts[1]);
  }
  if ((path === '/public/schools' || path === '/admin/schools') && method === 'GET') {
    return mockGetSchools(params);
  }
  if (parts[0] === 'admin' && parts[1] === 'schools' && parts.length === 3 && method === 'PUT') {
    return mockUpdateSchool(parts[2], body);
  }
  if (parts[0] === 'admin' && parts[1] === 'schools' && parts[3] === 'poster') {
    if (method === 'POST') return mockUploadSchoolPoster(parts[2], options.body);
    if (method === 'DELETE') return mockDeleteSchoolPoster(parts[2]);
  }
  if (parts[1] === 'schools' && parts[3] === 'departments' && method === 'GET') {
    await delay();
    return DEPARTMENTS[parts[2]] || [];
  }
  if (parts[1] === 'departments' && parts[3] === 'positions' && method === 'GET') {
    await delay();
    return POSITIONS[parts[2]] || [];
  }
  if (path === '/public/vacancy-interest' && method === 'POST') {
    await delay();
    interests.unshift({ id: 'int-' + Date.now(), ...body, status: 'PENDING', createdAt: new Date().toISOString() });
    return { success: true, message: 'Interest registered successfully.' };
  }

  // ADMIN VACANCIES
  if (path === '/admin/vacancies' && method === 'GET') return mockGetAdminVacancies(params);
  if (path === '/admin/vacancies' && method === 'POST') return mockCreateJob(body);
  if (parts[0] === 'admin' && parts[1] === 'vacancies' && parts.length === 3 && method === 'GET') return mockGetVacancyById(parts[2]);
  if (parts[0] === 'admin' && parts[1] === 'vacancies' && parts.length === 3 && method === 'PUT') return mockUpdateJob(parts[2], body);
  if (parts[0] === 'admin' && parts[1] === 'vacancies' && parts[3] === 'status' && method === 'PATCH') return mockUpdateJobStatus(parts[2], body);
  if (parts[0] === 'admin' && parts[1] === 'vacancies' && parts[3] === 'notify-interested' && method === 'POST') {
    await delay();
    return { success: true, message: 'Notifications sent to interested candidates.', count: 0 };
  }
  if (path === '/admin/vacancy-interests' && method === 'GET') return mockGetVacancyInterests();

  // APPLICATIONS
  if (path === '/applications' && method === 'GET') return mockGetApplications(params);
  if (path === '/applications' && method === 'POST') return mockCreateDraft(body);
  if (path === '/applications/my' && method === 'GET') return mockGetMyApplications();
  if (path === '/applications/track' && method === 'GET') return mockTrackApplication(params);
  if (parts[0] === 'applications' && parts.length === 2 && method === 'GET') return mockGetApplicationById(parts[1]);
  if (parts[0] === 'applications' && parts.length === 2 && method === 'PUT') return mockUpdateDraft(parts[1], body);
  if (parts[0] === 'applications' && parts[2] === 'submit' && method === 'POST') return mockSubmitApplication(parts[1], body);
  if (parts[0] === 'applications' && (parts[2] === 'documents' || parts[2] === 'upload') && method === 'POST') return mockUploadDocument(parts[1], options.body);
  if (parts[0] === 'applications' && parts[2] === 'status' && method === 'PATCH') return mockUpdateStatus(parts[1], body);

  // INTERVIEWS & COMMITTEE
  if (path === '/interviews' && method === 'GET') return mockGetInterviews();
  if (path === '/interviews' && method === 'POST') return mockCreateInterview(body);
  if (parts[0] === 'interviews' && parts[2] === 'evaluation' && method === 'POST') return mockSubmitEvaluation();
  if (path === '/committee/assignments' && method === 'GET') return mockGetCommitteeAssignments();

  // ADMIN USERS & AUDIT
  if (path === '/admin/users' && method === 'GET') return mockGetUsers();
  if (path === '/admin/users' && method === 'POST') return mockCreateUser(body);
  if (parts[0] === 'admin' && parts[1] === 'users' && parts[3] === 'status' && method === 'PATCH') return mockUpdateUserStatus(parts[2], body);
  if (path === '/admin/audit-logs' && method === 'GET') return mockGetAuditLogs(params);

  // NOTIFICATIONS & REPORTS
  if (path === '/notifications' && method === 'GET') return mockGetNotifications();
  if (parts[0] === 'notifications' && parts[2] === 'read' && method === 'PATCH') return mockMarkRead(parts[1]);
  if (path === '/reports' && method === 'GET') return mockGetReports();

  throw new Error(`[Mock API] Unhandled: ${method} ${endpoint}`);
}
