const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const prisma = require('./prisma');
const { generateApplicationPdf } = require('./pdfService');
const { recordEmail } = require('./emailLogService');
const { escapeHtml } = require('../utils/validate');

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
        // Verify the mail server certificate unless explicitly relaxed for an internal relay.
        rejectUnauthorized: process.env.SMTP_ALLOW_SELF_SIGNED !== 'true'
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
 * Whether this server can actually deliver e-mail, and through which provider.
 */
function getEmailProviderStatus() {
  const config = getEmailConfig();
  if (config.token || (config.password && config.password.startsWith('Zoho-enczapikey'))) {
    return { configured: true, provider: 'zeptomail-api', from: config.fromEmail };
  }
  if (config.host && config.username && config.password) {
    return { configured: true, provider: 'smtp', from: config.fromEmail };
  }
  return { configured: false, provider: 'none', from: config.fromEmail };
}

/**
 * Deliver one message. Never throws and never pretends: the result says whether the mail was
 * really handed to a provider (`success`), or why not (`error`, `skipped`).
 */
async function deliverEmail({ to, subject, html, text, attachments }) {
  const config = getEmailConfig();

  // Keep an HTML preview of the last mail for inspection (development convenience).
  if (process.env.NODE_ENV !== 'production') {
    try {
      const uploadsDir = path.join(__dirname, '../../uploads');
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, 'last_application_email.html'), html || text || '', 'utf8');
    } catch (err) {
      // Non-fatal.
    }
  }

  let lastError = null;
  let lastProvider = null;

  // 1. ZeptoMail REST API
  if (config.token || (config.password && config.password.startsWith('Zoho-enczapikey'))) {
    lastProvider = 'zeptomail-api';
    try {
      const sent = await sendViaZeptoApi({ to, subject, html, text, attachments });
      return { ...sent, provider: 'zeptomail-api' };
    } catch (apiErr) {
      lastError = apiErr.message;
      console.error(`[ZeptoMail API] Dispatch error: ${apiErr.message}`);
    }
  }

  // 2. SMTP
  const transporter = createTransporter();
  if (transporter) {
    lastProvider = 'smtp';
    try {
      const mailOptions = { from: config.fromString, to, subject, text, html };
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType || 'application/pdf'
        }));
      }
      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (error) {
      if (error.message.includes('Sender is not allowed to relay emails') || error.message.includes('553')) {
        console.warn(`[SMTP] Sender address "${config.fromEmail}" is not allowed to relay. Verify the domain/sender with your mail provider.`);
      }
      console.error(`[SMTP] Delivery failed: ${error.message}`);
      lastError = error.message;
    }
  }

  if (lastError) return { success: false, error: lastError, provider: lastProvider };

  // 3. Nothing configured: say so clearly instead of reporting a fake success.
  console.warn(`[Mail] NOT SENT to ${to} ("${subject}"): no e-mail provider is configured. Set ZEPTOMAIL_TOKEN (or SMTP_HOST/SMTP_USER/SMTP_PASS) in the server environment.`);
  return { success: false, skipped: true, error: 'No e-mail provider is configured on this server.', provider: 'none' };
}

/**
 * Generic e-mail dispatcher: delivers and records the attempt in the e-mail log.
 * `meta` = { kind, entityType, entityId } ties the attempt to what triggered it.
 */
