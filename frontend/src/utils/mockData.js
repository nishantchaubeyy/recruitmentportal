// ============================================================
// MOCK DATA — Used when VITE_MOCK_API=true (no backend needed)
// Remove VITE_MOCK_API from .env.local when connecting to server
// ============================================================

export const MOCK_JOBS = [
  {
    id: 'job-001',
    position: 'Assistant Professor - Computer Science',
    type: 'TEACHING',
    department: 'School of Computing',
    numPositions: 3,
    qualification: 'Ph.D. in Computer Science or Engineering with first class or equivalent in Bachelor or Master degree.',
    experience: '2 to 5 years of teaching or industry research experience.',
    skills: 'Python, Machine Learning, Web Technologies, Database Systems',
    description: 'Responsible for teaching undergraduate and graduate courses, guiding research projects, and contributing to school administration activities.',
    salaryScale: 'As per 7th Pay Commission scale',
    location: 'Pune Campus',
    deadline: '2026-09-30T18:30:00.000Z',
    requiredDocuments: 'CV/Resume, PG Degree Certificate, Ph.D. Degree / Award letter, Experience Certificates',
    eligibilityCriteria: 'Ph.D. mandatory. NET/SET preferred. Minimum 2 research publications in Scopus indexed journals.',
    status: 'PUBLISHED',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z'
  },
  {
    id: 'job-002',
    position: 'Associate Professor - Mechanical Engineering',
    type: 'TEACHING',
    department: 'School of Engineering',
    numPositions: 1,
    qualification: 'Ph.D. in Mechanical Engineering or related field with a good academic record throughout.',
    experience: 'Minimum 8 years of teaching/research/industrial experience.',
    skills: 'CAD/CAM, Robotics, Finite Element Analysis, Thermodynamics',
    description: 'Engage in academic lectures, curriculum review, lab planning, and mentoring junior faculty members.',
    salaryScale: 'As per 7th Pay Scale guidelines',
    location: 'Pune Campus',
    deadline: '2026-10-15T18:30:00.000Z',
    requiredDocuments: 'CV, Educational certificates, Experience certificates, Research summaries',
    eligibilityCriteria: 'Ph.D. is essential. Minimum 6 publications in reputed indexed journals.',
    status: 'PUBLISHED',
    createdAt: '2026-08-05T10:00:00.000Z',
    updatedAt: '2026-08-05T10:00:00.000Z'
  },
  {
    id: 'job-003',
    position: 'Registrar / Section Officer',
    type: 'NON_TEACHING',
    department: 'Administration',
    numPositions: 1,
    qualification: 'Master Degree with at least 55% marks or its equivalent grade.',
    experience: 'At least 5 years of administrative experience as Assistant Registrar or equivalent.',
    skills: 'University administration, File management, Legal documentation, Academic coordination',
    description: 'Supervision and management of academic files, coordinates meetings of the management council, and oversees daily administration.',
    salaryScale: 'Consolidated Rs. 60,000 - 80,000 per month',
    location: 'Pune Campus',
    deadline: '2026-09-15T18:30:00.000Z',
    requiredDocuments: 'Resume, PG degree passing certificate, Experience letters, ID proofs',
    eligibilityCriteria: 'Excellent verbal and written communication skills. Administrative experience in UGC recognized universities.',
    status: 'PUBLISHED',
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-10T10:00:00.000Z'
  },
  {
    id: 'job-004',
    position: 'Systems Administrator',
    type: 'NON_TEACHING',
    department: 'IT Infrastructure Services',
    numPositions: 1,
    qualification: 'Bachelor in Computer Engineering / MCA / MSc IT.',
    experience: '3+ years of experience managing college or campus networks.',
    skills: 'Linux Server, Firewall setup, Active Directory, Network switches, G-Suite admin',
    description: 'Overseeing server configurations, ensuring internet availability, resolving desktop issues, and monitoring CCTV/WiFi hardware.',
    salaryScale: 'Rs. 40,000 - 50,000 per month based on experience',
    location: 'Pune Campus',
    deadline: '2026-11-01T18:30:00.000Z',
    requiredDocuments: 'Resume, Degree Certificate, Professional IT Certifications, Experience letters',
    eligibilityCriteria: 'CCNA or RedHat certifications preferred.',
    status: 'PUBLISHED',
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-08-15T10:00:00.000Z'
  }
];

