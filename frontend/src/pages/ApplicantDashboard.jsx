import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { statusLabel, statusBadgeClass, APPLICATION_STATUS } from '../utils/status';

/**
 * Calculates countdown string from now until interview date/time.
 */
function getCountdown(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target - now;

  if (diffMs <= -2 * 60 * 60 * 1000) {
    return { text: 'Completed', isPast: true, urgent: false };
  }
  if (diffMs < 0) {
    return { text: 'Happening Now', isPast: false, urgent: true };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return { text: `${days}d ${hours}h remaining`, isPast: false, urgent: false };
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes}m remaining`, isPast: false, urgent: hours < 2 };
  }
  return { text: `${minutes}m remaining`, isPast: false, urgent: true };
}

function ApplicantDashboard() {
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [docRequests, setDocRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [appsData, interviewsData, docsData, notifData] = await Promise.all([
          apiRequest('/applications/my'),
          apiRequest('/interviews/my').catch(() => []),
          apiRequest('/documents/my').catch(() => []),
          apiRequest('/notifications').catch(() => [])
        ]);

        setApplications(Array.isArray(appsData) ? appsData : (appsData?.data || []));
        setInterviews(Array.isArray(interviewsData) ? interviewsData : []);
        setDocRequests(Array.isArray(docsData) ? docsData : []);
        setNotifications(Array.isArray(notifData) ? notifData : (notifData?.data || []));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const getStatusBadgeClass = statusBadgeClass;

  // Active Document Requests needing candidate action
  const pendingDocRequests = docRequests.filter(r => r.status !== 'VERIFIED');
  const upcomingInterviews = interviews.filter(i => i.status !== 'CANCELLED');

  return (
    <>
      <style>{`
        .ad-page {
          max-width: 860px;
          margin: 0 auto;
          padding: 32px 20px 48px;
          color: #1f2937;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.5;
        }

        .ad-header {
          margin-bottom: 24px;
        }

        .ad-title {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }

        .ad-subtitle {
          font-size: 14px;
          color: #4b5563;
          margin: 0;
        }

        /* ===== ALERT / ACTION CARD ===== */
        .ad-alert-card {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 20px 22px;
          margin-bottom: 30px;
        }

        .ad-alert-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #92400e;
          background: #fef3c7;
          border: 1px solid #fde68a;
          padding: 3px 8px;
          border-radius: 4px;
          margin-bottom: 10px;
        }

        .ad-alert-card h2 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 6px 0;
        }

        .ad-alert-card p {
          font-size: 13.5px;
          color: #4b5563;
          margin: 0 0 16px 0;
          max-width: 580px;
        }

        .ad-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid transparent;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s;
        }

        .ad-btn-dark {
          background: #1f2937;
          color: #ffffff;
          border-color: #1f2937;
        }

        .ad-btn-dark:hover {
          background: #111827;
          color: #ffffff;
        }

        .ad-btn-outline {
          background: #ffffff;
          color: #1f2937;
          border-color: #e5e7eb;
        }

        .ad-btn-outline:hover {
          background: #f3f4f6;
        }

        .ad-btn-sm {
          font-size: 12.5px;
          padding: 5px 12px;
        }

        /* ===== SECTION ===== */
        .ad-section {
          margin-bottom: 32px;
        }

        .ad-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .ad-section-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ad-section-header h3 {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .ad-count {
          font-size: 13px;
          font-weight: 500;
          color: #9ca3af;
        }

        /* ===== INTERVIEW CARD ===== */
        .ad-interview-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 18px 20px;
          margin-bottom: 14px;
        }

        .ad-interview-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .ad-chip {
          display: inline-flex;
          align-items: center;
          font-size: 11.5px;
          font-weight: 500;
          padding: 3px 9px;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
          background: #f3f4f6;
          color: #4b5563;
        }

        .ad-chip-time {
          background: #fffbeb;
          border-color: #fde68a;
          color: #92400e;
        }

        .ad-chip-urgent {
          background: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        }

        .ad-link-status {
          margin-left: auto;
          font-size: 12.5px;
          color: #9ca3af;
        }

        .ad-interview-card h4 {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 3px 0;
        }

        .ad-interview-card .ad-role {
          font-size: 13px;
          color: #4b5563;
          margin: 0 0 14px 0;
        }

        .ad-detail-row {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          padding: 12px 14px;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .ad-detail-item {
          font-size: 13px;
          color: #4b5563;
        }

        .ad-detail-item strong {
          color: #1f2937;
          font-weight: 600;
        }

        /* ===== NOTIFICATIONS ===== */
        .ad-notif-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .ad-notif-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          padding: 14px 18px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .ad-notif-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px;
          border-bottom: 1px solid #f3f4f6;
        }

        .ad-notif-item:last-child {
          border-bottom: none;
        }

        .ad-notif-item p {
          font-size: 13.5px;
          color: #4b5563;
          margin: 0;
          flex: 1;
        }

        .ad-notif-item p span {
          font-weight: 600;
          color: #1f2937;
        }

        /* ===== APPLICATIONS LIST ===== */
        .ad-app-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 18px 20px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          transition: border-color 0.15s ease;
        }

        .ad-app-card:hover {
          border-color: #d1d5db;
        }

        .ad-app-info {
          flex: 1;
          min-width: 250px;
        }

        .ad-app-topline {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .ad-app-num {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
        }

        .ad-app-pos {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 2px 0;
        }

        .ad-app-dept {
          font-size: 13px;
          color: #4b5563;
        }

        .ad-app-date {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 6px;
        }

        .ad-progress-wrap {
          margin-top: 10px;
          max-width: 280px;
        }

        .ad-progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .ad-progress-bar {
          height: 5px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }

        .ad-progress-fill {
          height: 100%;
          background: #1f2937;
          border-radius: 3px;
        }
      `}</style>

      <div className="ad-page">

        {/* HEADER */}
        <div className="ad-header">
          <h1 className="ad-title">Applicant Portal Dashboard</h1>
          <p className="ad-subtitle">
            Manage your job applications, join scheduled interviews, and upload original documents requested by HR.
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', marginBottom: '24px', fontSize: '13.5px' }}>
            {error}
          </div>
        )}

        {/* ============================================================== */}
        {/* DOCUMENT REQUEST ALERT CARD - Soft amber, only when requested */}
        {/* ============================================================== */}
        {pendingDocRequests.length > 0 && (
          <div className="ad-alert-card">
            <span className="ad-alert-tag">Action required</span>
            <h2>Upload original verification documents</h2>
            <p>
              HR has reviewed your application and requested original marksheets and certificates
              through the portal before the deadline.
            </p>
            <Link to="/applicant/documents" className="ad-btn ad-btn-dark">
              Upload documents &rarr;
            </Link>
          </div>
        )}

        {/* ============================================================== */}
        {/* MY SCHEDULED INTERVIEWS */}
        {/* ============================================================== */}
        {upcomingInterviews.length > 0 && (
          <div className="ad-section">
            <div className="ad-section-header">
              <div className="ad-section-title-wrap">
                <h3>My scheduled interviews</h3>
                <span className="ad-count">({upcomingInterviews.length})</span>
              </div>
            </div>

            {upcomingInterviews.map((interview) => {
              const countdown = getCountdown(interview.scheduledAt);
              const meetingUrl = interview.meetingLink || interview.zoomJoinUrl;
              const formattedDate = new Date(interview.scheduledAt).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
              const formattedTime = new Date(interview.scheduledAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
              });
              const position = interview.application?.job?.position || interview.application?.personalInfo?.postAppliedFor || 'Faculty Position';
              const schoolOrDept = interview.application?.job?.department || interview.application?.job?.school?.name || interview.application?.personalInfo?.faculty || 'D Y Patil International University';
              const panelistName = interview.panel?.name || interview.panelist?.name || 'Recruitment Cell Panel';

              return (
                <div key={interview.id} className="ad-interview-card">
                  <div className="ad-interview-meta">
                    <span className="ad-chip">Interview</span>
                    <span className="ad-chip">{interview.panel?.name || interview.round || 'Selection Panel'}</span>
                    {countdown && (
                      <span className={`ad-chip ${countdown.urgent ? 'ad-chip-urgent' : 'ad-chip-time'}`}>
                        {countdown.text}
                      </span>
                    )}
                    <span className="ad-link-status">
                      {meetingUrl ? (
                        <a
                          href={meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                        >
                          Join Meeting &rarr;
                        </a>
                      ) : (
                        'Link pending'
                      )}
                    </span>
                  </div>

                  <h4>Interview &mdash; {interview.panel?.name || 'Interview Panel'} &mdash; {position}</h4>
                  <p className="ad-role">{position} &middot; {schoolOrDept}</p>

                  <div className="ad-detail-row">
                    <div className="ad-detail-item">
                      Date: <strong>{formattedDate}</strong>
                    </div>
                    <div className="ad-detail-item">
                      Time: <strong>{formattedTime}</strong>
                    </div>
                    <div className="ad-detail-item">
                      Panel: <strong>{panelistName}</strong>
                    </div>
                    {meetingUrl && (
                      <div className="ad-detail-item">
                        Meeting Link: <strong><a href={meetingUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>Open Meeting Room</a></strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============================================================== */}
        {/* NOTIFICATIONS & STATUS UPDATES */}
        {/* ============================================================== */}
        {notifications.length > 0 && (
          <div className="ad-section">
            <div className="ad-notif-card">
              <div className="ad-notif-title">Notifications &amp; status updates</div>
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="ad-notif-item">
                  <p>
                    <span>{n.title}:</span> {n.message}
                  </p>
                  {!n.isRead && (
                    <button
                      type="button"
                      className="ad-btn ad-btn-outline ad-btn-sm"
                      onClick={() => handleMarkAsRead(n.id)}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MY APPLICATIONS */}
        {/* ============================================================== */}
        <div className="ad-section">
          <div className="ad-section-header">
            <div className="ad-section-title-wrap">
              <h3>My Applications</h3>
              <span className="ad-count">({applications.length})</span>
            </div>
            {/* Documents link is only visible when HR has requested documents */}
            {docRequests.length > 0 && (
              <Link
                to="/applicant/documents"
                style={{ fontSize: '13px', color: '#1f2937', fontWeight: 600, textDecoration: 'none' }}
              >
                View My Documents &rarr;
              </Link>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#6b7280' }}>
              <div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>
              <p style={{ fontSize: '13.5px', margin: 0 }}>Loading your applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div style={{ border: '1.5px dashed #e5e7eb', borderRadius: '8px', padding: '36px 20px', textAlign: 'center', background: '#f9fafb' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600, color: '#111827' }}>No applications found</h4>
              <p style={{ color: '#6b7280', fontSize: '13.5px', marginBottom: '18px' }}>You have not started any job applications yet.</p>
              <Link to="/teaching" className="ad-btn ad-btn-dark">
                Browse Faculty Openings
              </Link>
            </div>
          ) : (
            <div>
              {applications.map((app) => {
                const isDraft = app.status === APPLICATION_STATUS.DRAFT;
                const currentStep = app.currentStep || 1;
                const completionPct = app.completionPercentage || Math.round((currentStep / 7) * 100);

                return (
                  <div key={app.id} className="ad-app-card">
                    <div className="ad-app-info">
                      <div className="ad-app-topline">
                        <span className="ad-app-num">
                          {isDraft ? 'INCOMPLETE DRAFT' : (app.applicationNumber || 'APP-2026')}
                        </span>
                        <span className={`status-badge ${getStatusBadgeClass(app.status)}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                          {statusLabel(app.status)}
                        </span>
                      </div>

                      <h4 className="ad-app-pos">
                        {app.job?.position || app.personalInfo?.postAppliedFor || 'Faculty Position'}
                      </h4>

                      <div className="ad-app-dept">
                        {app.job?.department || app.job?.school?.name || app.personalInfo?.faculty || 'D Y Patil International University'}
                      </div>

                      <div className="ad-app-date">
                        Submitted/Updated: {new Date(app.updatedAt || app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>

                      {isDraft && (
                        <div className="ad-progress-wrap">
                          <div className="ad-progress-labels">
                            <span>Step {currentStep} of 7</span>
                            <span>{completionPct}%</span>
                          </div>
                          <div className="ad-progress-bar">
                            <div className="ad-progress-fill" style={{ width: `${completionPct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {isDraft ? (
                        <button
                          type="button"
                          className="ad-btn ad-btn-dark ad-btn-sm"
                          onClick={() => navigate(`/apply?jobId=${app.jobId}&draftId=${app.id}&step=${currentStep}`)}
                        >
                          Continue Application &rarr;
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="ad-btn ad-btn-outline ad-btn-sm"
                            onClick={() => navigate(`/applicant/applications/${app.id}`)}
                          >
                            View Application
                          </button>
                          {docRequests.length > 0 && (
                            <button
                              type="button"
                              className="ad-btn ad-btn-dark ad-btn-sm"
                              onClick={() => navigate('/applicant/documents')}
                            >
                              Upload Documents
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </>
  );
}

export default ApplicantDashboard;
