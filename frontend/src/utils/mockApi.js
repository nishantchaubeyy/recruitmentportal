// ============================================================
// MOCK API HANDLER
// Simulates all backend API calls with local static data.
// Active when VITE_MOCK_API=true in frontend/.env.local
// ============================================================

import {
  MOCK_JOBS,
  MOCK_APPLICATIONS,
  MOCK_NOTIFICATIONS,
  MOCK_REPORTS,
  MOCK_USERS
} from './mockData';

// Simulate async network delay
const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize applications from localStorage or default to seed MOCK_APPLICATIONS
const getStoredApplications = () => {
  try {
    const stored = localStorage.getItem('MOCK_APPLICATIONS_PERSIST');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored applications:', e);
  }
  return JSON.parse(JSON.stringify(MOCK_APPLICATIONS));
};

let jobs = JSON.parse(JSON.stringify(MOCK_JOBS));
let applications = getStoredApplications();
let notifications = JSON.parse(JSON.stringify(MOCK_NOTIFICATIONS));

const saveApplications = () => {
  try {
    localStorage.setItem('MOCK_APPLICATIONS_PERSIST', JSON.stringify(applications));
  } catch (e) {
    console.error('Failed to persist applications to localStorage:', e);
  }
};

// Current mock session user (set on login)
let currentUser = null;
let currentToken = null;

// ── AUTH ──────────────────────────────────────────────────────
async function mockLogin(body) {
  await delay();
  const { email, password } = body;
  if (email === 'admin@dypiu.edu' && password === 'AdminPassword123') {
    currentUser = MOCK_USERS.admin;
  } else if (email === 'demo@applicant.com' && password === 'Demo@1234') {
    currentUser = MOCK_USERS.applicant;
  } else {
    throw new Error('Invalid email or password.');
  }
  currentToken = 'mock-token-' + currentUser.role;
  return { token: currentToken, user: currentUser, message: 'Login successful.' };
}

async function mockRegister(body) {
  await delay();
  const { name, email, mobile, password, confirmPassword } = body;
  if (!name || !email || !mobile || !password) throw new Error('All fields are mandatory.');
  if (password !== confirmPassword) throw new Error('Passwords do not match.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  currentUser = { id: 'user-new', email, role: 'APPLICANT', name };
  currentToken = 'mock-token-APPLICANT';
  return { token: currentToken, user: currentUser, message: 'Registration successful.' };
}

async function mockGetMe() {
  await delay();
  if (!currentUser) throw new Error('Not authenticated.');
  return { ...currentUser, profileDetails: {} };
}

// ── JOBS ──────────────────────────────────────────────────────
async function mockGetJobs(params) {
  await delay();
  let result = [...jobs];
  const isAdmin = currentUser?.role === 'ADMIN';
  if (!isAdmin || params.get('adminView') !== 'true') {
    result = result.filter(j => j.status === 'PUBLISHED');
  }
  if (params.get('type')) result = result.filter(j => j.type === params.get('type'));
  if (params.get('search')) {
    const s = params.get('search').toLowerCase();
    result = result.filter(j =>
      j.position.toLowerCase().includes(s) ||
      j.department.toLowerCase().includes(s)
    );
  }
  return result.map(j => ({ ...j, isApplicationOpen: j.status === 'PUBLISHED' }));
}

async function mockGetJobById(id) {
  await delay();
  const job = jobs.find(j => j.id === id);
  if (!job) throw new Error('Job opening not found.');
  return { ...job, isApplicationOpen: job.status === 'PUBLISHED' };
}

async function mockCreateJob(body) {
  await delay();
  const newJob = {
    ...body,
    id: 'job-' + Date.now(),
    numPositions: parseInt(body.numPositions) || 1,
    deadline: new Date(body.deadline).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  jobs.push(newJob);
  return { message: 'Job opening created successfully.', job: newJob };
}

async function mockUpdateJob(id, body) {
  await delay();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx === -1) throw new Error('Job not found.');
  jobs[idx] = { ...jobs[idx], ...body, updatedAt: new Date().toISOString() };
  return { message: 'Job updated.', job: jobs[idx] };
}

async function mockUpdateJobStatus(id, body) {
  await delay();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx === -1) throw new Error('Job not found.');
  jobs[idx].status = body.status;
  return { message: `Status changed to ${body.status}.`, job: jobs[idx] };
}

// ── APPLICATIONS ──────────────────────────────────────────────
async function mockGetApplications(params) {
  await delay();
  applications = getStoredApplications();
  if (currentUser?.role === 'APPLICANT') {
    return applications.filter(a => a.status !== 'DRAFT');
  }
  // Admin view
  let result = applications.filter(a => a.status !== 'DRAFT');
  if (params.get('jobId')) result = result.filter(a => a.jobId === params.get('jobId'));
  if (params.get('status')) result = result.filter(a => a.status === params.get('status'));
  if (params.get('type'))   result = result.filter(a => a.job?.type === params.get('type'));
  if (params.get('search')) {
    const s = params.get('search').toLowerCase();
    result = result.filter(a =>
      a.applicationNumber.toLowerCase().includes(s) ||
      a.applicant?.name?.toLowerCase().includes(s) ||
      a.job?.position?.toLowerCase().includes(s)
    );
  }
  return result;
}

