import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { statusLabel, statusBadgeClass, APPLICATION_STATUS } from '../utils/status';

/**
 * Calculates countdown string from now until interview date/time.
 */
function getCountdown(dateStr, timeStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target - now;

  if (diffMs <= -2 * 60 * 60 * 1000) {
    return { text: 'Completed', isPast: true, urgent: false };
  }
  if (diffMs < 0) {
    return { text: 'Happening Now / In Progress', isPast: false, urgent: true };
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
  return { text: `${minutes}m remaining!`, isPast: false, urgent: true };
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
    <div className="container" style={{ maxWidth: '980px', padding: '30px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: '#8B1235', margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.3px', fontFamily: "'Playfair Display', Georgia, serif" }}>
          Applicant Portal Dashboard
        </h2>
        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
          Manage your job applications, join scheduled Zoom interviews, and upload original documents requested by HR.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '10px', marginBottom: '20px', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {/* ============================================================== */}
      {/* FEATURE 2: DOCUMENT UPLOAD REQUIRED NOTIFICATION BANNER */}
      {/* ============================================================== */}
      {pendingDocRequests.length > 0 && (
        <div style={{
          backgroundColor: '#FFF1F2',
          border: '1.5px solid #F43F5E',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '26px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 15px rgba(244, 63, 94, 0.08)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ backgroundColor: '#E11D48', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                Action Required
              </span>
              <span style={{ color: '#9F1239', fontSize: '0.85rem', fontWeight: 700 }}>
                Original Documents Requested by HR
              </span>
            </div>
            <h3 style={{ margin: '0 0 4px 0', color: '#881337', fontSize: '1.12rem', fontWeight: 800 }}>
              Please Upload Your Original Verification Documents
            </h3>
            <p style={{ margin: 0, color: '#4C0519', fontSize: '0.85rem' }}>
              HR has reviewed your application and requested you to upload original marksheets & certificates through the portal before the deadline.
            </p>
          </div>

          <Link
            to="/applicant/documents"
            style={{
              backgroundColor: '#8B1235',
              color: '#FCD34D',
              padding: '11px 22px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.86rem',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(139, 18, 53, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Upload Documents Now &rarr;</span>
          </Link>
        </div>
      )}

      {/* ============================================================== */}
      {/* FEATURE 1: CANDIDATE "MY INTERVIEWS" SECTION WITH ZOOM LINK */}
      {/* ============================================================== */}
      {upcomingInterviews.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1.25rem', fontWeight: 800 }}>
              🎥 My Scheduled Interviews ({upcomingInterviews.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {upcomingInterviews.map((inv) => {
              const countdown = getCountdown(inv.date, inv.startTime);
              const formattedDate = new Date(inv.date).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
              const timeDisplay = inv.startTime && inv.endTime ? `${inv.startTime} to ${inv.endTime} (IST)` : (inv.startTime || inv.time);
              const zoomUrl = inv.zoomLink || inv.meetingLink;

              return (
                <div
                  key={inv.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #BAE6FD',
                    borderRadius: '14px',
                    padding: '22px 26px',
                    boxShadow: '0 4px 15px rgba(2, 132, 199, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#2D8CFF', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                          ZOOM INTERVIEW
                        </span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '4px' }}>
                          {inv.round || inv.interviewType || 'Round 1'}
                        </span>
                        {countdown && (
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: countdown.urgent ? '#FEE2E2' : '#FEF3C7',
                            color: countdown.urgent ? '#DC2626' : '#92400E'
                          }}>
                            ⏳ {countdown.text}
                          </span>
                        )}
                      </div>

                      <h4 style={{ margin: '0 0 2px 0', fontSize: '1.18rem', fontWeight: 800, color: '#0F172A' }}>
                        {inv.title || `${inv.job?.position || 'Faculty Position'} Interview`}
                      </h4>
                      <div style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 600 }}>
                        {inv.job?.position} · {inv.job?.department || 'DYPIU Pune'}
                      </div>
                    </div>

                    {/* Join Meeting Action Button */}
                    {zoomUrl ? (
                      <a
                        href={zoomUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          backgroundColor: '#2D8CFF',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          boxShadow: '0 4px 12px rgba(45, 140, 255, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span>🎥 Join Zoom Meeting</span>
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Link pending</span>
                    )}
                  </div>

                  {/* Meeting Details Table */}
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.84rem' }}>
                    <div>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Date:</span>{' '}
                      <strong style={{ color: '#0F172A' }}>{formattedDate}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Time:</span>{' '}
                      <strong style={{ color: '#721B28' }}>{timeDisplay}</strong>
                    </div>
                    {inv.zoomMeetingId && (
                      <div>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Meeting ID:</span>{' '}
                        <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', color: '#0F172A' }}>{inv.zoomMeetingId}</code>
                      </div>
                    )}
                    {inv.zoomPassword && (
                      <div>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Passcode:</span>{' '}
                        <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', color: '#0F172A' }}>{inv.zoomPassword}</code>
                      </div>
                    )}
                    {inv.interviewerName && (
                      <div>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Panel:</span>{' '}
                        <strong style={{ color: '#0F172A' }}>{inv.interviewerName}</strong>
                      </div>
                    )}
                  </div>

                  {inv.notes && (
                    <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#475569', backgroundColor: '#FFFBEB', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #F59E0B' }}>
                      <strong>Instructions:</strong> {inv.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications Box */}
      {notifications.length > 0 && notifications.some(n => !n.isRead) && (
        <div style={{ border: '1px solid #fecaca', padding: '18px', backgroundColor: '#fef2f2', borderRadius: '12px', marginBottom: '28px' }}>
          <h3 style={{ marginTop: 0, color: '#8B1235', fontSize: '0.98rem', fontWeight: 800, borderBottom: '1px solid #fecaca', paddingBottom: '8px' }}>
            Notifications & Status Updates
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {notifications.filter(n => !n.isRead).map(notif => (
              <li key={notif.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                <span>{notif.content}</span>
                <button 
                  onClick={() => handleMarkAsRead(notif.id)}
                  style={{ backgroundColor: '#8B1235', color: '#FCD34D', border: 'none', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Applications Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1.25rem', fontWeight: 800 }}>
          My Applications
        </h3>
        <Link
          to="/applicant/documents"
          style={{ fontSize: '0.84rem', color: '#8B1235', fontWeight: 700, textDecoration: 'none' }}
        >
          View My Documents &rarr;
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ fontWeight: 600 }}>Loading your applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: '14px', padding: '40px 24px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#8B1235', fontSize: '1.15rem', fontWeight: 800 }}>No applications found</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>You have not started any job applications yet.</p>
          <Link to="/teaching" style={{ backgroundColor: '#8B1235', color: '#FCD34D', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 800, fontSize: '0.88rem', display: 'inline-block' }}>
            Browse Teaching & Non-Teaching Openings
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {applications.map((app) => {
            const isDraft = app.status === APPLICATION_STATUS.DRAFT;
            const currentStep = app.currentStep || 1;
            const completionPct = app.completionPercentage || Math.round((currentStep / 7) * 100);

            return (
              <div
                key={app.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: isDraft ? '1.5px solid #8B1235' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '22px 26px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDraft ? '#8B1235' : '#0f172a' }}>
                      {isDraft ? 'INCOMPLETE DRAFT' : (app.applicationNumber || 'DYPIU-2026')}
                    </span>
                    <span className={`status-badge ${getStatusBadgeClass(app.status)}`}>
                      {statusLabel(app.status)}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.12rem', fontWeight: 800 }}>
                    {app.job?.position || app.personalInfo?.postAppliedFor || 'Faculty Position'}
                  </h3>

                  <div style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 600 }}>
                    {app.job?.department || app.job?.school?.name || app.personalInfo?.faculty || 'DYPIU Department'}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px' }}>
                    Last Updated: {new Date(app.updatedAt || app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>

                  {/* Progress Bar for Draft Applications */}
                  {isDraft && (
                    <div style={{ marginTop: '12px', maxWidth: '320px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 700, color: '#8B1235', marginBottom: '4px' }}>
                        <span>Progress: Step {currentStep} of 7</span>
                        <span>{completionPct}%</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${completionPct}%`, height: '100%', backgroundColor: '#8B1235', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {isDraft ? (
                    <button
                      onClick={() => navigate(`/apply?jobId=${app.jobId}&draftId=${app.id}&step=${currentStep}`)}
                      style={{
                        backgroundColor: '#8B1235',
                        color: '#FCD34D',
                        border: 'none',
                        padding: '11px 22px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(139, 18, 53, 0.25)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Continue Application &rarr;
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate(`/applicant/applications/${app.id}`)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          color: '#8B1235',
                          padding: '9px 18px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: 'pointer'
                        }}
                      >
                        View Application
                      </button>
                      <button
                        onClick={() => navigate('/applicant/documents')}
                        style={{
                          backgroundColor: '#8B1235',
                          color: '#FCD34D',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: 'pointer'
                        }}
                      >
                        Upload Documents
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ApplicantDashboard;
