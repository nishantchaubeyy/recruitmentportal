const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const prisma = require('./prisma');
const { generateApplicationPdf } = require('./pdfService');

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
  const token = process.env.ZEPTOMAIL_TOKEN || (password.startsWith('Zoho-enczapikey') ? password : '');
  const apiUrl = process.env.ZEPTOMAIL_API_URL || 'https://api.zeptomail.in/v1.1/email';

  const fromString = `"${fromName}" <${fromEmail}>`;

  return { host, port, username, password, token, apiUrl, fromEmail, fromName, fromString };
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
 * Send email using ZeptoMail official REST API endpoint
 */
async function sendViaZeptoApi({ to, subject, html, text, attachments }) {
  const config = getEmailConfig();
  const token = config.token || config.password;
  if (!token) {
    throw new Error('ZeptoMail token not configured');
  }

  const authHeader = token.startsWith('Zoho-enczapikey') ? token : `Zoho-enczapikey ${token}`;

  const payload = {
    from: {
      address: config.fromEmail,
      name: config.fromName
    },
    to: [
      {
        email_address: {
          address: to,
          name: to.split('@')[0]
        }
      }
    ],
    subject,
    htmlbody: html,
    textbody: text || undefined
  };

  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    payload.attachments = attachments.map(att => ({
      content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
      mime_type: att.contentType || 'application/pdf',
      name: att.filename
    }));
  }

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    const errMsg = data.message || (data.error && data.error.message) || JSON.stringify(data);
    if (errMsg.includes('Sender Address not available') || errMsg.includes('SM_147')) {
      console.warn(`\n⚠️ [ZeptoMail Notice] The sender address "${config.fromEmail}" has not been verified in ZeptoMail Mail Agent. Please add and verify "${config.fromEmail}" in your ZeptoMail console.\n`);
    }
    throw new Error(`ZeptoMail API error (${response.status}): ${errMsg}`);
  }

  const messageId = (data.data && data.data[0] && data.data[0].message_id) || data.request_id || 'zepto-api-sent';
  console.log(`Confirmation email sent via ZeptoMail API. (Message ID: ${messageId})`);
  return { success: true, messageId };
}

/**
 * Generic email dispatcher abstraction.
 * Tries ZeptoMail REST API first if token is available, otherwise SMTP, else simulation.
 */