async function mockGetApplicationById(id) {
  await delay();
  applications = getStoredApplications();
  const app = applications.find(a => a.id === id);
  if (!app) throw new Error('Application not found.');
  return app;
}

async function mockCreateDraft(body) {
  await delay();
  const applicantEmail = body.personalInfo?.email || currentUser?.email || 'applicant@example.com';
  const existing = applications.find(a => a.jobId === body.jobId && a.status === 'DRAFT' && a.applicant?.user?.email === applicantEmail);
  if (existing) return { message: 'Draft exists.', applicationId: existing.id, status: existing.status };

  const job = jobs.find(j => j.id === body.jobId) || jobs[0];

  const applicantName = body.personalInfo?.firstName 
    ? `${body.personalInfo.firstName} ${body.personalInfo.lastName || ''}`.trim()
    : (currentUser?.name || 'Applicant');

  const applicantMobile = body.contactDetails?.mobile || '';

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
    phdDetails: body.phdDetails || {},
    workExperience: body.workExperience || [],
    declaration: body.declaration || false,
    applicant: { 
      name: applicantName, 
      mobile: applicantMobile, 
      user: { email: applicantEmail } 
    },
    documents: body.documents || [
      { id: 'doc-resume', documentType: 'resume', originalName: 'CV_Resume.pdf', fileSize: 150000, uploadedAt: new Date().toISOString() }
    ],
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
  const idx = applications.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Application not found.');
  applications[idx] = { ...applications[idx], ...body, updatedAt: new Date().toISOString() };
  saveApplications();
  return { message: 'Draft saved.', application: applications[idx] };
}

