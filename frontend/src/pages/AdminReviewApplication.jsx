import React, { useContext, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest, API_URL } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { HR_STATUS_OPTIONS, statusLabel, statusOptionState, APPLICATION_STATUS } from '../utils/status';
import DossierPrintDocument from '../components/DossierPrintDocument';
import { viewCandidateDocument, downloadCandidateDocument } from '../utils/pdfHelper';
import ScheduleInterviewModal from '../components/ScheduleInterviewModal';
import DocumentRequestPanel from '../components/DocumentRequestPanel';
import { DOCUMENT_REQUEST_STATUSES } from '../utils/documentChecklist';

function AdminReviewApplication() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Status Change & Interview State
  const [newStatus, setNewStatus] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');
  const [statusError, setStatusError] = useState('');
  const [notice, setNotice] = useState(null); // what the candidate was told after the last change
  const [provider, setProvider] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDocumentPanel, setShowDocumentPanel] = useState(false);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/applications/${id}`);
      setApp(data);
      setNewStatus('');
    } catch (err) {
      setError(err.message || 'Failed to load application details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchApplicationDetails();
    }
  }, [id]);

  const loadEmailInfo = async () => {
    try {
      const [p, logs] = await Promise.all([
        apiRequest('/admin/email/status'),
        apiRequest(`/applications/${id}/email-logs`)
      ]);
      setProvider(p);
      setEmailLogs(Array.isArray(logs?.logs) ? logs.logs : []);
    } catch {
      /* the e-mail panel is informational; the page works without it */
    }
  };

  useEffect(() => {
    if (id) loadEmailInfo();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const describeNotice = (n) => {
    if (!n) return null;
    if (n.email?.status === 'SENT') return { ok: true, text: 'The candidate was notified on the portal and by e-mail.' };
    if (n.email?.status === 'SKIPPED') return { ok: false, text: 'The candidate was notified on the portal, but the e-mail was NOT sent because no e-mail provider is configured on this server.' };
    return { ok: false, text: `The candidate was notified on the portal, but the e-mail could not be sent${n.email?.error ? ` (${n.email.error})` : ''}.` };
  };

  const handleStatusChangeSubmit = async (e) => {
    e.preventDefault();
    if (!newStatus) {
      setStatusError('Please choose the new status first.');
      return;
    }

    setSubmitting(true);
    setStatusError('');
    setStatusSuccess('');
    setNotice(null);

    try {
      const res = await apiRequest(`/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, comment: adminComment })
      });

      setStatusSuccess(res.message || `Status updated to "${statusLabel(newStatus)}".`);
      setNotice(res.notification || null);
      setAdminComment('');
      setNewStatus('');
      await fetchApplicationDetails();
      loadEmailInfo();
    } catch (err) {
      setStatusError(err.message || 'The status could not be updated.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setStatusError('');
    try {
      const res = await apiRequest(`/applications/${id}/resend-status-email`, { method: 'POST' });
      setNotice(res.notification || null);
      setStatusSuccess(res.message);
      loadEmailInfo();
    } catch (err) {
      setStatusError(err.message || 'Could not resend the notification.');
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f4f4f2', minHeight: '100vh', padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ color: '#171717', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Loading formal candidate dossier...</p>
      </div>
    );
  }

  if (error && !app) {
    return (
      <div style={{ backgroundColor: '#f4f4f2', minHeight: '100vh', padding: '60px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '32px', borderRadius: '4px' }}>
          <p style={{ color: '#991b1b', fontWeight: 700 }}>Error: {error}</p>
          <Link to="/admin/applications" style={{ color: '#171717', fontWeight: 700, textDecoration: 'underline' }}>
            &larr; Return to Applications List
          </Link>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div style={{ backgroundColor: '#f4f4f2', minHeight: '100vh', padding: '60px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '32px', borderRadius: '4px' }}>
          <p>Application record not found.</p>
          <Link to="/admin/applications" style={{ color: '#171717', fontWeight: 700, textDecoration: 'underline' }}>
            &larr; Return to Applications List
          </Link>
        </div>
      </div>
    );
  }

  // Safe JSON Parsing Helper
  const parseJsonField = (field, fallback = {}) => {
    if (!field) return fallback;
    if (typeof field === 'object') return field;
    try {
      return JSON.parse(field);
    } catch (e) {
      return fallback;
    }
  };

  const personal = parseJsonField(app.personalInfo, {});
  const contact = parseJsonField(app.contactDetails, {});
  const qualifications = parseJsonField(app.qualifications, []);
  const experience = parseJsonField(app.experience || app.workExperience, []);
  const research = parseJsonField(app.researchDetails || app.phdDetails, {});
  const references = parseJsonField(app.references, []);

  const displayTitle = (personal.title && personal.title !== 'Select' && personal.title !== 'Select Title' && personal.title !== 'Select...') ? personal.title : '';
  const formattedFullName = [displayTitle, personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const candidateName = formattedFullName || app.applicant?.name || 'Candidate';
  const candidateEmail = app.applicant?.user?.email || personal.email || contact.email || 'N/A';
  const candidateMobile = app.applicant?.mobile || contact.mobile || 'N/A';
  const positionTitle = app.job?.position || personal.postAppliedFor || 'Position not specified';
  const departmentName = app.job?.department || personal.faculty || 'Department';
  const jobCategory = app.job?.type || (personal.faculty?.includes('NON-TEACHING') ? 'NON_TEACHING' : 'TEACHING');

  const documents = Array.isArray(app.documents) ? app.documents : [];
  const statusHistory = Array.isArray(app.statusHistory) ? app.statusHistory : [];

  const handleViewFile = async (e, doc) => {
    e.preventDefault();
    await viewCandidateDocument(doc, candidateName, app?.id);
  };

  const handleDownloadFile = async (e, doc) => {
    e.preventDefault();
    await downloadCandidateDocument(doc, candidateName, app?.id);
  };

  const getFormattedApplicationDate = () => {
    if (app?.submittedAt) {
      return new Date(app.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const submitItem = statusHistory.find((h) => h.newStatus === 'SUBMITTED');
    if (submitItem?.changedAt) {
      return new Date(submitItem.changedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (app?.status && app.status !== 'DRAFT' && app?.updatedAt) {
      return new Date(app.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return new Date(app?.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formattedAppDate = getFormattedApplicationDate();

  return (
    <>
      {/* 🖥️ SCREEN-ONLY ADMIN REVIEW WORKSPACE */}
      <div className="screen-only" style={{ backgroundColor: '#f4f4f2', minHeight: '100vh', padding: '36px 16px 80px', fontFamily: "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, sans-serif", color: '#171717' }}>
        
        {/* Top Back Action Bar */}
        <div className="action-bar no-print" style={{ maxWidth: '960px', margin: '0 auto 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link 
            to="/admin/applications" 
            style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>&larr;</span> Back to Applications List
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              color: '#171717',
              padding: '6px 14px',
              borderRadius: '4px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Print / Save PDF
          </button>
        </div>

      {/* 📄 MAIN FORMAL PAPER DOCUMENT CONTAINER */}
      <main 
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.05)',
          padding: 'clamp(28px, 5vw, 56px)',
          boxSizing: 'border-box'
        }}
      >

        {/* ─── DOCUMENT INSTITUTIONAL HEADER ─── */}
        <header style={{ borderBottom: '2px solid #171717', paddingBottom: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            
            {/* University & Title */}
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                D Y PATIL INTERNATIONAL UNIVERSITY &bull; PUNE
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#171717', marginBottom: '14px' }}>
                FORMAL RECRUITMENT APPLICATION DOSSIER
              </div>

              {/* Primary Candidate Name (Dominant Serif) */}
              <h1 
                style={{
                  fontFamily: "'Playfair Display', 'Cormorant Garamond', 'Times New Roman', Georgia, serif",
                  fontSize: 'clamp(2rem, 4vw, 2.6rem)',
                  fontWeight: 800,
                  color: '#111111',
                  margin: '0 0 6px 0',
                  lineHeight: 1.15,
                  letterSpacing: '-0.3px'
                }}
              >
                {candidateName}
              </h1>

              {/* Applied Position */}
              <div style={{ fontSize: '1.05rem', color: '#171717', fontWeight: 600, marginBottom: '16px' }}>
                Applied For: <span style={{ fontWeight: 800 }}>{positionTitle}</span> ({departmentName})
              </div>

              {/* Metadata details */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.84rem', color: '#475569' }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', display: 'block' }}>Application ID</span>
                  <span style={{ fontWeight: 700, color: '#171717' }}>{app.applicationNumber || '—'}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', display: 'block' }}>Application Date</span>
                  <span style={{ fontWeight: 700, color: '#171717' }}>
                    {formattedAppDate}
                  </span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', display: 'block' }}>Primary Email</span>
                  <span style={{ fontWeight: 700, color: '#171717' }}>{candidateEmail}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', display: 'block' }}>Primary Mobile</span>
                  <span style={{ fontWeight: 700, color: '#171717' }}>{candidateMobile}</span>
                </div>
              </div>
            </div>

            {/* Current Application Status */}
            <div style={{ textAlign: 'right', minWidth: '180px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                APPLICATION STATUS
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {statusLabel(app.status)}
              </div>
            </div>

          </div>
        </header>

        {/* ─── ADMINISTRATIVE ACTION PANEL (Clean Paper Form Style) ─── */}
        <section className="admin-review-panel no-print" style={{ border: '1px solid #d1d5db', backgroundColor: '#fafafa', padding: '24px', borderRadius: '4px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#171717' }}>
              HR / ADMINISTRATIVE REVIEW PANEL
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {DOCUMENT_REQUEST_STATUSES.includes(app.status) ? (
                <button
                  type="button"
                  onClick={() => setShowDocumentPanel(true)}
                  style={{
                    backgroundColor: app.status === APPLICATION_STATUS.SELECTED ? '#166534' : '#721B28',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>📑 Request Documents{app.status === APPLICATION_STATUS.SELECTED ? ' from Selected Candidate' : ''}</span>
                </button>
              ) : (
                <span
                  title="Documents can be requested once the application is shortlisted or further along."
                  style={{ fontSize: '0.74rem', color: '#64748b', alignSelf: 'center' }}
                >
                  Document requests open at Shortlisted
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowScheduleModal(true)}
                style={{
                  backgroundColor: '#721B28',
                  color: '#ffffff',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>🎥 Schedule Interview (Panel & Meeting Link)</span>
              </button>
            </div>
          </div>

          {provider && !provider.configured && (
            <div role="alert" style={{ padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', borderRadius: '4px', marginBottom: '14px', fontSize: '0.82rem', fontWeight: 600 }}>
              E-mail is not configured on this server, so candidates will only see updates on the portal. Set ZEPTOMAIL_TOKEN (or SMTP_HOST / SMTP_USER / SMTP_PASS) in the server environment to enable e-mail notifications.
            </div>
          )}
          {statusError && (
            <div role="alert" style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '4px', marginBottom: '14px', fontSize: '0.86rem', fontWeight: 700 }}>
              {statusError}
            </div>
          )}
          {statusSuccess && (
            <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '4px', marginBottom: '14px', fontSize: '0.84rem', fontWeight: 600 }}>
              {statusSuccess}
              {describeNotice(notice) && (
                <div style={{ marginTop: 4, color: describeNotice(notice).ok ? '#166534' : '#92400e', fontWeight: 600 }}>{describeNotice(notice).text}</div>
              )}
            </div>
          )}

          <form onSubmit={handleStatusChangeSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                  Update Status
                </label>
                <select 
                  value={newStatus} 
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#ffffff', color: '#171717', fontSize: '0.88rem', fontWeight: 600 }}
                >
                  <option value="" disabled>Select the new status…</option>
                  {HR_STATUS_OPTIONS.map((opt) => {
                    const state = statusOptionState(app.status, opt.value, user?.role, app.allowedTransitions);
                    return (
                      <option key={opt.value} value={opt.value} disabled={!state.enabled}>
                        {opt.label}{state.enabled ? '' : ` — ${state.reason}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                  Remarks / Interview Feedback
                </label>
                <input 
                  type="text" 
                  value={adminComment} 
                  onChange={(e) => setAdminComment(e.target.value)} 
                  placeholder="e.g. Candidate profile shortlisted for Technical Interview round." 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#ffffff', color: '#171717', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <button 
                  type="submit" 
                  disabled={submitting || !newStatus}
                  style={{
                    backgroundColor: '#171717',
                    color: '#ffffff',
                    fontWeight: 700,
                    border: 'none',
                    padding: '9px 22px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                    letterSpacing: '0.3px',
                    width: '100%'
                  }}
                >
                  {submitting ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>

            <p style={{ margin: '12px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Current status: <strong>{statusLabel(app.status)}</strong>. To arrange an interview use <em>Schedule Interview</em> above — the status changes automatically and the candidate is invited.
              Options shown greyed out are not available from the current status.
            </p>
            {emailLogs.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>E-mails sent for this application</span>
                  <button type="button" onClick={handleResend} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 4, padding: '3px 10px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>Resend current status e-mail</button>
                </div>
                {emailLogs.slice(0, 6).map((log) => (
                  <div key={log.id} style={{ display: 'flex', gap: 10, fontSize: '0.78rem', padding: '3px 0', color: '#334155' }}>
                    <span style={{ minWidth: 70, fontWeight: 700, color: log.status === 'SENT' ? '#166534' : log.status === 'SKIPPED' ? '#92400e' : '#991b1b' }}>{log.status}</span>
                    <span style={{ flex: 1 }}>{log.subject}</span>
                    <span style={{ color: '#64748b' }}>{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </form>
        </section>

        {/* ─── 01 PERSONAL INFORMATION ─── */}
        <section style={{ marginBottom: '38px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid #171717', paddingBottom: '6px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>01</span>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#171717', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Personal Information
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px 24px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Full Name</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{candidateName}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Date of Birth</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{personal.dob || 'N/A'} {personal.age ? `(${personal.age} Years)` : ''}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Gender</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{personal.gender || 'N/A'}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Marital Status</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{personal.maritalStatus || 'N/A'}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Primary Email</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{candidateEmail}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Alternate Email</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{personal.alternateEmail || 'N/A'}</span>
            </div>
          </div>
        </section>

        {/* ─── 02 LOCATION & CONTACT ─── */}
        <section style={{ marginBottom: '38px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid #171717', paddingBottom: '6px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>02</span>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#171717', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Location & Contact
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px 24px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Mobile Number</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{candidateMobile}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Alternate Mobile</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{contact.alternateMobile || 'N/A'}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>State</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{contact.state || '—'}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>City</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{contact.city || '—'}</span>
            </div>
          </div>
        </section>

        {/* ─── 03 ACADEMIC QUALIFICATIONS ─── */}
        <section style={{ marginBottom: '38px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid #171717', paddingBottom: '6px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>03</span>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#171717', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Academic Qualifications
            </h2>
          </div>

          {qualifications.length === 0 ? (
            <p style={{ color: '#64748b', fontStyle: 'italic' }}>No qualification entries recorded.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #171717' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>Degree Level</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>Degree Name</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>Institute / University</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>Specialization</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>Year</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>CGPA / %</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {qualifications.map((q, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: '#171717' }}>{q.qualificationDegree || 'Degree'}</td>
                      <td style={{ padding: '10px 10px' }}>{q.degreeName || 'N/A'}</td>
                      <td style={{ padding: '10px 10px' }}>{q.instituteName || 'N/A'}</td>
                      <td style={{ padding: '10px 10px' }}>{q.specialization || 'N/A'}</td>
                      <td style={{ padding: '10px 10px' }}>{q.passingYear || 'N/A'}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 700 }}>{q.percentage || q.cgpa || 'N/A'}</td>
                      <td style={{ padding: '10px 10px' }}>{q.studyMode || 'Full-Time'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── 04 RESEARCH & PROFESSIONAL PROFILE ─── */}
        {jobCategory === 'TEACHING' && (
          <section style={{ marginBottom: '38px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid #171717', paddingBottom: '6px', marginBottom: '18px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>04</span>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#171717', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                Research & Professional Profile
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px 24px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Ph.D. Status</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{research.phdStatus || 'N/A'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Ph.D. Subject / Field</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{research.phdSpecialization || research.phdSubject || 'N/A'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>University & Year</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{research.phdUniversity ? `${research.phdUniversity} (${research.phdYear || ''})` : 'N/A'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Scopus Publications</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{research.scopusCount || 0}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>Web of Science</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{research.wosCount || research.webOfScienceCount || 0}</span>
              </div>
            </div>

            {/* Clean text for Eligibility Exams - NO emojis */}
            <div style={{ padding: '12px 14px', backgroundColor: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.84rem' }}>
              <span style={{ fontWeight: 700, color: '#171717', marginRight: '16px' }}>National Eligibility Exams:</span>
              <span style={{ color: '#334155' }}>
                NET: <strong>{research.net?.cleared === 'Yes' || research.netCleared ? 'Yes' : 'No'}</strong> &bull;{' '}
                SET: <strong>{research.setExam?.cleared === 'Yes' || research.setCleared ? 'Yes' : 'No'}</strong> &bull;{' '}
                GATE: <strong>{research.gate?.cleared === 'Yes' || research.gateCleared ? 'Yes' : 'No'}</strong>
              </span>
            </div>
          </section>
        )}

        {/* ─── 05 WORK EXPERIENCE ─── */}
        <section style={{ marginBottom: '38px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid #171717', paddingBottom: '6px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>{jobCategory === 'TEACHING' ? '05' : '04'}</span>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#171717', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Work Experience
            </h2>
          </div>

          {experience.length === 0 ? (
            <p style={{ color: '#64748b', fontStyle: 'italic' }}>No professional experience recorded (Fresher Submission).</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #171717' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>Organization</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>Type</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>Designation</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>From</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>To</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>Salary</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#171717', textTransform: 'uppercase', fontSize: '0.74rem' }}>Notice Period</th>
                  </tr>
                </thead>
                <tbody>
                  {experience.map((e, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: '#171717' }}>{e.organization || 'N/A'}</td>
                      <td style={{ padding: '10px 10px' }}>{e.type || e.experienceType || 'Teaching'}</td>
                      <td style={{ padding: '10px 10px' }}>{e.designation || 'N/A'}</td>
                      <td style={{ padding: '10px 10px' }}>{e.fromDate || 'N/A'}</td>
                      <td style={{ padding: '10px 10px' }}>{e.isCurrent ? 'Present' : e.toDate || 'N/A'}</td>
                      <td style={{ padding: '10px 10px' }}>{e.salary || 'N/A'}</td>
                      <td style={{ padding: '10px 10px' }}>{e.noticePeriod || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── 06 DOCUMENTS ─── */}
        <section style={{ marginBottom: '38px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid #171717', paddingBottom: '6px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>{jobCategory === 'TEACHING' ? '06' : '05'}</span>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#171717', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Attached Documents
            </h2>
          </div>

          {documents.length === 0 ? (
            <p style={{ color: '#64748b', fontStyle: 'italic' }}>CV / Resume attached in candidate submission.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {documents.map((doc) => (
                <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#171717', textTransform: 'capitalize', fontSize: '0.88rem' }}>
                      {doc.documentType === 'resume' ? 'CV / Resume' : doc.documentType}:
                    </span>{' '}
                    <span style={{ color: '#475569', fontSize: '0.86rem' }}>{doc.originalName || 'Document.pdf'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button"
                      onClick={(e) => handleViewFile(e, doc)} 
                      style={{
                        backgroundColor: '#721b28',
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '4px',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      View Document
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => handleDownloadFile(e, doc)} 
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #171717',
                        color: '#171717',
                        padding: '6px 14px',
                        borderRadius: '4px',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Download File
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      </div>

      {/* 🖨️ PRINT-ONLY DEDICATED OFFICIAL RECRUITMENT APPLICATION DOSSIER */}
      <div className="print-only">
        <DossierPrintDocument app={app} />
      </div>

      {/* REQUEST DOCUMENTS (prefilled from this application) */}
      {showDocumentPanel && (
        <DocumentRequestPanel
          application={app}
          onClose={() => setShowDocumentPanel(false)}
          onSent={(res) => setStatusSuccess(res.message)}
        />
      )}

      {/* SCHEDULE INTERVIEW WITH PANEL MODAL */}
      <ScheduleInterviewModal
        application={app}
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSuccess={(res) => {
          setShowScheduleModal(false);
          let msg = 'Interview scheduled with panel successfully.';
          if (res?.zoomWarning) msg += ` (Notice: ${res.zoomWarning})`;
          setStatusSuccess(msg);
          fetchApplicationDetails();
        }}
      />
    </>
  );
}

export default AdminReviewApplication;