export const MOCK_APPLICATIONS = [
  {
    id: 'app-001',
    applicationNumber: 'APP-2026-000001',
    jobId: 'job-001',
    applicantId: 'applicant-001',
    status: 'Under Review',
    declaration: true,
    personalInfo: {
      title: 'Dr.',
      firstName: 'Priya',
      middleName: '',
      lastName: 'Sharma',
      dob: '1990-03-15',
      age: '36 Yrs',
      gender: 'Female',
      maritalStatus: 'Married',
      email: 'priya.sharma@example.com',
      alternateEmail: ''
    },
    contactDetails: {
      state: 'Maharashtra',
      city: 'Pune',
      mobile: '9876543210',
      alternateMobile: ''
    },
    qualifications: [
      { qualificationDegree: "Bachelor's", degreeName: 'B.E. Computer Engineering', instituteName: 'Pune University', specialization: 'Computer Engineering', passingYear: '2012', percentage: '82%', studyMode: 'Full-Time' },
      { qualificationDegree: "Master's", degreeName: 'M.E. Computer Science', instituteName: 'COEP', specialization: 'Artificial Intelligence', passingYear: '2014', percentage: '79%', studyMode: 'Full-Time' },
      { qualificationDegree: 'Ph.D.', degreeName: 'Ph.D. Computer Science', instituteName: 'IIT Bombay', specialization: 'Machine Learning', passingYear: '2019', percentage: '9.1 CGPA', studyMode: 'Full-Time' }
    ],
    experience: [
      { organization: 'Symbiosis Institute of Technology', experienceType: 'Teaching', designation: 'Assistant Professor', fromDate: '2019-08-01', toDate: '', isCurrent: true, salary: 'Rs. 9,00,000 p.a.', noticePeriod: '60 Days' }
    ],
    researchDetails: {
      phdStatus: 'Awarded',
      phdUniversity: 'IIT Bombay',
      phdYear: '2019',
      researchArea: 'Machine Learning, Deep Neural Networks',
      publicationsCount: '14',
      scopusCount: '8',
      webOfScienceCount: '5',
      scopusId: '57218392100',
      researchProfileUrl: 'https://scholar.google.com/priya-sharma',
      netCleared: true,
      netYear: '2014',
      setCleared: false,
      sletCleared: false,
      gateCleared: true,
      gateYear: '2012'
    },
    skillsCertificates: {
      skills: 'Python, TensorFlow, PyTorch, R, Scikit-Learn, SQL, LaTeX',
      certifications: 'Deep Learning Specialization - Coursera (2020), AWS Machine Learning - Amazon (2021)'
    },
    references: [
      { refName: 'Prof. Rajesh Kumar', refDesignation: 'Professor & HOD', refOrganization: 'IIT Bombay', refEmail: 'rajesh@iitb.ac.in', refPhone: '9112233445' }
    ],
    documents: [
      { id: 'doc-001', documentType: 'resume', originalName: 'Priya_Sharma_CV.pdf', fileSize: 512000, uploadedAt: '2026-08-20T10:00:00.000Z' },
      { id: 'doc-002', documentType: 'qualification', originalName: 'PhD_Certificate.pdf', fileSize: 256000, uploadedAt: '2026-08-20T10:05:00.000Z' }
    ],
    statusHistory: [
      { newStatus: 'Application Submitted', changedAt: '2026-08-20T10:30:00.000Z', comment: 'Application submitted by candidate.' },
      { newStatus: 'Under Review', changedAt: '2026-08-22T09:00:00.000Z', comment: 'Profile reviewed. Strong publication record. Moving to under review.' }
    ],
    job: { id: 'job-001', position: 'Assistant Professor - Computer Science', department: 'School of Computing', type: 'TEACHING' },
    applicant: { name: 'Priya Sharma', mobile: '9876543210', user: { email: 'priya.sharma@example.com' } },
    createdAt: '2026-08-20T10:30:00.000Z',
    updatedAt: '2026-08-22T09:00:00.000Z'
  },
  {
    id: 'app-002',
    applicationNumber: 'APP-2026-000002',
    jobId: 'job-003',
    applicantId: 'applicant-002',
    status: 'Application Submitted',
    declaration: true,
    personalInfo: { title: 'Mr.', firstName: 'Amit', middleName: 'R.', lastName: 'Desai', dob: '1985-07-22', age: '41 Yrs', gender: 'Male', maritalStatus: 'Married', email: 'amit.desai@example.com', alternateEmail: '' },
    contactDetails: { state: 'Maharashtra', city: 'Mumbai', mobile: '9823456789', alternateMobile: '' },
    qualifications: [
      { qualificationDegree: "Master's", degreeName: 'M.Com', instituteName: 'Mumbai University', specialization: 'Finance & Administration', passingYear: '2009', percentage: '71%', studyMode: 'Full-Time' }
    ],
    experience: [
      { organization: 'University of Mumbai', experienceType: 'Industry', designation: 'Deputy Registrar', fromDate: '2010-06-01', toDate: '', isCurrent: true, salary: 'Rs. 7,50,000 p.a.', noticePeriod: '90 Days' }
    ],
    researchDetails: null,
    skillsCertificates: { skills: 'University administration, MS Office, DMS software', certifications: '' },
    references: [],
    documents: [
      { id: 'doc-003', documentType: 'resume', originalName: 'Amit_Desai_Resume.pdf', fileSize: 345000, uploadedAt: '2026-08-21T14:00:00.000Z' }
    ],
    statusHistory: [
      { newStatus: 'Application Submitted', changedAt: '2026-08-21T14:30:00.000Z', comment: 'Application submitted by candidate.' }
    ],
    job: { id: 'job-003', position: 'Registrar / Section Officer', department: 'Administration', type: 'NON_TEACHING' },
    applicant: { name: 'Amit Desai', mobile: '9823456789', user: { email: 'amit.desai@example.com' } },
    createdAt: '2026-08-21T14:30:00.000Z',
    updatedAt: '2026-08-21T14:30:00.000Z'
  },
  {
    id: 'app-003',
    applicationNumber: 'APP-2026-000003',
    jobId: 'job-002',
    applicantId: 'applicant-003',
    status: 'Shortlisted',
    declaration: true,
    personalInfo: { title: 'Dr.', firstName: 'Sneha', middleName: 'M.', lastName: 'Kulkarni', dob: '1988-11-05', age: '37 Yrs', gender: 'Female', maritalStatus: 'Married', email: 'sneha.kulkarni@example.com', alternateEmail: '' },
    contactDetails: { state: 'Maharashtra', city: 'Pune', mobile: '9765432109', alternateMobile: '' },
    qualifications: [
      { qualificationDegree: "Master's", degreeName: 'MBA Marketing', instituteName: 'NMIMS Mumbai', specialization: 'Marketing Management', passingYear: '2010', percentage: '78%', studyMode: 'Full-Time' },
      { qualificationDegree: 'Ph.D.', degreeName: 'Ph.D. Management', instituteName: 'IIM Ahmedabad', specialization: 'Consumer Behaviour', passingYear: '2016', percentage: '3.8 CGPA', studyMode: 'Full-Time' }
    ],
    experience: [
      { organization: 'MIT World Peace University', experienceType: 'Teaching', designation: 'Associate Professor', fromDate: '2016-07-01', toDate: '', isCurrent: true, salary: 'Rs. 12,00,000 p.a.', noticePeriod: '30 Days' }
    ],
    researchDetails: { phdStatus: 'Awarded', phdUniversity: 'IIM Ahmedabad', phdYear: '2016', researchArea: 'Consumer Psychology, Brand Strategy', publicationsCount: '18', scopusCount: '10', netCleared: true, netYear: '2010' },
    skillsCertificates: { skills: 'SPSS, AMOS, Brand Strategy, Market Research', certifications: 'Google Digital Marketing' },
    references: [],
    documents: [
      { id: 'doc-004', documentType: 'resume', originalName: 'Sneha_Kulkarni_Dossier.pdf', fileSize: 410000, uploadedAt: '2026-08-22T11:00:00.000Z' }
    ],
    statusHistory: [
      { newStatus: 'Application Submitted', changedAt: '2026-08-22T11:00:00.000Z', comment: 'Application submitted.' },
      { newStatus: 'Shortlisted', changedAt: '2026-08-24T16:00:00.000Z', comment: 'Shortlisted for management faculty interview.' }
    ],
    job: { id: 'job-002', position: 'Associate Professor - Management', department: 'School of Management', type: 'TEACHING' },
    applicant: { name: 'Dr. Sneha Kulkarni', mobile: '9765432109', user: { email: 'sneha.kulkarni@example.com' } },
    createdAt: '2026-08-22T11:00:00.000Z',
    updatedAt: '2026-08-24T16:00:00.000Z'
  },
  {
    id: 'app-004',
    applicationNumber: 'APP-2026-000004',
    jobId: 'job-004',
    applicantId: 'applicant-004',
    status: 'Interview Scheduled',
    declaration: true,
    personalInfo: { title: 'Mr.', firstName: 'Rajesh', middleName: '', lastName: 'Verma', dob: '1993-04-18', age: '33 Yrs', gender: 'Male', maritalStatus: 'Single', email: 'rajesh.verma@example.com', alternateEmail: '' },
    contactDetails: { state: 'Maharashtra', city: 'Pune', mobile: '9988776655', alternateMobile: '' },
    qualifications: [
      { qualificationDegree: "Bachelor's", degreeName: 'B.Tech Information Technology', instituteName: 'VJTI Mumbai', specialization: 'Network Security & Systems', passingYear: '2015', percentage: '76%', studyMode: 'Full-Time' }
    ],
    experience: [
      { organization: 'Tech Mahindra', experienceType: 'Industry', designation: 'Senior System Engineer', fromDate: '2015-07-01', toDate: '2026-08-01', isCurrent: false, salary: 'Rs. 8,50,000 p.a.', noticePeriod: 'Immediate' }
    ],
    researchDetails: null,
    skillsCertificates: { skills: 'Linux, RedHat, CCNA, AWS, Docker, Kubernetes', certifications: 'RHCE (RedHat Certified Engineer), Cisco CCNA' },
    references: [],
    documents: [
      { id: 'doc-005', documentType: 'resume', originalName: 'Rajesh_Verma_Resume.pdf', fileSize: 290000, uploadedAt: '2026-08-23T09:30:00.000Z' }
    ],
    statusHistory: [
      { newStatus: 'Application Submitted', changedAt: '2026-08-23T09:30:00.000Z', comment: 'Application received.' },
      { newStatus: 'Interview Scheduled', changedAt: '2026-08-25T14:20:00.000Z', comment: 'Interview scheduled for IT System Admin role.' }
    ],
    job: { id: 'job-004', position: 'Systems Administrator', department: 'Systems & IT Infrastructure', type: 'NON_TEACHING' },
    applicant: { name: 'Rajesh Verma', mobile: '9988776655', user: { email: 'rajesh.verma@example.com' } },
    createdAt: '2026-08-23T09:30:00.000Z',
    updatedAt: '2026-08-25T14:20:00.000Z'
  }
];