async function mockSubmitApplication(id, body = {}) {
  await delay();
  const idx = applications.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Application not found.');

  if (body.personalInfo) applications[idx].personalInfo = body.personalInfo;
  if (body.contactDetails) applications[idx].contactDetails = body.contactDetails;
  if (body.qualifications) applications[idx].qualifications = body.qualifications;
  if (body.workExperience) applications[idx].workExperience = body.workExperience;

  const fullName = body.personalInfo?.firstName 
    ? `${body.personalInfo.firstName} ${body.personalInfo.lastName || ''}`.trim()
    : (applications[idx].applicant?.name || 'Applicant');

  applications[idx].applicant = {
    name: fullName,
    mobile: body.contactDetails?.mobile || applications[idx].contactDetails?.mobile || '',
    user: { email: body.personalInfo?.email || applications[idx].personalInfo?.email || '' }
  };

  const year = new Date().getFullYear();
  const submittedAppsCount = applications.filter(a => a.status !== 'DRAFT').length;
  const num = String(submittedAppsCount + 1).padStart(6, '0');
  const appNumber = `APP-${year}-${num}`;

  applications[idx].applicationNumber = appNumber;
  applications[idx].status = 'Application Submitted';
  applications[idx].createdAt = new Date().toISOString();
  applications[idx].updatedAt = new Date().toISOString();
  applications[idx].statusHistory = [
    { newStatus: 'Application Submitted', changedAt: new Date().toISOString(), comment: 'Application submitted by candidate.' }
  ];

  // System Notification
  notifications.unshift({
    id: 'notif-' + Date.now(),
    content: `New application (${appNumber}) received for "${applications[idx].job?.position || 'Vacancy'}" by ${fullName}.`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveApplications();

  return { message: 'Submitted successfully.', applicationNumber: appNumber, status: 'Application Submitted' };
}

async function mockUploadDocument(id, formData) {
  await delay(300);
  const idx = applications.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Application not found.');
  const docType = formData.get('documentType');
  const file = formData.get('file');
  // Remove previous doc of same type
  applications[idx].documents = applications[idx].documents.filter(d => d.documentType !== docType);
  const doc = {
    id: 'doc-' + Date.now(),
    documentType: docType,
    originalName: file?.name || 'document.pdf',
    fileSize: file?.size || 100000,
    uploadedAt: new Date().toISOString()
  };
  applications[idx].documents.push(doc);
  return { message: 'File uploaded.', document: doc };
}

async function mockUpdateStatus(id, body) {
  await delay();
  const idx = applications.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Application not found.');
  const prev = applications[idx].status;
  applications[idx].status = body.status;
  applications[idx].statusHistory.unshift({
    newStatus: body.status,
    previousStatus: prev,
    changedAt: new Date().toISOString(),
    comment: body.comment || `Status changed to "${body.status}".`
  });
  notifications.push({
    id: 'notif-' + Date.now(),
    content: `Status of application ${applications[idx].applicationNumber} changed to: ${body.status}.`,
    isRead: false,
    createdAt: new Date().toISOString()
  });
  saveApplications();
  return { message: 'Status updated.', application: applications[idx] };
}

async function mockTrackApplication(params) {
  await delay();
  const num = params.get('applicationNumber');
  const app = applications.find(a => a.applicationNumber === num);
  if (!app) throw new Error('No application found with the provided number.');
  return {
    applicationNumber: app.applicationNumber,
    position: app.job.position,
    department: app.job.department,
    appliedDate: app.createdAt,
    status: app.status,
    history: app.statusHistory
  };
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
async function mockGetNotifications() {
  await delay();
  return notifications;
}

async function mockMarkRead(id) {
  await delay();
  const idx = notifications.findIndex(n => n.id === id);
  if (idx !== -1) notifications[idx].isRead = true;
  return { message: 'Marked as read.', notification: notifications[idx] };
}

// ── REPORTS ───────────────────────────────────────────────────
async function mockGetReports() {
  await delay();
  return jobs.map(job => ({
    jobId: job.id,
    position: job.position,
    type: job.type,
    department: job.department,
    postedDate: job.createdAt,
    totalApplications: applications.filter(a => a.jobId === job.id && a.status !== 'DRAFT').length,
    shortlisted: applications.filter(a => a.jobId === job.id && ['Shortlisted', 'Interview Scheduled', 'Selected'].includes(a.status)).length,
    rejected: applications.filter(a => a.jobId === job.id && ['Not Selected', 'Application Closed'].includes(a.status)).length,
    underReview: applications.filter(a => a.jobId === job.id && ['Under Review', 'Application Submitted'].includes(a.status)).length
  }));
}

// ── MAIN DISPATCHER ───────────────────────────────────────────
export async function mockApiRequest(endpoint, options = {}) {
  const method = options.method || 'GET';
  const body = options.body instanceof FormData
    ? options.body
    : (options.body ? JSON.parse(options.body) : {});

  // Parse path + query string
  const [path, qs] = endpoint.split('?');
  const params = new URLSearchParams(qs || '');
  const parts = path.replace(/^\//, '').split('/'); // e.g. ['jobs','job-001','status']

  // Restore session from localStorage on each call
  const storedUser = localStorage.getItem('user');
  if (storedUser && !currentUser) currentUser = JSON.parse(storedUser);

  // ── AUTH
  if (path === '/auth/login' && method === 'POST') return mockLogin(body);
  if (path === '/auth/register' && method === 'POST') return mockRegister(body);
  if (path === '/auth/me' && method === 'GET') return mockGetMe();

  // ── PUBLIC & JOBS
  if ((path === '/public/vacancies' || path === '/jobs') && method === 'GET') return mockGetJobs(params);
  if (((parts[0] === 'public' && parts[1] === 'vacancies' && parts.length === 3) || (parts[0] === 'jobs' && parts.length === 2)) && method === 'GET') return mockGetJobById(parts[2] || parts[1]);
  if (path === '/public/schools' && method === 'GET') {
    await delay();
    const type = params.get('type');
    const schoolsList = [
      { id: 'sch-1', name: 'School of Computing', type: 'TEACHING' },
      { id: 'sch-2', name: 'School of Engineering', type: 'TEACHING' },
      { id: 'sch-3', name: 'Administration & Staff', type: 'NON_TEACHING' }
    ];
    return type ? schoolsList.filter(s => s.type === type) : schoolsList;
  }
  if (path === '/public/vacancy-interest' && method === 'POST') {
    await delay();
    return { message: 'Interest registered successfully.' };
  }
  if (path === '/jobs' && method === 'POST') return mockCreateJob(body);
  if (parts[0] === 'jobs' && parts.length === 2 && method === 'PUT') return mockUpdateJob(parts[1], body);
  if (parts[0] === 'jobs' && parts[2] === 'status' && method === 'PATCH') return mockUpdateJobStatus(parts[1], body);

  // ── APPLICATIONS
  if (path === '/applications' && method === 'GET') return mockGetApplications(params);
  if (path === '/applications' && method === 'POST') return mockCreateDraft(body);
  if (path === '/applications/track' && method === 'GET') return mockTrackApplication(params);
  if (parts[0] === 'applications' && parts.length === 2 && method === 'GET') return mockGetApplicationById(parts[1]);
  if (parts[0] === 'applications' && parts.length === 2 && method === 'PUT') return mockUpdateDraft(parts[1], body);
  if (parts[0] === 'applications' && parts[2] === 'submit' && method === 'POST') return mockSubmitApplication(parts[1], body);
  if (parts[0] === 'applications' && parts[2] === 'upload' && method === 'POST') return mockUploadDocument(parts[1], options.body);
  if (parts[0] === 'applications' && parts[2] === 'status' && method === 'PATCH') return mockUpdateStatus(parts[1], body);

  // ── NOTIFICATIONS
  if (path === '/notifications' && method === 'GET') return mockGetNotifications();
  if (parts[0] === 'notifications' && parts[2] === 'read' && method === 'PATCH') return mockMarkRead(parts[1]);

  // ── REPORTS
  if (path === '/reports' && method === 'GET') return mockGetReports();

  throw new Error(`[Mock API] Unhandled: ${method} ${endpoint}`);
}
