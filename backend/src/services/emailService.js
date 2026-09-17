const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const prisma = require('./prisma');

/**
 * ZeptoMail & Standard SMTP Configuration
 * Priority given to ZEPTOMAIL_* environment variables as specified.
 */
function getEmailConfig() {
  const host = process.env.ZEPTOMAIL_HOST || process.env.SMTP_HOST || '';
  const port = parseInt(process.env.ZEPTOMAIL_PORT || process.env.SMTP_PORT || '587', 10);
  const username = process.env.ZEPTOMAIL_USERNAME || process.env.SMTP_USER || '';
  const password = process.env.ZEPTOMAIL_PASSWORD || process.env.SMTP_PASS || '';
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL || process.env.EMAIL_FROM_ADDRESS || 'careers@dypiu.ac.in';
  const fromName = process.env.ZEPTOMAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Recruitment Cell - DYPIU';

  const fromString = `"${fromName}" <${fromEmail}>`;

  return { host, port, username, password, fromEmail, fromName, fromString };
}

function createTransporter() {
  const config = getEmailConfig();
  if (config.host && config.username && config.password) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.username,
        pass: config.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return null;
}

/**
 * Generic email dispatcher abstraction.
 */
async function sendEmail({ to, subject, html, text }) {
  const config = getEmailConfig();
  const transporter = createTransporter();

  // Save HTML preview file locally for easy inspection during testing
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, 'last_application_email.html'), html, 'utf8');
  } catch (err) {
    // Non-fatal preview saving error ignored
  }

  if (!transporter) {
    console.log(`\n==================================================`);
    console.log(`[ZeptoMail Test Mode] Mail dispatch simulation for: ${to}`);
    console.log(`[ZeptoMail Test Mode] From: ${config.fromString}`);
    console.log(`[ZeptoMail Test Mode] Subject: ${subject}`);
    console.log(`[ZeptoMail Test Mode] HTML Email Preview saved at: backend/uploads/last_application_email.html`);
    console.log(`Confirmation email sent successfully. (TEST MODE)`);
    console.log(`==================================================\n`);
    return { success: true, mode: 'test_simulation' };
  }

  try {
    const info = await transporter.sendMail({
      from: config.fromString,
      to,
      subject,
      text,
      html
    });
    console.log(`Confirmation email sent successfully. (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Confirmation email failed. Reason: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Safely parse JSON strings or return objects.
 */
function safeParseJSON(input) {
  if (!input) return {};
  if (typeof input === 'object') return input;
  try {
    return JSON.parse(input);
  } catch (e) {
    return {};
  }
}

/**
 * Safely parse JSON array strings or return arrays.
 */
function safeParseArray(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Helper to extract applicant recipient email.
 */
function getApplicantRecipientEmail(app) {
  const contact = safeParseJSON(app.contactDetails);
  const personal = safeParseJSON(app.personalInfo);
  const email = contact.email || personal.email || app.applicant?.user?.email || app.applicant?.email || '';
  return email.trim().toLowerCase();
}

/**
 * Helper to extract applicant display name.
 */
function getApplicantDisplayName(app) {
  const personal = safeParseJSON(app.personalInfo);
  const contact = safeParseJSON(app.contactDetails);

  if (personal.fullName) return personal.fullName.trim();
  if (personal.firstName || personal.lastName) {
    return `${personal.firstName || ''} ${personal.lastName || ''}`.trim();
  }
  if (contact.name) return contact.name.trim();
  if (contact.fullName) return contact.fullName.trim();
  if (app.applicant?.name) return app.applicant.name.trim();

  return 'Applicant';
}

/**
 * Helper to format date cleanly (e.g. 17 September 2026).
 */
function formatDate(dateInput) {
  if (!dateInput) return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Generates the complete official Application Form Dossier HTML for the confirmation email.
 */
function buildApplicationFormDossierHtml(app) {
  const personal = safeParseJSON(app.personalInfo);
  const contact = safeParseJSON(app.contactDetails);
  const qualifications = safeParseArray(app.qualifications);
  const experience = safeParseArray(app.experience || app.workExperience);
  const research = safeParseJSON(app.researchDetails || app.phdDetails);

  const applicantName = getApplicantDisplayName(app);
  const postName = app.job?.position || personal.postAppliedFor || 'Faculty Position';
  const schoolName = app.job?.school?.name || app.job?.department || personal.faculty || 'D Y Patil International University';
  const schoolOrDept = app.job?.department || app.job?.school?.name || 'School of Computing';
  const appNumber = app.applicationNumber || app.id;
  const formattedDate = formatDate(app.submittedAt || app.createdAt);

  const candidateEmail = contact.email || personal.email || app.applicant?.user?.email || 'N/A';
  const candidateMobile = contact.mobile || personal.mobile || app.applicant?.mobile || 'N/A';

  const formatBirthDate = (rawDob) => {
    if (!rawDob) return 'N/A';
    try {
      const d = new Date(rawDob);
      if (isNaN(d.getTime())) return rawDob;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return rawDob;
    }
  };

  // Generate HTML table for Qualifications
  let qualRows = '';
  if (qualifications.length === 0) {
    qualRows = `<tr><td colspan="6" style="padding: 8px; color: #64748b; font-style: italic; font-size: 12px;">No formal qualifications recorded.</td></tr>`;
  } else {
    qualRows = qualifications.map(q => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 8px; font-weight: 600;">${q.qualificationDegree || q.degreeLevel || 'Graduation'}</td>
        <td style="padding: 6px 8px;">${q.degreeName || 'N/A'}</td>
        <td style="padding: 6px 8px;">${q.instituteName || q.university || 'N/A'}</td>
        <td style="padding: 6px 8px;">${q.specialization || 'General'}</td>
        <td style="padding: 6px 8px; text-align: center;">${q.passingYear || q.year || 'N/A'}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: bold;">${q.cgpa || q.percentage || 'N/A'}</td>
      </tr>
    `).join('');
  }

  // Generate HTML table for Experience
  let expRows = '';
  if (experience.length === 0) {
    expRows = `<tr><td colspan="7" style="padding: 8px; color: #64748b; font-style: italic; font-size: 12px;">Fresher Submission — No prior formal professional experience recorded.</td></tr>`;
  } else {
    expRows = experience.map(e => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 8px; font-weight: bold;">${e.organization || 'N/A'}</td>
        <td style="padding: 6px 8px;">${e.designation || 'N/A'}</td>
        <td style="padding: 6px 8px;">${e.type || e.experienceType || 'Full-Time'}</td>
        <td style="padding: 6px 8px;">${e.fromDate || 'N/A'}</td>
        <td style="padding: 6px 8px;">${e.isCurrent ? 'Present' : (e.toDate || 'N/A')}</td>
        <td style="padding: 6px 8px;">${e.salary || '—'}</td>
        <td style="padding: 6px 8px;">${e.noticePeriod || '—'}</td>
      </tr>
    `).join('');
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Application Received – ${postName} | D Y Patil International University</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif; color: #1e293b; line-height: 1.5;">
  <div style="max-width: 680px; margin: 20px auto; padding: 30px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px;">
    
    <!-- TOP SUCCESS ACKNOWLEDGEMENT BANNER -->
    <div style="background-color: #0f2b5c; color: #ffffff; padding: 16px 20px; border-radius: 4px; margin-bottom: 24px;">
      <h3 style="margin: 0; font-size: 15px; letter-spacing: 0.5px; text-transform: uppercase;">Application Received</h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.95;">
        Dear <strong>${applicantName}</strong>, thank you for applying for the position of <strong>${postName}</strong> at D Y Patil International University, Akurdi, Pune.
      </p>
    </div>

    <!-- OFFICIAL APPLICATION FORM HEADER -->
    <div style="border-bottom: 2px solid #0f2b5c; padding-bottom: 14px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; color: #0f2b5c; font-size: 20px; font-weight: bold; letter-spacing: -0.3px;">APPLICATION FORM</h2>
          <p style="margin: 2px 0 0 0; color: #475569; font-size: 13px; font-weight: bold;">D Y Patil International University, Akurdi, Pune</p>
        </div>
      </div>
      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #0f172a;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 3px 0; width: 60%;"><strong>Department:</strong> ${schoolOrDept}</td>
            <td style="padding: 3px 0; text-align: right; width: 40%;"><strong>Application ID:</strong> ${appNumber}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;"><strong>Post Applied For:</strong> ${postName}</td>
            <td style="padding: 3px 0; text-align: right;"><strong>Application Date:</strong> ${formattedDate}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- CANDIDATE DETAILS -->
    <div style="margin-bottom: 22px;">
      <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0f2b5c; border-bottom: 1.5px solid #0f2b5c; padding-bottom: 4px; margin-bottom: 8px;">
        CANDIDATE DETAILS
      </div>
      <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; width: 33%;"><span style="color: #64748b; font-size: 10px; display: block; text-transform: uppercase;">Full Name</span><strong>${applicantName}</strong></td>
          <td style="padding: 4px 0; width: 33%;"><span style="color: #64748b; font-size: 10px; display: block; text-transform: uppercase;">Date of Birth</span><strong>${formatBirthDate(personal.dob)} ${personal.age ? `(${personal.age} Years)` : ''}</strong></td>
          <td style="padding: 4px 0; width: 33%;"><span style="color: #64748b; font-size: 10px; display: block; text-transform: uppercase;">Gender</span><strong>${personal.gender || 'N/A'}</strong></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block; text-transform: uppercase;">Marital Status</span><strong>${personal.maritalStatus || 'N/A'}</strong></td>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block; text-transform: uppercase;">Primary Email</span><strong>${candidateEmail}</strong></td>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block; text-transform: uppercase;">Primary Mobile</span><strong>${candidateMobile}</strong></td>
        </tr>
      </table>
    </div>

    <!-- 01. PERSONAL INFORMATION -->
    <div style="margin-bottom: 22px;">
      <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0f2b5c; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">
        01. PERSONAL INFORMATION
      </div>
      <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; width: 25%;"><span style="color: #64748b; font-size: 10px; display: block;">Title</span><strong>${personal.title || 'N/A'}</strong></td>
          <td style="padding: 4px 0; width: 25%;"><span style="color: #64748b; font-size: 10px; display: block;">First Name</span><strong>${personal.firstName || 'N/A'}</strong></td>
          <td style="padding: 4px 0; width: 25%;"><span style="color: #64748b; font-size: 10px; display: block;">Middle Name</span><strong>${personal.middleName || '—'}</strong></td>
          <td style="padding: 4px 0; width: 25%;"><span style="color: #64748b; font-size: 10px; display: block;">Last Name</span><strong>${personal.lastName || 'N/A'}</strong></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block;">Date of Birth</span><strong>${formatBirthDate(personal.dob)}</strong></td>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block;">Age</span><strong>${personal.age || 'N/A'}</strong></td>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block;">Gender</span><strong>${personal.gender || 'N/A'}</strong></td>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block;">Marital Status</span><strong>${personal.maritalStatus || 'N/A'}</strong></td>
        </tr>
      </table>
    </div>

    <!-- 02. LOCATION & COMMUNICATION -->
    <div style="margin-bottom: 22px;">
      <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0f2b5c; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">
        02. LOCATION & COMMUNICATION
      </div>
      <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; width: 33%;"><span style="color: #64748b; font-size: 10px; display: block;">Primary Email</span><strong>${candidateEmail}</strong></td>
          <td style="padding: 4px 0; width: 33%;"><span style="color: #64748b; font-size: 10px; display: block;">Alternate Email</span><strong>${contact.alternateEmail || personal.alternateEmail || '—'}</strong></td>
          <td style="padding: 4px 0; width: 33%;"><span style="color: #64748b; font-size: 10px; display: block;">Primary Mobile</span><strong>${candidateMobile}</strong></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block;">Alternate Mobile</span><strong>${contact.alternateMobile || '—'}</strong></td>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block;">City / District</span><strong>${contact.city || 'Pune'}</strong></td>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block;">State & PIN</span><strong>${contact.state || 'Maharashtra'}${contact.pinCode ? ` - ${contact.pinCode}` : ''}</strong></td>
        </tr>
        <tr>
          <td colspan="3" style="padding: 6px 0;">
            <span style="color: #64748b; font-size: 10px; display: block;">Full Residential Address</span>
            <strong>${contact.address || 'Address on file with university application dossier.'}</strong>
          </td>
        </tr>
      </table>
    </div>

    <!-- 03. ACADEMIC QUALIFICATIONS -->
    <div style="margin-bottom: 22px;">
      <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0f2b5c; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">
        03. ACADEMIC QUALIFICATIONS
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
        <thead>
          <tr style="border-bottom: 1.5px solid #0f2b5c; background-color: #f1f5f9;">
            <th style="padding: 6px 8px; font-weight: bold;">Degree Level</th>
            <th style="padding: 6px 8px; font-weight: bold;">Degree Name</th>
            <th style="padding: 6px 8px; font-weight: bold;">Institute / University</th>
            <th style="padding: 6px 8px; font-weight: bold;">Specialization</th>
            <th style="padding: 6px 8px; font-weight: bold; text-align: center;">Year</th>
            <th style="padding: 6px 8px; font-weight: bold; text-align: right;">CGPA / %</th>
          </tr>
        </thead>
        <tbody>
          ${qualRows}
        </tbody>
      </table>
    </div>

    <!-- 04. RESEARCH & PROFESSIONAL PROFILE -->
    <div style="margin-bottom: 22px;">
      <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0f2b5c; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">
        04. RESEARCH & PROFESSIONAL PROFILE
      </div>
      <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 8px;">
        <tr>
          <td style="padding: 4px 0; width: 25%;"><span style="color: #64748b; font-size: 10px; display: block;">Ph.D. Status</span><strong>${research.phdStatus || 'N/A'}</strong></td>
          <td style="padding: 4px 0; width: 25%;"><span style="color: #64748b; font-size: 10px; display: block;">Ph.D. University</span><strong>${research.phdUniversity || '—'}</strong></td>
          <td style="padding: 4px 0; width: 25%;"><span style="color: #64748b; font-size: 10px; display: block;">Ph.D. Year</span><strong>${research.phdYear || '—'}</strong></td>
          <td style="padding: 4px 0; width: 25%;"><span style="color: #64748b; font-size: 10px; display: block;">Conference Papers</span><strong>${research.conferencePaper || 0}</strong></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block;">Scopus Publications</span><strong>${research.scopusCount || 0}</strong></td>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block;">Scopus Author ID</span><strong>${research.scopusId || '—'}</strong></td>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block;">Web of Science (SCI)</span><strong>${research.wosCount || research.webOfScienceCount || 0}</strong></td>
          <td style="padding: 4px 0;"><span style="color: #64748b; font-size: 10px; display: block;">Web of Science ID</span><strong>${research.wosId || '—'}</strong></td>
        </tr>
      </table>
      <div style="padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 11px; background-color: #f8fafc; border-radius: 4px;">
        <strong>National Eligibility Examination Clearance:</strong>
        NET: <strong>${research.net === 'Yes' || research.netCleared ? 'Cleared' : 'Not Cleared'}</strong> &bull;
        SET: <strong>${research.setExam === 'Yes' || research.setCleared ? 'Cleared' : 'Not Cleared'}</strong> &bull;
        GATE: <strong>${research.gate === 'Yes' || research.gateCleared ? 'Cleared' : 'Not Cleared'}</strong>
      </div>
    </div>

    <!-- 05. WORK EXPERIENCE -->
    <div style="margin-bottom: 22px;">
      <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0f2b5c; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">
        05. WORK EXPERIENCE
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
        <thead>
          <tr style="border-bottom: 1.5px solid #0f2b5c; background-color: #f1f5f9;">
            <th style="padding: 6px 8px; font-weight: bold;">Organization</th>
            <th style="padding: 6px 8px; font-weight: bold;">Designation</th>
            <th style="padding: 6px 8px; font-weight: bold;">Employment Type</th>
            <th style="padding: 6px 8px; font-weight: bold;">From</th>
            <th style="padding: 6px 8px; font-weight: bold;">To</th>
            <th style="padding: 6px 8px; font-weight: bold;">Salary</th>
            <th style="padding: 6px 8px; font-weight: bold;">Notice Period</th>
          </tr>
        </thead>
        <tbody>
          ${expRows}
        </tbody>
      </table>
    </div>

    <!-- NEXT STEPS NOTE -->
    <div style="margin-bottom: 22px; padding: 12px 16px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px;">
      <p style="margin: 0; color: #334155;">
        Our recruitment team will review your application dossier. If your profile is shortlisted for further consideration, our team will contact you using the contact details provided above.
      </p>
    </div>

    <!-- CANDIDATE DECLARATION & FOOTER -->
    <div style="margin-top: 30px; padding-top: 14px; border-top: 2px solid #0f2b5c; font-size: 11px; color: #475569;">
      <p style="margin: 0 0 10px 0;"><strong>Candidate Declaration:</strong> I hereby declare that all the information given in this application is true, complete and correct to the best of my knowledge and belief.</p>
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 12px;">
        <div>
          <div><strong>Candidate:</strong> ${applicantName}</div>
          <div style="font-size: 10px; color: #64748b;">Filing Date: ${formattedDate}</div>
        </div>
      </div>
    </div>

    <!-- RECRUITMENT CELL FOOTER -->
    <div style="margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 16px; font-size: 12px; color: #334155;">
      <p style="margin: 0;">Regards,</p>
      <p style="margin: 2px 0 0 0; font-weight: bold; color: #0f2b5c;">Recruitment Cell</p>
      <p style="margin: 2px 0 0 0;">D Y Patil International University</p>
      <p style="margin: 2px 0 0 0;">Akurdi, Pune</p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Sends official application submission confirmation email.
 * Non-blocking, failure tolerant, duplicate safe.
 */
async function sendSubmissionConfirmationEmail(applicationId) {
  try {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            school: true,
            departmentRef: true
          }
        },
        applicant: {
          include: {
            user: true
          }
        }
      }
    });

    if (!app) {
      console.error(`[Confirmation Email] Application ID ${applicationId} not found.`);
      return { success: false, error: 'Application not found' };
    }

    // Duplicate Email Prevention
    if (app.confirmationEmailSent) {
      console.log(`[Confirmation Email] Email already sent previously for application ${app.applicationNumber}. Skipping.`);
      return { success: true, skipped: true };
    }

    const recipientEmail = getApplicantRecipientEmail(app);
    if (!recipientEmail || !recipientEmail.includes('@')) {
      console.error(`[Confirmation Email] Invalid or missing recipient email for application ${app.applicationNumber}.`);
      return { success: false, error: 'No valid recipient email address' };
    }

    const applicantName = getApplicantDisplayName(app);
    const postName = app.job?.position || 'Academic/Administrative Position';
    const schoolName = app.job?.school?.name || app.job?.department || 'D Y Patil International University';
    const schoolOrDept = app.job?.department || app.job?.school?.name || 'School / Department';
    const appNumber = app.applicationNumber || app.id;
    const formattedDate = formatDate(app.submittedAt || app.createdAt);

    // EMAIL SUBJECT
    const subject = `Application Received – ${postName} | D Y Patil International University`;

    // EMAIL HTML BODY (Renders Full Application Form Dossier)
    const htmlBody = buildApplicationFormDossierHtml(app);

    // PLAIN TEXT FALLBACK
    const textBody = `D Y PATIL INTERNATIONAL UNIVERSITY
Akurdi, Pune

APPLICATION FORM DOSSIER
Application ID: ${appNumber}
Position Applied For: ${postName}
School / Department: ${schoolName}
Application Date: ${formattedDate}

CANDIDATE DETAILS
Name: ${applicantName}
Email: ${recipientEmail}

Our recruitment team will review your application dossier. If your profile is shortlisted for further consideration, our team will contact you using the contact details provided in your application.

Thank you for your interest in joining D Y Patil International University.

Regards,
Recruitment Cell
D Y Patil International University
Akurdi, Pune`;

    const sendResult = await sendEmail({
      to: recipientEmail,
      subject,
      html: htmlBody,
      text: textBody
    });

    if (sendResult.success) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          confirmationEmailSent: true,
          confirmationEmailSentAt: new Date()
        }
      }).catch(dbErr => {
        console.warn(`[Confirmation Email] Failed to update email flag in DB:`, dbErr.message);
      });
    }

    return sendResult;
  } catch (err) {
    console.error(`Confirmation email failed.`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send candidate status notification email.
 */
async function sendApplicationStatusEmail({ to, candidateName, applicationNumber, position, status, comment }) {
  const subject = `Application Status Update - ${applicationNumber} | DYPIU Pune`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="background-color: #0f2b5c; padding: 15px 20px; border-radius: 6px 6px 0 0; color: #ffffff;">
        <h2 style="margin: 0; font-size: 1.2rem;">D Y Patil International University, Pune</h2>
        <p style="margin: 4px 0 0 0; font-size: 0.85rem; opacity: 0.9;">Recruitment Portal Status Notification</p>
      </div>

      <div style="padding: 20px; color: #334155; line-height: 1.6;">
        <p>Dear <strong>${candidateName}</strong>,</p>

        <p>This is to inform you that your application <strong>(${applicationNumber})</strong> for the position of <strong>${position}</strong> has been updated.</p>

        <div style="background-color: #f8fafc; border-left: 4px solid #0891b2; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 0.9rem; color: #64748b; font-weight: bold; text-transform: uppercase;">New Status</p>
          <p style="margin: 4px 0 0 0; font-size: 1.1rem; color: #0f2b5c; font-weight: bold;">${status}</p>
          ${comment ? `<p style="margin: 8px 0 0 0; font-size: 0.9rem; color: #475569; font-style: italic;">"${comment}"</p>` : ''}
        </div>

        <p>Please retain your Application Number for future correspondence regarding your application.</p>

        <p style="margin-top: 30px;">Best Regards,<br /><strong>Human Resources & Recruitment Cell</strong><br />D Y Patil International University, Akurdi, Pune</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html, text: `Dear ${candidateName}, Your application ${applicationNumber} for ${position} status is now: ${status}.` });
}

module.exports = {
  sendEmail,
  sendSubmissionConfirmationEmail,
  sendApplicationStatusEmail
};