async function sendEmail({ to, subject, html, text, attachments }) {
  const config = getEmailConfig();

  // Save HTML preview file locally for easy inspection during testing
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, 'last_application_email.html'), html, 'utf8');

    if (attachments && attachments.length > 0) {
      attachments.forEach((att, idx) => {
        if (att.content) {
          const filePath = path.join(uploadsDir, att.filename || `attachment_${idx}.pdf`);
          fs.writeFileSync(filePath, Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content, 'base64'));
          console.log(`[Email Preview] Attachment saved at: backend/uploads/${att.filename}`);
        }
      });
    }
  } catch (err) {
    // Non-fatal preview saving error ignored
  }

  // 1. Try ZeptoMail REST API if token exists
  if (config.token || (config.password && config.password.startsWith('Zoho-enczapikey'))) {
    try {
      return await sendViaZeptoApi({ to, subject, html, text, attachments });
    } catch (apiErr) {
      console.error(`[ZeptoMail API] Dispatch error: ${apiErr.message}`);
      // Fall through to SMTP if configured
    }
  }

  // 2. Try SMTP Transporter
  const transporter = createTransporter();
  if (transporter) {
    try {
      const mailOptions = {
        from: config.fromString,
        to,
        subject,
        text,
        html
      };
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType || 'application/pdf'
        }));
      }

      const info = await transporter.sendMail(mailOptions);
      console.log(`Confirmation email sent via SMTP. (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      if (error.message.includes('Sender is not allowed to relay emails') || error.message.includes('553')) {
        console.warn(`\n⚠️ [ZeptoMail SMTP Notice] Sender address "${config.fromEmail}" is not allowed to relay. Please verify domain/sender in ZeptoMail.\n`);
      }
      console.error(`Confirmation email via SMTP failed. Reason: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // 3. Simulation Mode (Fallback when no live credentials are set)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n==================================================`);
    console.log(`[ZeptoMail Test Mode] Mail dispatch simulation for: ${to}`);
    console.log(`[ZeptoMail Test Mode] From: ${config.fromString}`);
    console.log(`[ZeptoMail Test Mode] Subject: ${subject}`);
    if (attachments && attachments.length > 0) {
      console.log(`[ZeptoMail Test Mode] Attachments: ${attachments.map(a => a.filename).join(', ')}`);
    }
    console.log(`[ZeptoMail Test Mode] HTML Email Preview saved at: backend/uploads/last_application_email.html`);
    console.log(`Confirmation email simulated successfully.`);
    console.log(`==================================================\n`);
  } else {
    console.warn(`[Mail] Mail dispatched in simulation mode (no mail provider configured).`);
  }
  return { success: true, mode: 'test_simulation' };
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
function buildApplicationFormDossierHtml(app, options = {}) {
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
    <div style="background-color: #721b28; color: #ffffff; padding: 20px 24px; border-radius: 6px; margin-bottom: 24px; border-left: 5px solid #d9a43c;">
      <h3 style="margin: 0; font-size: 16px; letter-spacing: 0.5px; text-transform: uppercase;">
        ${options.isInterest ? 'Application & Interest Registered' : 'Application Received'}
      </h3>
      <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6;">
        Dear <strong>${applicantName}</strong>,<br /><br />
        Thank you for applying at <strong>D Y Patil International University</strong>.<br />
        ${options.isInterest 
          ? `We have received your application for the post of <strong>${postName}</strong> (Registration / Ref No: <strong>${appNumber}</strong>). Applications for this position are currently closed, but we have securely recorded your credentials and qualifications in our database. We will reach out to you as soon as the vacancy is officially opened.`
          : `We have received your application for the post of <strong>${postName}</strong> (Application No: <strong>${appNumber}</strong>). Our team will review your application and reach out to you soon.`
        }
      </p>
      <div style="margin-top: 14px; padding: 8px 12px; background-color: rgba(255,255,255,0.12); border-radius: 4px; font-size: 12px;">
        📎 <strong>Official Application Dossier Attached</strong> — A PDF copy of your submitted application has been attached to this email for your records.
      </div>
    </div>

    ${options.generatedPassword ? `
    <!-- CONDITIONAL LOGIN CREDENTIALS SECTION -->
    <div style="background-color: #fef2f2; border: 1.5px solid #fecaca; border-radius: 6px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <h4 style="margin: 0 0 10px 0; color: #721b28; font-size: 15px; font-weight: bold;">
        🔐 Your Recruitment Portal Login Credentials
      </h4>
      <p style="margin: 0 0 14px 0; font-size: 13.5px; color: #0f172a; line-height: 1.6;">
        An account has been created for you to track your application status. You can login using this email and the following auto-generated password:
      </p>
      <div style="background: #ffffff; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 16px; margin-bottom: 14px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
          <tr>
            <td style="padding: 6px 0; width: 150px; color: #64748b; font-weight: 600;">Login Email:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${candidateEmail}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Auto-Generated Password:</td>
            <td style="padding: 6px 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 800; color: #721b28; letter-spacing: 1px;">${options.generatedPassword}</td>
          </tr>
        </table>
      </div>
      <div>
        <a href="${options.loginUrl || 'https://intranet.dypiu.ac.in/recruitment/login'}" 
           style="background-color: #721b28; color: #ffffff; padding: 9px 20px; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: bold; display: inline-block;">
          Login to Track Application &rarr;
        </a>
      </div>
    </div>
    ` : ''}

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
async function sendSubmissionConfirmationEmail(applicationId, options = {}) {
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
    const subject = options.isInterest
      ? `Interest & Application Registered – D Y Patil International University`
      : `Application Received – D Y Patil International University`;

    // EMAIL HTML BODY (Renders Full Application Form Dossier)
    const htmlBody = buildApplicationFormDossierHtml(app, options);

    // PLAIN TEXT FALLBACK
    const textBody = `D Y PATIL INTERNATIONAL UNIVERSITY
Akurdi, Pune

Dear ${applicantName},

Thank you for applying at D Y Patil International University.
${options.isInterest
  ? `We have received your application for the post of ${postName} (Reference No: ${appNumber}). Currently applications for this position are closed, but we have securely recorded your details. We will reach out to you as soon as the vacancy is officially opened.`
  : `We have received your application for the post of ${postName} (Application No: ${appNumber}). Our team will review your application and reach out to you soon.`}
${options.generatedPassword ? `
------------------------------------------------------------
YOUR APPLICANT PORTAL LOGIN CREDENTIALS:
An account has been created for you to track your application status.
You can login using this email and the following auto-generated password:

Login Email: ${recipientEmail}
Auto-Generated Password: ${options.generatedPassword}
Login URL: ${options.loginUrl || 'https://intranet.dypiu.ac.in/recruitment/login'}
------------------------------------------------------------
` : ''}
APPLICATION DETAILS:
Application ID: ${appNumber}
Position Applied For: ${postName}
School / Department: ${schoolName}
Application Date: ${formattedDate}

CANDIDATE DETAILS:
Name: ${applicantName}
Email: ${recipientEmail}

Your official application form PDF is attached to this email.

Regards,
Recruitment Cell
D Y Patil International University
Akurdi, Pune`;

    // GENERATE APPLICATION DOSSIER PDF
    let attachments = [];
    try {
      const pdfBuffer = await generateApplicationPdf(app);
      if (pdfBuffer && pdfBuffer.length > 0) {
        attachments.push({
          filename: `Application_${appNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
        console.log(`[Confirmation Email] Generated PDF dossier for ${appNumber} (${pdfBuffer.length} bytes)`);
      }
    } catch (pdfErr) {
      console.error(`[Confirmation Email] Failed to generate PDF dossier for ${appNumber}:`, pdfErr.message);
    }

    const sendResult = await sendEmail({
      to: recipientEmail,
      subject,
      html: htmlBody,
      text: textBody,
      attachments
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

/**
 * Send candidate OTP email for registration / application verification.
 */
async function sendOTPEmail({ to, otpCode }) {
  const subject = `Your Verification Code: ${otpCode} - DYPIU Recruitment Portal`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #721b28; padding: 18px 24px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 1.15rem; font-family: Georgia, serif;">D Y Patil International University</h2>
        <p style="margin: 4px 0 0 0; font-size: 0.8rem; opacity: 0.9;">Staff & Faculty Recruitment Portal</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <p>Dear Applicant,</p>
        <p>Your one-time email verification code is:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #721b28; background: #fff5f5; border: 1.5px dashed #721b28; padding: 12px 28px; border-radius: 8px;">
            ${otpCode}
          </span>
        </div>
        <p style="font-size: 0.9rem; color: #64748b;">This code will expire in 10 minutes. If you did not initiate this request, please disregard this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="margin: 0; font-size: 0.85rem; color: #64748b;">D Y Patil International University · Sector 29, Nigdi Pradhikaran, Akurdi, Pune</p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Your DYPIU recruitment portal verification code is: ${otpCode}. It expires in 10 minutes.`
  });
}

/**
 * FEATURE 1: Send Zoom Interview Scheduled / Rescheduled Email.
 */
async function sendInterviewScheduledEmail({
  to,
  candidateName,
  jobTitle,
  interviewTitle,
  interviewDate,
  startTime,
  endTime,
  zoomLink,
  zoomMeetingId,
  zoomPassword,
  interviewerName,
  interviewType,
  notes,
  isRescheduled = false
}) {
  const formattedDate = new Date(interviewDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const subject = `Interview ${isRescheduled ? 'Rescheduled' : 'Scheduled'} - D Y Patil International University | ${jobTitle || 'Faculty Position'}`;
  const timeDisplay = startTime && endTime ? `${startTime} to ${endTime} (IST)` : (startTime || 'As communicated');

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #721b28 0%, #4a1019 100%); padding: 26px 30px; color: #ffffff; border-bottom: 3px solid #D4AF37;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; font-family: Georgia, serif;">D Y PATIL INTERNATIONAL UNIVERSITY</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #FCD34D; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Akurdi, Pune · Recruitment Cell</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Main Body -->
      <div style="padding: 30px; color: #1e293b; line-height: 1.65; font-size: 15px;">
        <p style="margin-top: 0;">Dear <strong>${candidateName || 'Candidate'}</strong>,</p>

        <p style="color: #334155;">
          ${isRescheduled 
            ? `Please note that your scheduled interview for the position of <strong>${jobTitle || 'Applied Role'}</strong> has been <strong>rescheduled</strong> with updated details below.`
            : `Congratulations! We are pleased to inform you that you have been shortlisted for an interview for the position of <strong>${jobTitle || 'Applied Role'}</strong> at D Y Patil International University, Pune.`}
        </p>

        <!-- Meeting Card -->
        <div style="background: #fdfaf7; border: 1.5px solid #fed7aa; border-radius: 10px; padding: 20px; margin: 24px 0;">
          <div style="font-size: 12px; font-weight: 800; color: #9a3412; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
            ${interviewTitle || 'Zoom Interview Session Details'}
          </div>

          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600; width: 35%;">Interview Date:</td>
              <td style="color: #0f172a; font-weight: 700;">${formattedDate}</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Time:</td>
              <td style="color: #721b28; font-weight: 800;">${timeDisplay}</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Platform:</td>
              <td style="color: #0f172a; font-weight: 700;">
                <span style="background-color: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 800;">ZOOM VIDEO CONFERENCE</span>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Interview Round:</td>
              <td style="color: #0f172a; font-weight: 600;">${interviewType || 'Technical & HR Assessment'}</td>
            </tr>
            ${interviewerName ? `
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Interviewer / Panel:</td>
              <td style="color: #0f172a; font-weight: 600;">${interviewerName}</td>
            </tr>` : ''}
            ${zoomMeetingId ? `
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Zoom Meeting ID:</td>
              <td style="color: #0f172a; font-family: monospace; font-size: 15px; font-weight: 700;">${zoomMeetingId}</td>
            </tr>` : ''}
            ${zoomPassword ? `
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Zoom Passcode:</td>
              <td style="color: #0f172a; font-family: monospace; font-size: 15px; font-weight: 700;">${zoomPassword}</td>
            </tr>` : ''}
          </table>

          <!-- Clickable Zoom Button -->
          ${zoomLink ? `
          <div style="text-align: center; margin-top: 22px;">
            <a href="${zoomLink}" target="_blank" style="display: inline-block; background-color: #2D8CFF; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(45, 140, 255, 0.35);">
              🎥 Click to Join Zoom Meeting
            </a>
            <div style="font-size: 12px; color: #64748b; margin-top: 8px; word-break: break-all;">
              Direct URL: <a href="${zoomLink}" style="color: #2D8CFF;">${zoomLink}</a>
            </div>
          </div>` : ''}
        </div>

        ${notes ? `
        <div style="background-color: #f1f5f9; border-left: 4px solid #721b28; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #0f172a; font-size: 13px; text-transform: uppercase;">Instructions from Interview Panel:</strong>
          <p style="margin: 6px 0 0 0; color: #334155; font-size: 14px;">${notes}</p>
        </div>` : ''}

        <!-- General Candidate Guidelines -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13.5px; color: #475569;">
          <strong style="color: #0f172a;">Important Guidelines:</strong>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.6;">
            <li>Please join the meeting <strong>5 minutes before</strong> the scheduled start time.</li>
            <li>Ensure a stable internet connection, functioning webcam, and microphone.</li>
            <li>Keep digital/original copies of your certificates, publications, and portfolio ready for presentation if requested.</li>
            <li>You can also view this interview and live countdown in your <strong>Candidate Portal Dashboard</strong> under "My Interviews".</li>
          </ul>
        </div>

        <p style="margin-top: 24px; color: #64748b; font-size: 13.5px;">
          If you have any queries or face technical difficulties joining the session, please reply directly to this email or contact the recruitment cell at <strong>careers@dypiu.ac.in</strong>.
        </p>

        <p style="margin-top: 30px; margin-bottom: 0;">
          Warm regards,<br />
          <strong>Selection & Recruitment Board</strong><br />
          D Y Patil International University, Akurdi, Pune<br />
          <span style="font-size: 12px; color: #64748b;">Website: <a href="https://www.dypiu.ac.in" style="color: #721b28;">www.dypiu.ac.in</a></span>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Dear ${candidateName}, Your interview for ${jobTitle} is scheduled on ${formattedDate} at ${timeDisplay} via Zoom. Link: ${zoomLink}`
  });
}

/**
 * FEATURE 1: Send Zoom Interview Cancelled Email.
 */
async function sendInterviewCancelledEmail({
  to,
  candidateName,
  jobTitle,
  interviewTitle,
  interviewDate,
  reason
}) {
  const formattedDate = new Date(interviewDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const subject = `Interview Cancelled - D Y Patil International University | ${jobTitle || 'Faculty Position'}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #991b1b; padding: 22px 28px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 800;">D Y PATIL INTERNATIONAL UNIVERSITY</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Recruitment Cell · Interview Status Update</p>
      </div>

      <div style="padding: 28px; color: #1e293b; line-height: 1.6; font-size: 14.5px;">
        <p>Dear <strong>${candidateName || 'Candidate'}</strong>,</p>

        <p>This is to inform you that the interview scheduled on <strong>${formattedDate}</strong> for the position of <strong>${jobTitle || 'Applied Role'}</strong> (${interviewTitle || 'Interview Round'}) has been <strong>cancelled</strong>.</p>

        ${reason ? `
        <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 18px 0; border-radius: 4px;">
          <strong style="color: #991b1b; font-size: 12px; text-transform: uppercase;">Reason / Remarks:</strong>
          <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 13.5px;">${reason}</p>
        </div>` : ''}

        <p>Our HR team will reach out to you if this round is rescheduled. We apologize for any inconvenience caused.</p>

        <p style="margin-top: 28px;">
          Best regards,<br />
          <strong>Recruitment Cell</strong><br />
          D Y Patil International University, Pune
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Dear ${candidateName}, Your interview scheduled on ${formattedDate} for ${jobTitle} has been cancelled. Reason: ${reason || 'Administrative reschedule'}.`
  });
}

/**
 * FEATURE 2: Send Document Upload Request Email.
 */
async function sendDocumentRequestEmail({
  to,
  candidateName,
  applicationNumber,
  jobTitle,
  requiredDocuments = [],
  deadline,
  priority = 'NORMAL',
  message,
  loginUrl
}) {
  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Within 5 working days';

  const isUrgent = priority === 'URGENT';
  const portalUrl = loginUrl || process.env.LOGIN_URL || 'https://intranet.dypiu.ac.in/recruitment/login';

  const subject = `${isUrgent ? 'URGENT: ' : ''}Document Upload Required - D Y Patil International University | ${applicationNumber || 'Recruitment'}`;

  const docListHtml = requiredDocuments.map((doc, idx) => `
    <li style="padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
      <strong>${idx + 1}. ${typeof doc === 'string' ? doc : (doc.documentName || doc.name)}</strong>
      ${doc.isMandatory !== false ? '<span style="color: #dc2626; font-size: 11px; margin-left: 6px;">[Mandatory]</span>' : ''}
    </li>
  `).join('');

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #721b28 0%, #4a1019 100%); padding: 26px 30px; color: #ffffff; border-bottom: 3px solid #D4AF37;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; font-family: Georgia, serif;">D Y PATIL INTERNATIONAL UNIVERSITY</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #FCD34D; font-weight: 600; text-transform: uppercase;">Akurdi, Pune · Human Resources Verification Desk</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Content -->
      <div style="padding: 30px; color: #1e293b; line-height: 1.65; font-size: 15px;">
        <p style="margin-top: 0;">Dear <strong>${candidateName || 'Candidate'}</strong>,</p>

        <p style="color: #334155;">
          Your application ${applicationNumber ? `<strong>(${applicationNumber})</strong>` : ''} for the position of <strong>${jobTitle || 'Faculty Position'}</strong> has been reviewed by the HR Committee.
        </p>

        <p style="color: #334155;">
          To proceed further with the verification and evaluation process, you are requested to upload the following original documents through the official <strong>Candidate Recruitment Portal</strong>:
        </p>

        ${isUrgent ? `
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px 14px; border-radius: 6px; font-weight: 700; font-size: 13px; margin: 16px 0;">
          ⚠️ HIGH PRIORITY REQUEST: Please upload requested documents at your earliest convenience.
        </div>` : ''}

        <!-- Required Documents Card -->
        <div style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <div style="font-size: 13px; font-weight: 800; color: #721b28; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
            Checklist of Documents to Upload:
          </div>
          <ol style="margin: 0; padding-left: 20px; list-style-type: none; line-height: 1.7;">
            ${docListHtml}
          </ol>

          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 13.5px;">
            <span style="color: #64748b; font-weight: 600;">Submission Deadline:</span>
            <span style="color: #dc2626; font-weight: 800; background: #fee2e2; padding: 4px 10px; border-radius: 4px;">
              📅 ${formattedDeadline}
            </span>
          </div>
        </div>

        ${message ? `
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 18px 0; border-radius: 4px;">
          <strong style="color: #92400e; font-size: 12px; text-transform: uppercase;">Message from HR:</strong>
          <p style="margin: 4px 0 0 0; color: #78350f; font-size: 13.5px;">${message}</p>
        </div>` : ''}

        <!-- Login Call to Action -->
        <div style="text-align: center; margin: 26px 0;">
          <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #721b28; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(114, 27, 40, 0.35);">
            🔐 Login to Portal & Upload Documents
          </a>
          <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
            Portal link: <a href="${portalUrl}" style="color: #721b28;">${portalUrl}</a>
          </div>
        </div>

        <!-- Step by Step Instructions -->
        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #334155;">
          <strong style="color: #0f172a;">How to Upload Your Documents:</strong>
          <ol style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.6;">
            <li>Log in using your registered credentials (email & password provided upon registration/submission).</li>
            <li>Go to the <strong>"My Documents"</strong> section in your Candidate Dashboard.</li>
            <li>Click <strong>"Upload"</strong> next to each requested document.</li>
            <li><strong>Accepted formats:</strong> PDF, JPG, PNG (Max file size: 5MB per document).</li>
            <li>Once all documents are uploaded, click <strong>"Submit All Documents"</strong> to finalize.</li>
          </ol>
        </div>

        <p style="margin-top: 24px; color: #64748b; font-size: 13.5px;">
          If you need assistance or encounter issues logging in, please contact us at <strong>careers@dypiu.ac.in</strong>.
        </p>

        <p style="margin-top: 30px; margin-bottom: 0;">
          Warm regards,<br />
          <strong>Recruitment & Verification Cell</strong><br />
          D Y Patil International University, Akurdi, Pune
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Dear ${candidateName}, Original documents are requested for application ${applicationNumber}. Please login to upload them before ${formattedDeadline}. Link: ${portalUrl}`
  });
}

/**
 * FEATURE 2: Send Document Verification Result Notification (Verified / Rejected).
 */
async function sendDocumentVerificationUpdateEmail({
  to,
  candidateName,
  applicationNumber,
  status,
  remarks,
  rejectedItems = [],
  loginUrl
}) {
  const isApproved = status === 'VERIFIED';
  const portalUrl = loginUrl || process.env.LOGIN_URL || 'https://intranet.dypiu.ac.in/recruitment/login';

  const subject = `Document Verification ${isApproved ? 'Approved' : 'Action Required'} - D Y Patil International University | ${applicationNumber || 'Application'}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${isApproved ? '#047857' : '#b91c1c'}; padding: 22px 28px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 800;">D Y PATIL INTERNATIONAL UNIVERSITY</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Document Verification Status Update</p>
      </div>

      <div style="padding: 26px; color: #1e293b; line-height: 1.6; font-size: 14.5px;">
        <p>Dear <strong>${candidateName || 'Candidate'}</strong>,</p>

        <p>
          ${isApproved
            ? `Your uploaded documents for application <strong>${applicationNumber || ''}</strong> have been <strong>successfully verified and approved</strong> by the HR Verification Cell.`
            : `The HR Verification Cell has reviewed your uploaded documents for application <strong>${applicationNumber || ''}</strong> and identified items requiring correction or re-upload.`}
        </p>

        ${!isApproved && rejectedItems.length > 0 ? `
        <div style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 18px 0;">
          <strong style="color: #991b1b; font-size: 13px; text-transform: uppercase;">Documents Requiring Re-upload:</strong>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #7f1d1d; font-size: 13.5px;">
            ${rejectedItems.map(item => `
              <li style="margin-bottom: 6px;">
                <strong>${item.name || item.documentName}:</strong> ${item.reason || item.rejectionReason || 'Please provide clear legible copy.'}
              </li>
            `).join('')}
          </ul>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #b91c1c; color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-weight: 700; font-size: 14px;">
            Re-upload Documents in Portal &rarr;
          </a>
        </div>` : ''}

        ${remarks ? `
        <p style="font-size: 13.5px; color: #475569; font-style: italic;">Remarks: "${remarks}"</p>
        ` : ''}

        <p style="margin-top: 26px;">
          Best regards,<br />
          <strong>HR & Verification Team</strong><br />
          D Y Patil International University, Pune
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Dear ${candidateName}, Your document verification status for ${applicationNumber} is: ${status}. Please visit ${portalUrl} for details.`
  });
}

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendSubmissionConfirmationEmail,
  sendApplicationStatusEmail,
  sendInterviewScheduledEmail,
  sendInterviewCancelledEmail,
  sendDocumentRequestEmail,
  sendDocumentVerificationUpdateEmail
};
