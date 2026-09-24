/**
 * ZeptoMail Standalone Test Script
 * Pure Node.js (Zero external dependencies needed!)
 *
 * Usage:
 *   node test-zeptomail.js <your_email@gmail.com>
 *
 * Or override credentials on the fly:
 *   ZEPTOMAIL_TOKEN="Zoho-enczapikey ..." node test-zeptomail.js your_email@gmail.com
 */

const fs = require('fs');
const path = require('path');

// Manually parse .env files if dotenv is not globally installed
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

// Check backend/.env first, then root .env
loadEnvFile(path.join(__dirname, 'backend', '.env'));
loadEnvFile(path.join(__dirname, '.env'));

const RECIPIENT = process.argv[2] || process.env.TEST_EMAIL_RECIPIENT || '';

const CONFIG = {
  // ZeptoMail API URL:
  // For India data center: 'https://api.zeptomail.in/v1.1/email'
  // For US / Global data center: 'https://api.zeptomail.com/v1.1/email'
  apiUrl: process.env.ZEPTOMAIL_API_URL || 'https://api.zeptomail.in/v1.1/email',

  // ZeptoMail Send Mail Token (Starts with "Zoho-enczapikey ...")
  token: process.env.ZEPTOMAIL_TOKEN || process.env.ZEPTOMAIL_PASSWORD || '',

  // Sender Email: MUST be verified in your ZeptoMail Mail Agent!
  fromAddress: process.env.ZEPTOMAIL_FROM_EMAIL || 'careers@dypiu.ac.in',
  fromName: process.env.ZEPTOMAIL_FROM_NAME || 'Recruitment Cell - DYPIU',

  // SMTP Settings (Optional)
  smtpHost: process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
  smtpPort: parseInt(process.env.ZEPTOMAIL_PORT || '587', 10),
  smtpUser: process.env.ZEPTOMAIL_USERNAME || 'emailapikey'
};

async function testViaRestApi() {
  console.log('\n=============================================================');
  console.log('📬 1. TESTING ZEPTOMAIL REST API (Recommended)');
  console.log('=============================================================');
  console.log(`Endpoint:    ${CONFIG.apiUrl}`);
  console.log(`Sender:      "${CONFIG.fromName}" <${CONFIG.fromAddress}>`);
  console.log(`Recipient:   ${RECIPIENT}`);
  console.log(`Token set:   ${CONFIG.token ? 'YES (' + CONFIG.token.substring(0, 15) + '...)' : '❌ NO (Missing)'}`);

  if (!CONFIG.token) {
    console.error('\n❌ ERROR: ZEPTOMAIL_TOKEN (or ZEPTOMAIL_PASSWORD) is missing!');
    console.log('👉 Please add your token into backend/.env:');
    console.log('   ZEPTOMAIL_TOKEN="Zoho-enczapikey your_token_here"\n');
    return false;
  }

  const authHeader = CONFIG.token.startsWith('Zoho-enczapikey')
    ? CONFIG.token
    : `Zoho-enczapikey ${CONFIG.token}`;

  const payload = {
    bounce_address: process.env.ZEPTOMAIL_BOUNCE_ADDRESS || undefined,
    from: {
      address: CONFIG.fromAddress,
      name: CONFIG.fromName
    },
    to: [
      {
        email_address: {
          address: RECIPIENT,
          name: RECIPIENT.split('@')[0]
        }
      }
    ],
    subject: 'ZeptoMail Verification Test - DYPIU Recruitment Portal',
    htmlbody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #721b28; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 22px;">D Y Patil International University</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Recruitment Portal Notification System</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <h3 style="color: #0f172a; margin-top: 0;">ZeptoMail Integration Successful! 🎉</h3>
          <p>This is a live test email sent from the DYPIU Recruitment Portal.</p>
          <div style="background: #f8fafc; border-left: 4px solid #721b28; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>Verified Sender:</strong> ${CONFIG.fromAddress}</p>
            <p style="margin: 4px 0 0 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>Your mail agent and API credentials are verified and ready for production dispatch.</p>
        </div>
        <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
          D Y Patil International University · Akurdi, Pune
        </div>
      </div>
    `
  };

  try {
    const response = await fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('\n🎉 SUCCESS! Email dispatched via ZeptoMail REST API.');
      console.log('Response Details:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error(`\n❌ ZeptoMail API rejected the request (Status ${response.status}):`);
      console.error(JSON.stringify(data, null, 2));
      
      console.log('\n💡 Common Troubleshooting Tips:');
      console.log(' 1. "sender_email_not_verified" -> Make sure "' + CONFIG.fromAddress + '" is added and verified under Mail Agent > Sender Address in ZeptoMail.');
      console.log(' 2. "invalid_token" / 401 -> Check that token starts with "Zoho-enczapikey " and belongs to this Mail Agent.');
      console.log(' 3. Domain region mismatch -> If your account is zeptomail.com instead of zeptomail.in, change ZEPTOMAIL_API_URL to https://api.zeptomail.com/v1.1/email');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Network error while calling ZeptoMail:', error.message);
    return false;
  }
}

async function testViaSmtp() {
  console.log('\n=============================================================');
  console.log('📧 2. TESTING ZEPTOMAIL VIA SMTP (Nodemailer)');
  console.log('=============================================================');
  let nodemailer;
  try {
    nodemailer = require('./backend/node_modules/nodemailer');
  } catch (e) {
    console.log('ℹ️ Nodemailer not found. Skipping SMTP test.');
    return;
  }

  console.log(`Host:        ${CONFIG.smtpHost}:${CONFIG.smtpPort}`);
  console.log(`Username:    ${CONFIG.smtpUser}`);
  console.log(`Sender:      "${CONFIG.fromName}" <${CONFIG.fromAddress}>`);

  if (!CONFIG.token) {
    console.error('❌ Password/token is missing for SMTP.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: CONFIG.smtpHost,
    port: CONFIG.smtpPort,
    secure: CONFIG.smtpPort === 465,
    auth: {
      user: CONFIG.smtpUser,
      pass: CONFIG.token
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `"${CONFIG.fromName}" <${CONFIG.fromAddress}>`,
      to: RECIPIENT,
      subject: 'ZeptoMail SMTP Test - DYPIU Recruitment Portal',
      text: 'Test email sent via ZeptoMail SMTP from DYPIU Recruitment Portal.',
      html: '<p>Test email sent successfully via <b>ZeptoMail SMTP</b>!</p>'
    });
    console.log('🎉 SUCCESS! SMTP email delivered. Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP delivery failed:', error.message);
  }
}

async function main() {
  if (!RECIPIENT || !RECIPIENT.includes('@')) {
    console.log('=============================================================');
    console.log('⚠️  USAGE:');
    console.log('   node test-zeptomail.js <recipient_email>');
    console.log('');
    console.log('👉 Example:');
    console.log('   node test-zeptomail.js your_email@gmail.com');
    console.log('=============================================================');
    process.exit(1);
  }

  console.log(`🚀 Starting ZeptoMail Test for: ${RECIPIENT}`);
  await testViaRestApi();
  await testViaSmtp();
}

main();
