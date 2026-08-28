const nodemailer = require('nodemailer');

// Abstracted Email Provider Interface
// Initially powered by SMTP via Nodemailer.
// Swapping to AWS SES / SendGrid / Resend in production only requires updating this file.

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '"DYPIU Recruitment Cell" <careers@dypiu.ac.in>';

let transporter = null;

if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

/**
 * Generic email dispatcher abstraction.
 */
async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log(`[Email Service Stub] Email to ${to} | Subject: ${subject}`);
    return { success: true, mode: 'stub' };
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text,
      html
    });
    console.log(`[Email Service] Sent email to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Service Error] Failed sending email to ${to}:`, error.message);
    // Suppress error so email delivery failures do not crash API transactions
    return { success: false, error: error.message };
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

        <p>You can track the full details and history of your application anytime by logging into the candidate dashboard or using the Track Application portal.</p>

        <p style="margin-top: 30px;">Best Regards,<br /><strong>Human Resources & Recruitment Cell</strong><br />D Y Patil International University, Akurdi, Pune</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html, text: `Dear ${candidateName}, Your application ${applicationNumber} for ${position} status is now: ${status}.` });
}

module.exports = {
  sendEmail,
  sendApplicationStatusEmail
};
