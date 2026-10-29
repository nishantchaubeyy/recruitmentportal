import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, API_URL } from '../utils/api';
import { statusLabel, statusBadgeClass, APPLICATION_STATUS } from '../utils/status';
import './ApplicantDashboard.css';

// Safe JSON parser helper
const parseField = (field, fallback) => {
  if (field === undefined || field === null || field === '') return fallback;
  if (typeof field === 'object') return field;
  try { return JSON.parse(field); } catch { return fallback; }
};

/**
 * Calculates countdown string from now until interview date/time.
 */
function getCountdown(dateVal) {
  if (!dateVal) return null;
  const target = new Date(dateVal);
  if (isNaN(target.getTime())) return null;
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
  const [selectedAppIndex, setSelectedAppIndex] = useState(0);
  const [interviews, setInterviews] = useState([]);
  const [docRequests, setDocRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        const [appsData, interviewsData, docsData, notifData] = await Promise.all([
          apiRequest('/applications/my').catch(() => []),
          apiRequest('/interviews/my').catch(() => []),
          apiRequest('/documents/my').catch(() => []),
          apiRequest('/notifications').catch(() => [])
        ]);

        if (isMounted) {
          const loadedApps = Array.isArray(appsData) ? appsData : (appsData?.data || []);
          setApplications(loadedApps);
          setInterviews(Array.isArray(interviewsData) ? interviewsData : []);
          setDocRequests(Array.isArray(docsData) ? docsData : []);
          setNotifications(Array.isArray(notifData) ? notifData : (notifData?.data || []));
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load dashboard data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleDownloadFile = async (e, applicationId, docId, filename) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/applications/${applicationId}/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve file.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'File download failed.');
    }
  };

  // Active Document Requests strictly requested by HR with real items
  const pendingDocRequests = (Array.isArray(docRequests) ? docRequests : []).filter(
    r => r && typeof r === 'object' && ['PENDING', 'PARTIALLY_UPLOADED', 'REJECTED'].includes(r.status) && Array.isArray(r.items) && r.items.length > 0
  );
  const upcomingInterviews = (Array.isArray(interviews) ? interviews : []).filter(
    i => i && typeof i === 'object' && i.status !== 'CANCELLED'
  );

  const selectedApp = applications[selectedAppIndex] || applications[0] || null;

  // Parsed sections of the active application
  const personal = selectedApp ? parseField(selectedApp.personalInfo, {}) : {};
  const contact = selectedApp ? parseField(selectedApp.contactDetails, {}) : {};
  const qualifications = selectedApp ? parseField(selectedApp.qualifications, []) : [];
  const experience = selectedApp ? parseField(selectedApp.experience, []) : [];
  const research = selectedApp ? parseField(selectedApp.researchDetails, {}) : {};
  const documents = selectedApp && Array.isArray(selectedApp.documents) ? selectedApp.documents : [];

  const displayTitle = (personal.title && personal.title !== 'Select' && personal.title !== 'Select Title' && personal.title !== 'Select...') ? personal.title : '';
  const candidateFullName = [displayTitle, personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || selectedApp?.applicant?.name || 'Applicant';
  const candidateEmail = personal.email || contact.email || selectedApp?.applicant?.user?.email || 'N/A';
  const candidateMobile = contact.mobile || personal.mobile || selectedApp?.applicant?.mobile || 'N/A';
  const positionTitle = selectedApp?.job?.position || personal.postAppliedFor || 'Faculty Position';
  const departmentName = selectedApp?.job?.department || selectedApp?.job?.school?.name || personal.faculty || 'D Y Patil International University';
  const isTeaching = selectedApp?.job?.type === 'TEACHING' || (personal.faculty && !personal.faculty.includes('NON-TEACHING'));
  const isDraft = selectedApp?.status === APPLICATION_STATUS.DRAFT;

  return (
    <div className="ad-page" style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      {/* HEADER */}
      <div className="ad-header" style={{ marginBottom: '20px' }}>
        <h1 className="ad-title" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
          Applicant Portal Dashboard
        </h1>
        <p className="ad-subtitle" style={{ fontSize: '0.92rem', color: '#64748b', margin: 0 }}>
          Track your application review status, scheduled interviews, and verified records.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          {error}
        </div>
      )}

      {/* ============================================================== */}
      {/* DOCUMENT REQUEST ALERT - strictly when HR requested documents */}
      {/* ============================================================== */}
      {pendingDocRequests.length > 0 && (
        <div className="ad-alert-card" style={{ marginBottom: '24px' }}>
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
        <div className="ad-section" style={{ marginBottom: '24px' }}>
          <div className="ad-section-header">
            <div className="ad-section-title-wrap">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>My Scheduled Interviews</h3>
              <span className="ad-count">({upcomingInterviews.length})</span>
            </div>
          </div>

          {upcomingInterviews.map((interview) => {
            const rawDate = interview.scheduledAt || interview.date;
            const countdown = getCountdown(rawDate);
            const meetingUrl = interview.meetingLink || interview.zoomJoinUrl || interview.zoomLink;
            const parsedDate = rawDate ? new Date(rawDate) : null;
            const formattedDate = parsedDate && !isNaN(parsedDate.getTime())
              ? parsedDate.toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })
              : 'Date communicated via email';
            const formattedTime = interview.time || (parsedDate && !isNaN(parsedDate.getTime())
              ? parsedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : 'As communicated');
            const pos = interview.application?.job?.position || interview.job?.position || 'Faculty Position';
            const dept = interview.application?.job?.department || interview.job?.department || 'D Y Patil International University';
            const panelName = interview.panel?.name || interview.interviewerName || 'Recruitment Cell Panel';

            return (
              <div key={interview.id} className="ad-interview-card" style={{ marginBottom: '12px' }}>
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
                      <a href={meetingUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                        Join Meeting &rarr;
                      </a>
                    ) : (
                      'Link pending'
                    )}
                  </span>
                </div>

                <h4>Interview &mdash; {panelName} &mdash; {pos}</h4>
                <p className="ad-role">{pos} &middot; {dept}</p>

                <div className="ad-detail-row">
                  <div className="ad-detail-item">Date: <strong>{formattedDate}</strong></div>
                  <div className="ad-detail-item">Time: <strong>{formattedTime}</strong></div>
                  <div className="ad-detail-item">Panel: <strong>{panelName}</strong></div>
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
        <div className="ad-section" style={{ marginBottom: '24px' }}>
          <div className="ad-notif-card">
            <div className="ad-notif-title">Notifications &amp; status updates</div>
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id || Math.random()} className="ad-notif-item">
                <p>
                  <span>{n.title || 'Notice'}:</span> {n.content || n.message || 'Notification received.'}
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
      {/* APPLICANT APPLICATION FORM - VERTICAL STAGE-BY-STAGE VIEW */}
      {/* ============================================================== */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ fontSize: '14px', fontWeight: 600 }}>Loading your application profile...</p>
        </div>
      ) : applications.length === 0 ? (
        <div style={{ border: '1.5px dashed #e2e8f0', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', backgroundColor: '#ffffff' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>No Applications Found</h3>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '20px' }}>You have not submitted an application yet. Explore current openings to apply.</p>
          <Link to="/teaching" className="ad-btn ad-btn-dark">
            Browse Faculty Openings &rarr;
          </Link>
        </div>
      ) : (
        <div>
          {/* Multi-application tabs if candidate submitted more than one */}
          {applications.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '18px', paddingBottom: '4px' }}>
              {applications.map((app, idx) => {
                let p = {};
                try { p = typeof app.personalInfo === 'string' ? JSON.parse(app.personalInfo) : (app.personalInfo || {}); } catch (e) {}
                const title = app.job?.position || p.postAppliedFor || `Application #${idx + 1}`;
                const isSelected = idx === selectedAppIndex;
                return (
                  <button
                    key={app.id || idx}
                    type="button"
                    onClick={() => setSelectedAppIndex(idx)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #721b28' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#721b28' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {app.applicationNumber || `APP #${idx + 1}`} &mdash; {title}
                  </button>
                );
              })}
            </div>
          )}

          {/* APPLICATION MAIN DOSSIER BANNER */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px 28px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '3px 10px', borderRadius: '4px', backgroundColor: '#721b28', color: '#ffffff', letterSpacing: '0.04em' }}>
                    {selectedApp.applicationNumber || 'APPLICATION'}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Filing Date: {selectedApp.submittedAt || selectedApp.createdAt ? new Date(selectedApp.submittedAt || selectedApp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                  {candidateFullName}
                </h2>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569', fontWeight: 600 }}>
                  Applied For: <span style={{ color: '#721b28' }}>{positionTitle}</span> &middot; {departmentName}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.04em' }}>
                  Application Status
                </div>
                <span className={`status-badge ${statusBadgeClass(selectedApp.status)}`} style={{ fontSize: '0.85rem', padding: '5px 14px' }}>
                  {statusLabel(selectedApp.status) || 'Application Submitted'}
                </span>
              </div>
            </div>

            {/* Quick candidate summary strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '12px 18px',
              backgroundColor: '#f8fafc',
              padding: '14px 18px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.84rem'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', display: 'block', fontWeight: 600 }}>Primary Email</span>
                <strong style={{ color: '#0f172a' }}>{candidateEmail}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', display: 'block', fontWeight: 600 }}>Primary Mobile</span>
                <strong style={{ color: '#0f172a' }}>{candidateMobile}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', display: 'block', fontWeight: 600 }}>Date of Birth</span>
                <strong style={{ color: '#0f172a' }}>{personal.dob || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', display: 'block', fontWeight: 600 }}>Track / Category</span>
                <strong style={{ color: '#0f172a' }}>{isTeaching ? 'Teaching & Academic Faculty' : 'Non-Teaching / Administration'}</strong>
              </div>
            </div>

            {isDraft && (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>
                  This application is currently an Incomplete Draft (Step {selectedApp.currentStep || 1} of 7).
                </span>
                <button
                  type="button"
                  className="ad-btn ad-btn-dark ad-btn-sm"
                  onClick={() => navigate(`/apply?jobId=${selectedApp.jobId}&draftId=${selectedApp.id}&step=${selectedApp.currentStep || 1}`)}
                >
                  Continue Application &rarr;
                </button>
              </div>
            )}
          </div>

          {/* VERTICAL APPLICATION STAGES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* STAGE 1: PERSONAL INFORMATION */}
            <div style={stageCardStyle}>
              <div style={stageHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={stageNumberStyle}>1</div>
                  <div>
                    <h3 style={stageTitleStyle}>Stage 1: Personal Information</h3>
                    <p style={stageSubtitleStyle}>Candidate identification, demographic particulars, and applied post</p>
                  </div>
                </div>
                <span style={stageCompletedPillStyle}>Completed ✓</span>
              </div>

              <div style={fieldsGridStyle}>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Title</span>
                  <span style={fieldValueStyle}>{personal.title || 'N/A'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>First Name</span>
                  <span style={fieldValueStyle}>{personal.firstName || 'N/A'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Middle Name</span>
                  <span style={fieldValueStyle}>{personal.middleName || '—'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Last Name</span>
                  <span style={fieldValueStyle}>{personal.lastName || 'N/A'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Date of Birth</span>
                  <span style={fieldValueStyle}>{personal.dob || 'N/A'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Age</span>
                  <span style={fieldValueStyle}>{personal.age ? `${personal.age} Years` : 'N/A'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Gender</span>
                  <span style={fieldValueStyle}>{personal.gender || 'N/A'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Marital Status</span>
                  <span style={fieldValueStyle}>{personal.maritalStatus || 'N/A'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Category / Caste</span>
                  <span style={fieldValueStyle}>{personal.category || 'Open / General'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Nationality</span>
                  <span style={fieldValueStyle}>{personal.nationality || 'Indian'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Post Applied For</span>
                  <span style={fieldValueStyle}>{positionTitle}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Faculty / Department</span>
                  <span style={fieldValueStyle}>{departmentName}</span>
                </div>
              </div>
            </div>

            {/* STAGE 2: CONTACT & ADDRESS INFORMATION */}
            <div style={stageCardStyle}>
              <div style={stageHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={stageNumberStyle}>2</div>
                  <div>
                    <h3 style={stageTitleStyle}>Stage 2: Contact & Address Information</h3>
                    <p style={stageSubtitleStyle}>Communication phone numbers, emails, and permanent residential address</p>
                  </div>
                </div>
                <span style={stageCompletedPillStyle}>Completed ✓</span>
              </div>

              <div style={fieldsGridStyle}>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Primary Email</span>
                  <span style={fieldValueStyle}>{candidateEmail}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Alternate Email</span>
                  <span style={fieldValueStyle}>{contact.alternateEmail || personal.alternateEmail || '—'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Primary Mobile</span>
                  <span style={fieldValueStyle}>{candidateMobile}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Alternate Mobile</span>
                  <span style={fieldValueStyle}>{contact.alternateMobile || '—'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>City / District</span>
                  <span style={fieldValueStyle}>{contact.city || 'Pune'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>State</span>
                  <span style={fieldValueStyle}>{contact.state || 'Maharashtra'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>PIN Code</span>
                  <span style={fieldValueStyle}>{contact.pinCode || contact.pincode || 'N/A'}</span>
                </div>
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Residential Address</span>
                  <span style={fieldValueStyle}>{contact.address || 'Address on record'}</span>
                </div>
              </div>
            </div>

            {/* STAGE 3: ACADEMIC QUALIFICATIONS */}
            <div style={stageCardStyle}>
              <div style={stageHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={stageNumberStyle}>3</div>
                  <div>
                    <h3 style={stageTitleStyle}>Stage 3: Academic Qualifications</h3>
                    <p style={stageSubtitleStyle}>Educational credentials from SSC/HSC through Graduation & Post-Graduation</p>
                  </div>
                </div>
                <span style={stageCompletedPillStyle}>Completed ✓</span>
              </div>

              {qualifications.length === 0 ? (
                <p style={{ color: '#64748b', fontStyle: 'italic', margin: 0, fontSize: '0.86rem' }}>No academic qualifications recorded.</p>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        <th style={thStyle}>Degree Level</th>
                        <th style={thStyle}>Degree Name</th>
                        <th style={thStyle}>Institute / University</th>
                        <th style={thStyle}>Specialization</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Passing Year</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Percentage / CGPA</th>
                        <th style={thStyle}>Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qualifications.map((q, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>{q.qualificationDegree || q.degreeLevel || 'Graduation'}</td>
                          <td style={tdStyle}>{q.degreeName || 'N/A'}</td>
                          <td style={tdStyle}>{q.instituteName || q.university || 'N/A'}</td>
                          <td style={tdStyle}>{q.specialization || 'General'}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{q.passingYear || q.year || 'N/A'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{q.percentage || q.cgpa || 'N/A'}</td>
                          <td style={tdStyle}>{q.studyMode || 'Full-Time'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* STAGE 4: WORK EXPERIENCE */}
            <div style={stageCardStyle}>
              <div style={stageHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={stageNumberStyle}>4</div>
                  <div>
                    <h3 style={stageTitleStyle}>Stage 4: Professional Work Experience</h3>
                    <p style={stageSubtitleStyle}>Employment track, designations, organizations, and tenures</p>
                  </div>
                </div>
                <span style={stageCompletedPillStyle}>Completed ✓</span>
              </div>

              {experience.length === 0 ? (
                <p style={{ color: '#64748b', fontStyle: 'italic', margin: 0, fontSize: '0.86rem' }}>Fresher Submission &mdash; No prior formal employment recorded.</p>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        <th style={thStyle}>Organization</th>
                        <th style={thStyle}>Designation</th>
                        <th style={thStyle}>Type</th>
                        <th style={thStyle}>From Date</th>
                        <th style={thStyle}>To Date</th>
                        <th style={thStyle}>Gross Salary</th>
                        <th style={thStyle}>Notice Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {experience.map((e, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>{e.organization || 'N/A'}</td>
                          <td style={tdStyle}>{e.designation || 'N/A'}</td>
                          <td style={tdStyle}>{e.type || e.experienceType || 'Full-Time'}</td>
                          <td style={tdStyle}>{e.fromDate || 'N/A'}</td>
                          <td style={tdStyle}>{e.isCurrent ? <span style={{ color: '#059669', fontWeight: 700 }}>Present (Current)</span> : (e.toDate || 'N/A')}</td>
                          <td style={tdStyle}>{e.salary || '—'}</td>
                          <td style={tdStyle}>{e.noticePeriod || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* STAGE 5: RESEARCH & PH.D. DETAILS (TEACHING ONLY) */}
            {isTeaching && (
              <div style={stageCardStyle}>
                <div style={stageHeaderStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={stageNumberStyle}>5</div>
                    <div>
                      <h3 style={stageTitleStyle}>Stage 5: Research & Academic Credentials</h3>
                      <p style={stageSubtitleStyle}>Ph.D. subject, university, publication metrics, and national exams</p>
                    </div>
                  </div>
                  <span style={stageCompletedPillStyle}>Completed ✓</span>
                </div>

                <div style={fieldsGridStyle}>
                  <div style={fieldItemStyle}>
                    <span style={fieldLabelStyle}>Ph.D. Status</span>
                    <span style={fieldValueStyle}>{research.phdStatus || 'N/A'}</span>
                  </div>
                  <div style={fieldItemStyle}>
                    <span style={fieldLabelStyle}>Ph.D. Subject / Field</span>
                    <span style={fieldValueStyle}>{research.phdSpecialization || research.phdSubject || '—'}</span>
                  </div>
                  <div style={fieldItemStyle}>
                    <span style={fieldLabelStyle}>Ph.D. University / Institute</span>
                    <span style={fieldValueStyle}>{research.phdUniversity || '—'}</span>
                  </div>
                  <div style={fieldItemStyle}>
                    <span style={fieldLabelStyle}>Ph.D. Year of Award</span>
                    <span style={fieldValueStyle}>{research.phdYear || '—'}</span>
                  </div>
                  <div style={fieldItemStyle}>
                    <span style={fieldLabelStyle}>Scopus Publications</span>
                    <span style={fieldValueStyle}>{research.scopusCount || 0}</span>
                  </div>
                  <div style={fieldItemStyle}>
                    <span style={fieldLabelStyle}>Scopus Author ID</span>
                    <span style={fieldValueStyle}>{research.scopusId || '—'}</span>
                  </div>
                  <div style={fieldItemStyle}>
                    <span style={fieldLabelStyle}>Web of Science (WoS)</span>
                    <span style={fieldValueStyle}>{research.wosCount || research.webOfScienceCount || 0}</span>
                  </div>
                  <div style={fieldItemStyle}>
                    <span style={fieldLabelStyle}>Web of Science ID</span>
                    <span style={fieldValueStyle}>{research.wosId || '—'}</span>
                  </div>
                </div>

                <div style={{ marginTop: '14px', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.84rem', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: '#64748b', marginRight: '6px' }}>UGC-NET:</span>
                    <strong style={{ color: '#0f172a' }}>{research.net === 'Yes' || research.netCleared ? 'Cleared ✓' : 'Not Cleared'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', marginRight: '6px' }}>SET / SLET:</span>
                    <strong style={{ color: '#0f172a' }}>{research.setExam === 'Yes' || research.setCleared ? 'Cleared ✓' : 'Not Cleared'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', marginRight: '6px' }}>GATE:</span>
                    <strong style={{ color: '#0f172a' }}>{research.gate === 'Yes' || research.gateCleared ? 'Cleared ✓' : 'Not Cleared'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 6: UPLOADED DOCUMENTS */}
            <div style={stageCardStyle}>
              <div style={stageHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={stageNumberStyle}>{isTeaching ? 6 : 5}</div>
                  <div>
                    <h3 style={stageTitleStyle}>Stage {isTeaching ? 6 : 5}: Attached Documents</h3>
                    <p style={stageSubtitleStyle}>Original documents and CV submitted with this application</p>
                  </div>
                </div>
                <span style={stageCompletedPillStyle}>Completed ✓</span>
              </div>

              {documents.length === 0 ? (
                <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', color: '#475569' }}>
                  Resume / CV recorded with application dossier.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'capitalize', fontSize: '0.86rem' }}>
                          {doc.documentType === 'resume' ? 'CV / Resume' : doc.documentType}:
                        </span>{' '}
                        <span style={{ color: '#475569', fontSize: '0.84rem' }}>{doc.originalName || 'Document.pdf'}</span>
                        {doc.fileSize && (
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginLeft: '8px' }}>
                            ({(doc.fileSize / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(e, selectedApp.id, doc.id, doc.originalName)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          color: '#0f172a',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Download File &darr;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* STAGE 7: DECLARATION & SUBMISSION */}
            <div style={stageCardStyle}>
              <div style={stageHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={stageNumberStyle}>{isTeaching ? 7 : 6}</div>
                  <div>
                    <h3 style={stageTitleStyle}>Stage {isTeaching ? 7 : 6}: Declaration & Submission Details</h3>
                    <p style={stageSubtitleStyle}>Official filing timestamp, verified authenticity, and application reference</p>
                  </div>
                </div>
                <span style={stageCompletedPillStyle}>Verified ✓</span>
              </div>

              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 20px', marginBottom: '16px', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
                <strong>Candidate Declaration:</strong> I hereby declare that all the information provided in this application is true, complete and authentic to the best of my knowledge and belief. I understand that any false statement or omission may disqualify me from recruitment.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 18px', fontSize: '0.84rem' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.74rem', display: 'block', fontWeight: 600 }}>Filing Candidate</span>
                  <strong style={{ color: '#0f172a' }}>{candidateFullName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.74rem', display: 'block', fontWeight: 600 }}>Submission Timestamp</span>
                  <strong style={{ color: '#0f172a' }}>
                    {selectedApp.submittedAt ? new Date(selectedApp.submittedAt).toLocaleString('en-IN') : (selectedApp.createdAt ? new Date(selectedApp.createdAt).toLocaleString('en-IN') : 'Completed')}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.74rem', display: 'block', fontWeight: 600 }}>Official Application Number</span>
                  <strong style={{ color: '#0f172a' }}>{selectedApp.applicationNumber || 'APP-2026'}</strong>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// Visual Styles
const stageCardStyle = {
  backgroundColor: '#ffffff',
  border: '1.5px solid #e2e8f0',
  borderRadius: '12px',
  padding: '24px 28px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
};

const stageHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #f1f5f9',
  paddingBottom: '14px',
  marginBottom: '20px',
  flexWrap: 'wrap',
  gap: '10px'
};

const stageNumberStyle = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  backgroundColor: '#721b28',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: '0.82rem'
};

const stageTitleStyle = {
  margin: '0 0 2px 0',
  fontSize: '1.1rem',
  fontWeight: 800,
  color: '#0f172a'
};

const stageSubtitleStyle = {
  margin: 0,
  fontSize: '0.8rem',
  color: '#64748b',
  fontWeight: 500
};

const stageCompletedPillStyle = {
  backgroundColor: '#ecfdf5',
  color: '#065f46',
  border: '1px solid #a7f3d0',
  fontSize: '0.74rem',
  fontWeight: 700,
  padding: '4px 10px',
  borderRadius: '20px'
};

const fieldsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: '16px 20px'
};

const fieldItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px'
};

const fieldLabelStyle = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
};

const fieldValueStyle = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#0f172a'
};

const thStyle = {
  padding: '10px 14px',
  fontWeight: 700,
  color: '#475569',
  fontSize: '0.8rem'
};

const tdStyle = {
  padding: '10px 14px',
  color: '#334155',
  fontSize: '0.84rem'
};

export default ApplicantDashboard;
