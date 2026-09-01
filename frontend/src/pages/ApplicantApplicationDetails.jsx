import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest, API_URL } from '../utils/api';
import { statusLabel } from '../utils/status';

// Safe JSON parser
const parseField = (field, fallback) => {
  if (field === undefined || field === null || field === '') return fallback;
  if (typeof field === 'object') return field;
  try { return JSON.parse(field); } catch { return fallback; }
};

function ApplicantApplicationDetails() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDetails() {
      try {
        const data = await apiRequest(`/applications/${id}`);
        setApp(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f4f4f2', minHeight: '80vh', padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ color: '#171717', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Loading your application document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#f4f4f2', minHeight: '80vh', padding: '60px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '32px', borderRadius: '4px' }}>
          <p style={{ color: '#991b1b', fontWeight: 700 }}>Error: {error}</p>
          <Link to="/applicant/dashboard" style={{ color: '#171717', fontWeight: 700, textDecoration: 'underline' }}>
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div style={{ backgroundColor: '#f4f4f2', minHeight: '80vh', padding: '60px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '32px', borderRadius: '4px' }}>
          <p>Application record not found.</p>
          <Link to="/applicant/dashboard" style={{ color: '#171717', fontWeight: 700, textDecoration: 'underline' }}>
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
  const positionTitle = app.job?.position || personal.postAppliedFor || 'Applied Position';
  const departmentName = app.job?.department || personal.faculty || 'Department';
  const jobCategory = app.job?.type || (personal.faculty?.includes('NON-TEACHING') ? 'NON_TEACHING' : 'TEACHING');

  const documents = Array.isArray(app.documents) ? app.documents : [];
  const statusHistory = Array.isArray(app.statusHistory) ? app.statusHistory : [];

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

  return (
    <div style={{ backgroundColor: '#f4f4f2', minHeight: '100vh', padding: '36px 16px 80px', fontFamily: "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, sans-serif", color: '#171717' }}>
      
      {/* Top Action Bar */}
      <div style={{ maxWidth: '960px', margin: '0 auto 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link 
          to="/applicant/dashboard" 
          style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>&larr;</span> Back to Dashboard
        </Link>
        <button
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
                RECRUITMENT APPLICATION DOSSIER
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
                  <span style={{ fontWeight: 700, color: '#171717' }}>{app.applicationNumber}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', display: 'block' }}>Application Date</span>
                  <span style={{ fontWeight: 700, color: '#171717' }}>
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Recent'}
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
                {statusLabel(app.status) || 'Application Submitted'}
              </div>
            </div>

          </div>
        </header>

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
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{personal.dob || 'N/A'}</span>
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
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{contact.state || 'Maharashtra'}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '3px' }}>City</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#171717' }}>{contact.city || 'Pune'}</span>
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
                  <button 
                    onClick={(e) => handleDownloadFile(e, doc.id, doc.originalName)} 
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #171717',
                      color: '#171717',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '0.80rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Download File
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── 07 RECRUITMENT STATUS HISTORY ─── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid #171717', paddingBottom: '6px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>{jobCategory === 'TEACHING' ? '07' : '06'}</span>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#171717', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Recruitment Status History
            </h2>
          </div>

          {statusHistory.length === 0 ? (
            <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.86rem' }}>Application submitted by candidate. No status transitions logged yet.</p>
          ) : (
            <div style={{ borderLeft: '2px solid #171717', paddingLeft: '18px', marginLeft: '6px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {statusHistory.map((step, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-23px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#171717' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#171717', textTransform: 'uppercase' }}>{step.newStatus}</span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {step.changedAt ? new Date(step.changedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </span>
                  </div>
                  {step.comment && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#475569' }}>
                      {step.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

    </div>
  );
}

export default ApplicantApplicationDetails;