async function sendEmail({ to, subject, html, text, attachments, meta = {} }) {
  const result = await deliverEmail({ to, subject, html, text, attachments });
  await recordEmail({
    to,
    subject,
    kind: meta.kind || 'GENERAL',
    status: result.success ? 'SENT' : (result.skipped ? 'SKIPPED' : 'FAILED'),
    provider: result.provider,
    error: result.error,
    entityType: meta.entityType,
    entityId: meta.entityId
  });
  return result;
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
function buildPlainLetterApplicationHtml(app, options = {}) {
  const personal = safeParseJSON(app.personalInfo);
  const contact = safeParseJSON(app.contactDetails);

  const applicantName = getApplicantDisplayName(app);
  const postName = app.job?.position || personal.postAppliedFor || 'Associate Professor';
  const schoolOrDept = app.job?.department || app.job?.school?.name || personal.faculty || '';
  const departmentDisplay = schoolOrDept ? ` (${schoolOrDept})` : '';
  const appNumber = app.applicationNumber || app.id;
  const formattedDate = formatDate(app.submittedAt || app.createdAt);
  const recipientEmail = getApplicantRecipientEmail(app);
  const loginUrl = options.loginUrl || 'https://recruitment.dypiu.ac.in/login';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Application Received</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#000000;">
  <div style="max-width:600px;margin:0 auto;padding:24px 20px;font-size:14px;line-height:1.6;">

    <p style="margin:0 0 16px 0;">Dear ${applicantName},</p>

    <p style="margin:0 0 16px 0;">Greetings from D Y Patil International University.</p>

    <p style="margin:0 0 16px 0;">
      Thank you for applying for the post of <strong>${postName}</strong>${departmentDisplay}.
    </p>

    <p style="margin:0 0 16px 0;">
      We have received your application. Your application number is
      <strong>${appNumber}</strong>, dated ${formattedDate}.
    </p>

    <p style="margin:0 0 16px 0;">
      Our recruitment team will review your application and contact you if you are
      shortlisted for the next stage.
    </p>

    <p style="margin:0 0 16px 0;">
      A PDF copy of your submitted application form is attached to this email for your records.
    </p>

    ${options.generatedPassword ? `
    <p style="margin:0 0 8px 0;">Your login details for the recruitment portal are as follows:</p>

    <p style="margin:0 0 4px 0;">Login email: ${recipientEmail}</p>
    <p style="margin:0 0 16px 0;">Password: ${options.generatedPassword}</p>

    <p style="margin:0 0 16px 0;">
      You can log in here:<br />
      <a href="${loginUrl}" style="color:#0000ee;text-decoration:underline;">${loginUrl}</a>
    </p>

    <p style="margin:0 0 16px 0;">Please change your password after the first login.</p>
    ` : `
    <p style="margin:0 0 16px 0;">
      You can log in here:<br />
      <a href="${loginUrl}" style="color:#0000ee;text-decoration:underline;">${loginUrl}</a>
    </p>
    `}

    <p style="margin:0 0 16px 0;">
      For any queries, write to us at <a href="mailto:recruitment@dypiu.ac.in" style="color:#0000ee;text-decoration:underline;">recruitment@dypiu.ac.in</a>.
    </p>

    <p style="margin:0 0 4px 0;">With regards,</p>
    <p style="margin:0 0 2px 0;">Recruitment Cell</p>
    <p style="margin:0 0 2px 0;">D Y Patil International University</p>
    <p style="margin:0;">Akurdi, Pune</p>

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
    if (app.confirmationEmailSent && !options.force && !options.generatedPassword) {
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

    const loginUrl = options.loginUrl || 'https://recruitment.dypiu.ac.in/login';
    const departmentDisplay = schoolOrDept ? ` (${schoolOrDept})` : '';

    // EMAIL SUBJECT (Plain institutional style)
    const subject = `Application received – ${appNumber} | ${postName} | D Y Patil International University`;

    // EMAIL HTML BODY (Plain letter style)
    const htmlBody = buildPlainLetterApplicationHtml(app, options);

    // PLAIN TEXT BODY (Normal written letter)
    let textBody = `Dear ${applicantName},

Greetings from D Y Patil International University.

Thank you for applying for the post of ${postName}${departmentDisplay}.

We have received your application. Your application number is ${appNumber}, dated ${formattedDate}.

Our recruitment team will review your application and contact you if you are shortlisted for the next stage.

A PDF copy of your submitted application form is attached to this email for your records.
`;

    if (options.generatedPassword) {
      textBody += `
Your login details for the recruitment portal are as follows:

Login email: ${recipientEmail}
Password:    ${options.generatedPassword}

You can log in here:
${loginUrl}

Please change your password after the first login.
`;
    } else {
      textBody += `
You can log in here:
${loginUrl}
`;
    }

    textBody += `
For any queries, write to us at recruitment@dypiu.ac.in.

With regards,
Recruitment Cell
D Y Patil International University
Akurdi, Pune`;

    // GENERATE APPLICATION PDF ATTACHMENT
    let attachments = [];
    try {
      const pdfBuffer = await generateApplicationPdf(app);
      if (pdfBuffer && pdfBuffer.length > 0) {
        attachments.push({
          filename: `${appNumber}_Application_Form.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
        console.log(`[Confirmation Email] Attached PDF application form for ${appNumber} (${pdfBuffer.length} bytes)`);
      }
    } catch (pdfErr) {
      console.error(`[Confirmation Email] Failed to generate PDF application form for ${appNumber}:`, pdfErr.message);
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
async function sendApplicationStatusEmail({ to, candidateName, applicationNumber, position, status, statusLabel, nextStep, comment, meta }) {
  const label = statusLabel || status;
  const subject = `Application Status Update: ${label} - ${applicationNumber} | DYPIU`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="background-color: #0f2b5c; padding: 15px 20px; border-radius: 6px 6px 0 0; color: #ffffff;">
        <h2 style="margin: 0; font-size: 1.2rem;">D Y Patil International University, Pune</h2>
        <p style="margin: 4px 0 0 0; font-size: 0.85rem; opacity: 0.9;">Recruitment Portal - Application Status</p>
      </div>

      <div style="padding: 20px; color: #334155; line-height: 1.6;">
        <p>Dear <strong>${escapeHtml(candidateName)}</strong>,</p>

        <p>Your application <strong>(${escapeHtml(applicationNumber)})</strong> for the position of <strong>${escapeHtml(position)}</strong> has been updated.</p>

        <div style="background-color: #f8fafc; border-left: 4px solid #0891b2; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 0.8rem; color: #64748b; font-weight: bold; text-transform: uppercase;">New status</p>
          <p style="margin: 4px 0 0 0; font-size: 1.15rem; color: #0f2b5c; font-weight: bold;">${escapeHtml(label)}</p>
          ${comment ? `<p style="margin: 10px 0 0 0; font-size: 0.9rem; color: #475569;"><strong>Remarks from the recruitment cell:</strong> ${escapeHtml(comment)}</p>` : ''}
        </div>

        ${nextStep ? `<p>${escapeHtml(nextStep)}</p>` : ''}

        <p>You can follow your application any time by signing in to the recruitment portal. Please quote your application number in all correspondence.</p>

        <p style="margin-top: 30px;">Best Regards,<br /><strong>Human Resources &amp; Recruitment Cell</strong><br />D Y Patil International University, Akurdi, Pune</p>
      </div>
    </div>
  `;

  const plain = [
    `Dear ${candidateName},`,
    '',
    `Your application ${applicationNumber} for ${position} is now: ${label}.`,
    comment ? `Remarks: ${comment}` : '',
    nextStep || '',
    '',
    'Recruitment Cell, D Y Patil International University, Akurdi, Pune'
  ].filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n');

  return sendEmail({ to, subject, html, text: plain, meta });
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
            ${interviewTitle || 'Interview Session Details'}
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
                <span style="background-color: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 800;">VIDEO CONFERENCE</span>
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
              <td style="color: #64748b; font-weight: 600;">Meeting ID:</td>
              <td style="color: #0f172a; font-family: monospace; font-size: 15px; font-weight: 700;">${zoomMeetingId}</td>
            </tr>` : ''}
            ${zoomPassword ? `
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Meeting Passcode:</td>
              <td style="color: #0f172a; font-family: monospace; font-size: 15px; font-weight: 700;">${zoomPassword}</td>
            </tr>` : ''}
          </table>

          <!-- Clickable Zoom Button -->
          ${zoomLink ? `
          <div style="text-align: center; margin-top: 22px;">
            <a href="${zoomLink}" target="_blank" style="display: inline-block; background-color: #1f2937; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(45, 140, 255, 0.35);">
              Join Online Meeting &rarr;
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
    text: `Dear ${candidateName}, Your interview for ${jobTitle} is scheduled on ${formattedDate} at ${timeDisplay}. Meeting Link: ${zoomLink}`
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

/**
 * FEATURE 1: Email candidate when interview is scheduled with a panel
 */
async function sendCandidateInterviewInvite({
  to,
  candidateName,
  position,
  panelName,
  scheduledAt,
  durationMinutes = 30,
  zoomJoinUrl,
  zoomMeetingId,
  zoomPassword,
  notes
}) {
  const formattedDate = new Date(scheduledAt).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = new Date(scheduledAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const subject = `Interview scheduled — ${position}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, #721b28 0%, #4a1019 100%); padding: 26px 30px; color: #ffffff; border-bottom: 3px solid #D4AF37;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; font-family: Georgia, serif;">D Y PATIL INTERNATIONAL UNIVERSITY</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #FCD34D; font-weight: 600; text-transform: uppercase;">Akurdi, Pune · Recruitment Cell</p>
      </div>

      <div style="padding: 30px; color: #1e293b; line-height: 1.65; font-size: 15px;">
        <p style="margin-top: 0;">Dear <strong>${candidateName || 'Candidate'}</strong>,</p>
        <p>You have been shortlisted and scheduled for an interview for the position of <strong>${position}</strong> at D Y Patil International University, Pune.</p>

        <div style="background: #fdfaf7; border: 1.5px solid #fed7aa; border-radius: 10px; padding: 20px; margin: 24px 0;">
          <div style="font-size: 12px; font-weight: 800; color: #721b28; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
            Interview Session Details
          </div>

          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600; width: 35%;">Position:</td>
              <td style="color: #0f172a; font-weight: 700;">${position}</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Interview Panel:</td>
              <td style="color: #721b28; font-weight: 700;">${panelName || 'Interview Panel'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Date & Time:</td>
              <td style="color: #0f172a; font-weight: 700;">${formattedDate} at ${formattedTime} (IST)</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Duration:</td>
              <td style="color: #0f172a; font-weight: 700;">${durationMinutes} minutes</td>
            </tr>
            ${zoomJoinUrl ? `
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Platform:</td>
              <td style="color: #0f172a; font-weight: 700;">Video Conference (Online Meeting)</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Meeting ID:</td>
              <td style="color: #0f172a; font-family: monospace; font-size: 15px; font-weight: 700;">${zoomMeetingId || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Password:</td>
              <td style="color: #0f172a; font-family: monospace; font-size: 15px; font-weight: 700;">${zoomPassword || 'N/A'}</td>
            </tr>
            ` : `
            <tr>
              <td style="color: #64748b; font-weight: 600;">Venue / Link:</td>
              <td style="color: #0f172a; font-weight: 700;">To be communicated / On campus</td>
            </tr>
            `}
          </table>

          ${zoomJoinUrl ? `
          <div style="text-align: center; margin-top: 20px;">
            <a href="${zoomJoinUrl}" target="_blank" style="display: inline-block; background-color: #721b28; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; font-size: 14px; letter-spacing: 0.3px;">
              Join Meeting &rarr;
            </a>
          </div>
          ` : ''}
        </div>

        ${notes ? `
        <div style="background: #f8fafc; border-left: 4px solid #721b28; padding: 12px 16px; margin: 16px 0; font-size: 13.5px; color: #334155;">
          <strong>Instructions / Notes:</strong><br />
          ${notes}
        </div>
        ` : ''}

        <p style="margin-top: 24px;">Please be present in the virtual waiting room 5-10 minutes prior to your scheduled time with your presentation and qualification certificates ready.</p>

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
    text: `Interview scheduled for ${position} on ${formattedDate} at ${formattedTime}. Panel: ${panelName}. Meeting Link: ${zoomJoinUrl || 'N/A'}`
  });
}

/**
 * FEATURE 1: Email panelist when assigned to an interview.
 * Accepts optional attachments array (candidate resume/CV files).
 */
async function sendPanelistInterviewInvite({
  to,
  panelistName,
  candidateName,
  position,
  panelName,
  scheduledAt,
  durationMinutes = 30,
  zoomStartUrl,
  zoomJoinUrl,
  zoomMeetingId,
  zoomPassword,
  otherPanelists = [],
  notes,
  attachments = []
}) {
  const formattedDate = new Date(scheduledAt).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = new Date(scheduledAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const subject = `Interview assignment — ${candidateName} — ${position}`;
  const meetingUrl = zoomStartUrl || zoomJoinUrl;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, #721b28 0%, #4a1019 100%); padding: 26px 30px; color: #ffffff; border-bottom: 3px solid #D4AF37;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; font-family: Georgia, serif;">D Y PATIL INTERNATIONAL UNIVERSITY</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #FCD34D; font-weight: 600; text-transform: uppercase;">Akurdi, Pune · Recruitment Cell</p>
      </div>

      <div style="padding: 30px; color: #1e293b; line-height: 1.65; font-size: 15px;">
        <p style="margin-top: 0;">Dear <strong>${panelistName || 'Panelist'}</strong>,</p>
        <p>You have been assigned as an interview panelist for candidate <strong>${candidateName}</strong> applying for the position of <strong>${position}</strong> (${panelName || 'Interview Panel'}).</p>

        <div style="background: #fdfaf7; border: 1.5px solid #fed7aa; border-radius: 10px; padding: 20px; margin: 24px 0;">
          <div style="font-size: 12px; font-weight: 800; color: #721b28; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
            Interview Session Details
          </div>

          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600; width: 35%;">Candidate:</td>
              <td style="color: #0f172a; font-weight: 700;">${candidateName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Position:</td>
              <td style="color: #0f172a; font-weight: 700;">${position}</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Panel:</td>
              <td style="color: #721b28; font-weight: 700;">${panelName || 'Interview Panel'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Date & Time:</td>
              <td style="color: #0f172a; font-weight: 700;">${formattedDate} at ${formattedTime} (IST)</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Duration:</td>
              <td style="color: #0f172a; font-weight: 700;">${durationMinutes} minutes</td>
            </tr>
            ${otherPanelists.length > 0 ? `
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Co-Panelists:</td>
              <td style="color: #0f172a; font-weight: 600;">${otherPanelists.join(', ')}</td>
            </tr>
            ` : ''}
            ${meetingUrl ? `
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Platform:</td>
              <td style="color: #0f172a; font-weight: 700;">Video Conference (Online Meeting)</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Meeting ID:</td>
              <td style="color: #0f172a; font-family: monospace; font-size: 15px; font-weight: 700;">${zoomMeetingId || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #fee2e2;">
              <td style="color: #64748b; font-weight: 600;">Password:</td>
              <td style="color: #0f172a; font-family: monospace; font-size: 15px; font-weight: 700;">${zoomPassword || 'N/A'}</td>
            </tr>
            ` : ''}
          </table>

          ${meetingUrl ? `
          <div style="text-align: center; margin-top: 20px;">
            <a href="${meetingUrl}" target="_blank" style="display: inline-block; background-color: #721b28; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; font-size: 14px; letter-spacing: 0.3px;">
              Start / Join Meeting &rarr;
            </a>
          </div>
          ` : ''}
        </div>

        ${notes ? `
        <div style="background: #f8fafc; border-left: 4px solid #721b28; padding: 12px 16px; margin: 16px 0; font-size: 13.5px; color: #334155;">
          <strong>Administrative Notes:</strong><br />
          ${notes}
        </div>
        ` : ''}

        <p style="margin-top: 28px;">
          Best regards,<br />
          <strong>Recruitment Cell & HR Office</strong><br />
          D Y Patil International University, Pune
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Interview assignment for ${candidateName} applying for ${position} on ${formattedDate} at ${formattedTime}. Panel: ${panelName}. Meeting Link: ${meetingUrl || 'N/A'}. Candidate resume/CV attached for your reference.`,
    attachments: (attachments && attachments.length > 0) ? attachments : undefined
  });
}

module.exports = {
  sendEmail,
  getEmailProviderStatus,
  sendOTPEmail,
  sendSubmissionConfirmationEmail,
  sendApplicationStatusEmail,
  sendInterviewScheduledEmail,
  sendInterviewCancelledEmail,
  sendDocumentRequestEmail,
  sendDocumentVerificationUpdateEmail,
  sendCandidateInterviewInvite,
  sendPanelistInterviewInvite
};

