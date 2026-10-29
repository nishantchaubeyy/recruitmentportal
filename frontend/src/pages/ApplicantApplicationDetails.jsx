import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest, API_URL } from '../utils/api';
import { statusLabel, statusBadgeClass } from '../utils/status';
import { phdFieldsFor, PHD_LABELS } from '../utils/formRules';

// Safe JSON parser
const parseField = (field, fallback) => {
  if (field === undefined || field === null || field === '') return fallback;
  if (typeof field === 'object') return field;
  try { return JSON.parse(field); } catch { return fallback; }
};

function ApplicantApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [refreshedAt, setRefreshedAt] = useState(null);

  useEffect(() => {
    let active = true;
    async function fetchDetails() {
      try {
        const data = await apiRequest(`/applications/${id}`);
        if (!active) return;
        setApp(data);
        setError('');
        setRefreshedAt(new Date());
      } catch (err) {
        // A failed background refresh must not replace a page that is already showing.
        if (active) setError((current) => current || err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchDetails();

    const timer = setInterval(() => { if (!document.hidden) fetchDetails(); }, 60000);
    const onVisible = () => { if (!document.hidden) fetchDetails(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [id]);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#F9FAFB', minHeight: '80vh', padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ color: '#4B5563', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Loading your application details...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div style={{ backgroundColor: '#F9FAFB', minHeight: '80vh', padding: '60px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '32px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#DC2626', fontWeight: 700, marginBottom: '16px' }}>{error || 'Application record not found.'}</p>
          <Link to="/applicant/dashboard" style={{ color: '#1F2937', fontWeight: 600, textDecoration: 'underline' }}>
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const personal = parseField(app.personalInfo, {});
  const contact = parseField(app.contactDetails, {});
  const qualifications = parseField(app.qualifications, []);
  const experience = parseField(app.experience, []);
  const research = parseField(app.researchDetails, {});
  const references = parseField(app.references, []);

  const displayTitle = (personal.title && personal.title !== 'Select' && personal.title !== 'Select Title' && personal.title !== 'Select...') ? personal.title : '';
  const formattedFullName = [displayTitle, personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const candidateName = formattedFullName || app.applicant?.name || 'Applicant';
  const candidateEmail = personal.email || contact.email || app.applicant?.user?.email || 'N/A';
  const candidateMobile = contact.mobile || personal.mobile || app.applicant?.mobile || 'N/A';
  const positionTitle = app.job?.position || personal.postAppliedFor || 'Position not specified';
  const departmentName = app.job?.department || app.job?.school?.name || personal.faculty || 'Department';
  const jobCategory = app.job?.type || (personal.faculty?.includes('NON-TEACHING') ? 'NON_TEACHING' : 'TEACHING');

  const documents = Array.isArray(app.documents) ? app.documents : [];

  // Oldest first would hide the current state at the bottom; newest first reads like a status feed.
  const timeline = [...(Array.isArray(app.statusHistory) ? app.statusHistory : [])]
    .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

  // Only the Ph.D. fields that apply to the stored status are shown.
  const phdEntries = phdFieldsFor(research.phdStatus).visible
    .filter((key) => String(research[key] ?? '').trim() !== '')
    .map((key) => [PHD_LABELS[key], research[key]]);
  const hasOutputs = research.scopusCount !== undefined || research.net !== undefined;
  const showResearch = jobCategory === 'TEACHING' || phdEntries.length > 0;
  const examText = (value) => {
    const cleared = value && typeof value === 'object' ? value.cleared === 'Yes' || value.cleared === true : value === 'Yes' || value === true;
    if (!cleared) return 'Not cleared';
    return value && value.year ? `Cleared (${value.year}) ✓` : 'Cleared ✓';
  };

  const handleDownloadFile = async (e, docId, filename) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/applications/${app?.id}/documents/${docId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve file.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'File download failed.');
    }
  };

  const STAGES_LIST = [
    { num: 1, title: 'Personal Information', desc: 'Candidate identification, personal & demographic particulars' },
    { num: 2, title: 'Contact & Address Information', desc: 'Communication channels, phone numbers and residential address' },
    { num: 3, title: 'Academic Qualifications', desc: 'Degrees, diplomas, university records and percentage/CGPA' },
    { num: 4, title: 'Professional Work Experience', desc: 'Employment history, designations, organizations and tenure' },
    ...(showResearch ? [{ num: 5, title: 'Research & Academic Credentials', desc: 'Ph.D. background, publications, Scopus, WoS and national exams' }] : []),
    { num: showResearch ? 6 : 5, title: 'Application Documents & Attachments', desc: 'Resume / CV, certificates and supporting files submitted' },
    { num: showResearch ? 7 : 6, title: 'Declaration & Submission Details', desc: 'Final declaration, candidate verification and application timestamp' }
  ];

  return (
    <div style={{ backgroundColor: '#F9FAFB', minHeight: '100vh', padding: '32px 20px 80px', fontFamily: "'Inter', system-ui, sans-serif", color: '#1F2937' }}>
      
      {/* Top Action & Navigation Bar */}
      <div style={{ maxWidth: '900px', margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button 
          onClick={() => navigate('/applicant/dashboard')} 
          style={{ background: 'none', border: 'none', fontSize: '0.9rem', color: '#4B5563', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          &larr; Back to Dashboard
        </button>
        <button
          onClick={() => window.print()}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #E5E7EB',
            color: '#1F2937',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          Print / Save PDF
        </button>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── TOP APPLICATION SUMMARY HEADER CARD ── */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '14px',
          padding: '24px 28px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ backgroundColor: '#F3F4F6', color: '#4B5563', fontSize: '0.74rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.04em' }}>
                  APPLICATION #{app.applicationNumber}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                  Submitted on {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
                {positionTitle}
              </h1>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#4B5563', fontWeight: 500 }}>
                {departmentName} &bull; D Y Patil International University, Pune
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.04em' }}>
                Current Status
              </div>
              <span className={`status-badge ${statusBadgeClass(app.status)}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
                {statusLabel(app.status)}
              </span>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px 18px',
            backgroundColor: '#F9FAFB',
            padding: '14px 18px',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            fontSize: '0.84rem'
          }}>
            <div>
              <span style={{ color: '#6B7280', fontSize: '0.74rem', display: 'block', fontWeight: 500 }}>Applicant Name</span>
              <strong style={{ color: '#111827' }}>{candidateName}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280', fontSize: '0.74rem', display: 'block', fontWeight: 500 }}>Email Address</span>
              <strong style={{ color: '#111827' }}>{candidateEmail}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280', fontSize: '0.74rem', display: 'block', fontWeight: 500 }}>Mobile Number</span>
              <strong style={{ color: '#111827' }}>{candidateMobile}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280', fontSize: '0.74rem', display: 'block', fontWeight: 500 }}>Category / Track</span>
              <strong style={{ color: '#111827' }}>{jobCategory === 'TEACHING' ? 'Teaching & Faculty' : 'Non-Teaching / Admin'}</strong>
            </div>
          </div>
        </div>

        {/* ── WHERE YOUR APPLICATION STANDS ── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            <h3 style={stageTitleStyle}>Application Progress</h3>
            <span style={{ fontSize: '0.74rem', color: '#6B7280' }}>
              {refreshedAt ? `Updated ${refreshedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · refreshes automatically` : ''}
            </span>
          </div>

          {app.nextStep && (
            <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.88rem', color: '#374151', marginBottom: '16px', lineHeight: 1.5 }}>
              <strong>What happens next:</strong> {app.nextStep}
            </div>
          )}

          {timeline.length === 0 ? (
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.86rem' }}>No updates yet.</p>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {timeline.map((entry, index) => (
                <li key={entry.id || `${entry.newStatus}-${entry.changedAt}`} style={{ display: 'flex', gap: '12px', paddingBottom: index === timeline.length - 1 ? 0 : '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', marginTop: '4px', backgroundColor: index === 0 ? '#7B1F2B' : '#D1D5DB' }} />
                    {index !== timeline.length - 1 && <span style={{ flex: 1, width: '2px', backgroundColor: '#E5E7EB', marginTop: '4px' }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: index === 0 ? 800 : 600, color: '#111827', fontSize: '0.9rem' }}>{statusLabel(entry.newStatus)}</div>
                    <div style={{ fontSize: '0.76rem', color: '#6B7280' }}>
                      {entry.changedAt ? new Date(entry.changedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* ── STAGES PROGRESS BAR ── */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.82rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: '#111827' }}>Application Stages:</span>
            <span style={{ color: '#059669', fontWeight: 600 }}>All {STAGES_LIST.length} Stages Completed</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {STAGES_LIST.map((s) => (
              <span
                key={s.num}
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  border: '1px solid #A7F3D0'
                }}
              >
                Stage {s.num}: {s.title.split(' ')[0]} ✓
              </span>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* STAGE 1: PERSONAL INFORMATION */}
        {/* ============================================================== */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={stageBadgeStyle}>1</div>
              <div>
                <h3 style={stageTitleStyle}>Stage 1: Personal Information</h3>
                <p style={stageDescStyle}>Candidate identity, demographic and basic application details</p>
              </div>
            </div>
            <span style={completedPillStyle}>Completed ✓</span>
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
              <span style={fieldLabelStyle}>Post Applied For</span>
              <span style={fieldValueStyle}>{positionTitle}</span>
            </div>
            <div style={fieldItemStyle}>
              <span style={fieldLabelStyle}>Faculty / Department</span>
              <span style={fieldValueStyle}>{departmentName}</span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* STAGE 2: CONTACT INFORMATION */}
        {/* ============================================================== */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={stageBadgeStyle}>2</div>
              <div>
                <h3 style={stageTitleStyle}>Stage 2: Contact & Address Information</h3>
                <p style={stageDescStyle}>Primary channels of communication and permanent residential address</p>
              </div>
            </div>
            <span style={completedPillStyle}>Completed ✓</span>
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
              <span style={fieldValueStyle}>{contact.city || 'N/A'}</span>
            </div>
            <div style={fieldItemStyle}>
              <span style={fieldLabelStyle}>State</span>
              <span style={fieldValueStyle}>{contact.state || 'N/A'}</span>
            </div>
            <div style={fieldItemStyle}>
              <span style={fieldLabelStyle}>PIN Code</span>
              <span style={fieldValueStyle}>{contact.pinCode || contact.pincode || 'N/A'}</span>
            </div>
            <div style={fieldItemStyle}>
              <span style={fieldLabelStyle}>Full Residential Address</span>
              <span style={fieldValueStyle}>{contact.address || '—'}</span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* STAGE 3: ACADEMIC QUALIFICATIONS */}
        {/* ============================================================== */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={stageBadgeStyle}>3</div>
              <div>
                <h3 style={stageTitleStyle}>Stage 3: Academic Qualifications</h3>
                <p style={stageDescStyle}>Formal educational background from secondary school through post-graduation</p>
              </div>
            </div>
            <span style={completedPillStyle}>Completed ✓</span>
          </div>

          {qualifications.length === 0 ? (
            <p style={{ color: '#6B7280', fontStyle: 'italic', margin: 0 }}>No academic qualifications recorded.</p>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1.5px solid #E5E7EB' }}>
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
                    <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#111827' }}>{q.qualificationDegree || q.degreeLevel || 'Graduation'}</td>
                      <td style={tdStyle}>{q.degreeName || 'N/A'}</td>
                      <td style={tdStyle}>{q.instituteName || q.university || 'N/A'}</td>
                      <td style={tdStyle}>{q.specialization || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{q.passingYear || q.year || 'N/A'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#111827' }}>{q.percentage || q.cgpa || 'N/A'}</td>
                      <td style={tdStyle}>{q.studyMode || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* STAGE 4: WORK EXPERIENCE */}
        {/* ============================================================== */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={stageBadgeStyle}>4</div>
              <div>
                <h3 style={stageTitleStyle}>Stage 4: Professional Work Experience</h3>
                <p style={stageDescStyle}>Chronological employment history across academia, industry and research</p>
              </div>
            </div>
            <span style={completedPillStyle}>Completed ✓</span>
          </div>

          {experience.length === 0 ? (
            <p style={{ color: '#6B7280', fontStyle: 'italic', margin: 0 }}>Fresher Submission — No prior formal professional experience recorded.</p>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1.5px solid #E5E7EB' }}>
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
                    <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#111827' }}>{e.organization || 'N/A'}</td>
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

        {/* ============================================================== */}
        {/* STAGE 5: RESEARCH & PH.D. PROFILE (TEACHING) */}
        {/* ============================================================== */}
        {showResearch && (
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={stageBadgeStyle}>5</div>
                <div>
                  <h3 style={stageTitleStyle}>Stage 5: Research & Academic Credentials</h3>
                  <p style={stageDescStyle}>Ph.D. degree status, indexed publication count, and national eligibility clearances</p>
                </div>
              </div>
              <span style={completedPillStyle}>Completed ✓</span>
            </div>

            <div style={fieldsGridStyle}>
              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Ph.D. Status</span>
                <span style={fieldValueStyle}>{research.phdStatus || 'N/A'}</span>
              </div>
              {phdEntries.map(([label, value]) => (
                <div key={label} style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>{label}</span>
                  <span style={fieldValueStyle}>{value}</span>
                </div>
              ))}
              {hasOutputs && (
                <>
                  <div style={fieldItemStyle}>
                    <span style={fieldLabelStyle}>Scopus Publications</span>
                    <span style={fieldValueStyle}>{research.scopusCount || 0}</span>
                  </div>
                  {research.scopusId && (
                    <div style={fieldItemStyle}>
                      <span style={fieldLabelStyle}>Scopus Author ID</span>
                      <span style={fieldValueStyle}>{research.scopusId}</span>
                    </div>
                  )}
                  <div style={fieldItemStyle}>
                    <span style={fieldLabelStyle}>Web of Science (WoS)</span>
                    <span style={fieldValueStyle}>{research.wosCount || 0}</span>
                  </div>
                  {research.wosId && (
                    <div style={fieldItemStyle}>
                      <span style={fieldLabelStyle}>Web of Science ID</span>
                      <span style={fieldValueStyle}>{research.wosId}</span>
                    </div>
                  )}
                  <div style={fieldItemStyle}>
                    <span style={fieldLabelStyle}>Conference Papers</span>
                    <span style={fieldValueStyle}>{/^\d+$/.test(String(research.conferencePaper ?? '')) ? research.conferencePaper : 0}</span>
                  </div>
                  {Array.isArray(research.publications) && research.publications.map((p) => (
                    <div key={p.type} style={fieldItemStyle}>
                      <span style={fieldLabelStyle}>{p.type}</span>
                      <span style={fieldValueStyle}>{p.count}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {hasOutputs && (
              <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.84rem', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {[['UGC-NET / JRF', research.net], ['SET', research.setExam], ['SLET', research.slet], ['GATE', research.gate]].map(([label, value]) => (
                  <div key={label}>
                    <span style={{ color: '#6B7280', marginRight: '6px' }}>{label}:</span>
                    <strong style={{ color: '#111827' }}>{examText(value)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE 6: APPLICATION DOCUMENTS */}
        {/* ============================================================== */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={stageBadgeStyle}>{showResearch ? 6 : 5}</div>
              <div>
                <h3 style={stageTitleStyle}>Stage {showResearch ? 6 : 5}: Attached Documents</h3>
                <p style={stageDescStyle}>Resume, curriculum vitae and certificates uploaded with this application</p>
              </div>
            </div>
            <span style={completedPillStyle}>Completed ✓</span>
          </div>

          {documents.length === 0 ? (
            <div style={{ padding: '14px 16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.85rem', color: '#4B5563' }}>
              Candidate resume / CV document submitted with application dossier.
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
                    border: '1.5px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: '#111827', textTransform: 'capitalize', fontSize: '0.86rem' }}>
                      {doc.documentType === 'resume' ? 'CV / Resume' : doc.documentType}:
                    </span>{' '}
                    <span style={{ color: '#4B5563', fontSize: '0.84rem' }}>{doc.originalName || 'Document.pdf'}</span>
                    {doc.fileSize && (
                      <span style={{ fontSize: '0.74rem', color: '#9CA3AF', marginLeft: '8px' }}>
                        ({(doc.fileSize / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={(e) => handleDownloadFile(e, doc.id, doc.originalName)} 
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #D1D5DB',
                      color: '#1F2937',
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

        {/* ============================================================== */}
        {/* STAGE 7: DECLARATION & SUBMISSION */}
        {/* ============================================================== */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={stageBadgeStyle}>{showResearch ? 7 : 6}</div>
              <div>
                <h3 style={stageTitleStyle}>Stage {showResearch ? 7 : 6}: Declaration & Submission Details</h3>
                <p style={stageDescStyle}>Candidate verification of authenticity and official filing timestamp</p>
              </div>
            </div>
            <span style={completedPillStyle}>Verified ✓</span>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px 20px', marginBottom: '16px', fontSize: '0.86rem', color: '#374151', lineHeight: 1.6 }}>
            <strong>Candidate Declaration:</strong> I hereby declare that all the information given in this application is true, complete and correct to the best of my knowledge and belief. I understand that any false statement or omission of material facts may disqualify me from recruitment or result in termination of appointment.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 18px', fontSize: '0.84rem' }}>
            <div>
              <span style={{ color: '#6B7280', fontSize: '0.74rem', display: 'block', fontWeight: 500 }}>Filing Candidate</span>
              <strong style={{ color: '#111827' }}>{candidateName}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280', fontSize: '0.74rem', display: 'block', fontWeight: 500 }}>Submission Timestamp</span>
              <strong style={{ color: '#111827' }}>
                {app.submittedAt ? new Date(app.submittedAt).toLocaleString('en-IN') : (app.createdAt ? new Date(app.createdAt).toLocaleString('en-IN') : 'Completed')}
              </strong>
            </div>
            <div>
              <span style={{ color: '#6B7280', fontSize: '0.74rem', display: 'block', fontWeight: 500 }}>Official Reference</span>
              <strong style={{ color: '#111827' }}>{app.applicationNumber}</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Styles
const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '14px',
  padding: '24px 28px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
};

const cardHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #F3F4F6',
  paddingBottom: '14px',
  marginBottom: '20px',
  flexWrap: 'wrap',
  gap: '10px'
};

const stageBadgeStyle = {
  width: '28px',
  height: '28px',
  borderRadius: '8px',
  backgroundColor: '#7B1F2B',
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: '0.86rem',
  flexShrink: 0
};

const stageTitleStyle = {
  margin: 0,
  fontSize: '1.05rem',
  fontWeight: 700,
  color: '#111827'
};

const stageDescStyle = {
  margin: '2px 0 0 0',
  fontSize: '0.78rem',
  color: '#6B7280'
};

const completedPillStyle = {
  fontSize: '0.72rem',
  fontWeight: 700,
  padding: '3px 10px',
  borderRadius: '20px',
  backgroundColor: '#ECFDF5',
  color: '#065F46',
  border: '1px solid #A7F3D0'
};

const fieldsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px 20px'
};

const fieldItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px'
};

const fieldLabelStyle = {
  fontSize: '0.74rem',
  fontWeight: 600,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.02em'
};

const fieldValueStyle = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#111827'
};

const thStyle = {
  padding: '10px 12px',
  fontWeight: 700,
  color: '#4B5563',
  textTransform: 'uppercase',
  fontSize: '0.72rem',
  letterSpacing: '0.02em'
};

const tdStyle = {
  padding: '11px 12px',
  color: '#374151',
  fontSize: '0.84rem'
};

export default ApplicantApplicationDetails;
