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

// In-memory mutable state (so actions like status change feel real during the session)
let jobs = JSON.parse(JSON.stringify(MOCK_JOBS));
let applications = JSON.parse(JSON.stringify(MOCK_APPLICATIONS));
let notifications = JSON.parse(JSON.stringify(MOCK_NOTIFICATIONS));

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
  return result;
}

async function mockGetJobById(id) {
  await delay();
  const job = jobs.find(j => j.id === id);
  if (!job) throw new Error('Job opening not found.');
  return job;
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
  const app = applications.find(a => a.id === id);
  if (!app) throw new Error('Application not found.');
  return app;
}

async function mockCreateDraft(body) {
  await delay();
  const existing = applications.find(a => a.jobId === body.jobId && a.status !== 'DRAFT');
  if (existing) return { message: 'Application already exists.', applicationId: existing.id, status: existing.status };
  const job = jobs.find(j => j.id === body.jobId);
  if (!job) throw new Error('Job not found.');
  const newApp = {
    id: 'app-draft-' + Date.now(),
    applicationNumber: 'DRAFT-' + Date.now(),
    jobId: body.jobId,
    applicantId: 'applicant-current',
    status: 'DRAFT',
    job,
    applicant: { name: currentUser?.name || 'Demo Applicant', mobile: '', user: { email: currentUser?.email || '' } },
    documents: [],
    statusHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  applications.push(newApp);
  return { message: 'Draft initialized.', applicationId: newApp.id };
}

async function mockUpdateDraft(id, body) {
  await delay();
  const idx = applications.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Application not found.');
  applications[idx] = { ...applications[idx], ...body, updatedAt: new Date().toISOString() };
  return { message: 'Draft saved.', application: applications[idx] };
}

async function mockSubmitApplication(id) {
  await delay();
  const idx = applications.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Application not found.');
  const app = applications[idx];

  if (!app.personalInfo?.firstName) throw new Error('Personal Information is incomplete.');
  if (!app.contactDetails?.mobile) throw new Error('Contact Details are incomplete.');
  if (!app.qualifications?.length) throw new Error('At least one academic qualification is required.');
  if (!app.declaration) throw new Error('You must accept the declaration before submitting.');
  const hasCV = app.documents.some(d => d.documentType === 'resume');
  if (!hasCV) throw new Error('CV / Resume upload is required before submitting.');

  const year = new Date().getFullYear();
  const num = String(applications.filter(a => a.status !== 'DRAFT').length + 1).padStart(6, '0');
  const appNumber = `APP-${year}-${num}`;

  applications[idx].applicationNumber = appNumber;
  applications[idx].status = 'Application Submitted';
  applications[idx].statusHistory = [
    { newStatus: 'Application Submitted', changedAt: new Date().toISOString(), comment: 'Application submitted by candidate.' }
  ];

  // Add notification
  notifications.push({
    id: 'notif-' + Date.now(),
    content: `Your application (${appNumber}) for "${app.job.position}" has been submitted successfully.`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  return { message: 'Submitted.', applicationNumber: appNumber, status: 'Application Submitted' };
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

  // ── JOBS
  if (path === '/jobs' && method === 'GET') return mockGetJobs(params);
  if (parts[0] === 'jobs' && parts.length === 2 && method === 'GET') return mockGetJobById(parts[1]);
  if (path === '/jobs' && method === 'POST') return mockCreateJob(body);
  if (parts[0] === 'jobs' && parts.length === 2 && method === 'PUT') return mockUpdateJob(parts[1], body);
  if (parts[0] === 'jobs' && parts[2] === 'status' && method === 'PATCH') return mockUpdateJobStatus(parts[1], body);

  // ── APPLICATIONS
  if (path === '/applications' && method === 'GET') return mockGetApplications(params);
  if (path === '/applications' && method === 'POST') return mockCreateDraft(body);
  if (path === '/applications/track' && method === 'GET') return mockTrackApplication(params);
  if (parts[0] === 'applications' && parts.length === 2 && method === 'GET') return mockGetApplicationById(parts[1]);
  if (parts[0] === 'applications' && parts.length === 2 && method === 'PUT') return mockUpdateDraft(parts[1], body);
  if (parts[0] === 'applications' && parts[2] === 'submit' && method === 'POST') return mockSubmitApplication(parts[1]);
  if (parts[0] === 'applications' && parts[2] === 'upload' && method === 'POST') return mockUploadDocument(parts[1], options.body);
  if (parts[0] === 'applications' && parts[2] === 'status' && method === 'PATCH') return mockUpdateStatus(parts[1], body);

  // ── NOTIFICATIONS
  if (path === '/notifications' && method === 'GET') return mockGetNotifications();
  if (parts[0] === 'notifications' && parts[2] === 'read' && method === 'PATCH') return mockMarkRead(parts[1]);

  // ── REPORTS
  if (path === '/reports' && method === 'GET') return mockGetReports();

  throw new Error(`[Mock API] Unhandled: ${method} ${endpoint}`);
}
