/**
 * Zoom Server-to-Server OAuth Meeting Generation Service
 */

function isZoomConfigured() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) return false;
  if (
    accountId.includes('<CHANGE_ME') ||
    clientId.includes('<CHANGE_ME') ||
    clientSecret.includes('<CHANGE_ME') ||
    accountId === 'CHANGE_ME' ||
    clientId === 'CHANGE_ME' ||
    clientSecret === 'CHANGE_ME'
  ) {
    return false;
  }
  return true;
}

let cachedToken = null;
let tokenExpiresAt = 0;

async function getZoomAccessToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zoom OAuth token request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

/**
 * Create a scheduled Zoom meeting
 * @param {Object} options
 * @param {string} options.topic - e.g. "DYPIU Interview — Candidate Name — Position"
 * @param {Date|string} options.startTime - ISO string or Date
 * @param {number} options.durationMinutes - e.g. 30
 * @param {string} options.agenda - optional notes
 */
async function createZoomMeeting({ topic, startTime, durationMinutes = 30, agenda = '' }) {
  if (!isZoomConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'Interview saved but Zoom link could not be generated. Configure ZOOM_* env vars.'
    };
  }

  try {
    const accessToken = await getZoomAccessToken();
    const isoStartTime = startTime instanceof Date ? startTime.toISOString() : new Date(startTime).toISOString();

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: topic || 'DYPIU Interview Meeting',
        type: 2, // Scheduled meeting
        start_time: isoStartTime,
        duration: durationMinutes || 30,
        timezone: 'Asia/Kolkata',
        agenda: agenda || 'DYPIU Recruitment Interview Evaluation Session',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          audio: 'both',
          auto_recording: 'none'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Zoom API Error]', errorData);
      return {
        success: false,
        configured: true,
        error: `Interview saved but Zoom meeting creation failed (${response.status}). Configure ZOOM_* env vars or check credentials.`
      };
    }

    const meeting = await response.json();
    return {
      success: true,
      configured: true,
      meetingId: String(meeting.id),
      joinUrl: meeting.join_url,
      startUrl: meeting.start_url,
      password: meeting.password || ''
    };
  } catch (err) {
    console.error('[Zoom Service Exception]', err);
    return {
      success: false,
      configured: true,
      error: `Interview saved but Zoom link could not be generated: ${err.message}`
    };
  }
}

module.exports = {
  isZoomConfigured,
  createZoomMeeting
};