export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-001',
    content: 'Your application APP-2026-000001 for "Assistant Professor - Computer Science" has been updated to: Under Review.',
    isRead: false,
    createdAt: '2026-08-22T09:00:00.000Z'
  }
];

export const MOCK_REPORTS = MOCK_JOBS.map(job => ({
  jobId: job.id,
  position: job.position,
  type: job.type,
  department: job.department,
  postedDate: job.createdAt,
  totalApplications: MOCK_APPLICATIONS.filter(a => a.jobId === job.id).length,
  shortlisted: MOCK_APPLICATIONS.filter(a => a.jobId === job.id && ['Shortlisted', 'Interview Scheduled', 'Selected'].includes(a.status)).length,
  rejected: MOCK_APPLICATIONS.filter(a => a.jobId === job.id && ['Not Selected', 'Application Closed'].includes(a.status)).length,
  underReview: MOCK_APPLICATIONS.filter(a => a.jobId === job.id && ['Under Review', 'Application Submitted'].includes(a.status)).length
}));

export const MOCK_USERS = {
  applicant: { id: 'user-001', email: 'demo@applicant.com', role: 'APPLICANT', name: 'Demo Applicant' },
  admin:     { id: 'user-admin', email: 'admin@dypiu.edu',   role: 'ADMIN',     name: 'HR Administrator' }
};
