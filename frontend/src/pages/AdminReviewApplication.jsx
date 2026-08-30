import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest, API_URL } from '../utils/api';

function AdminReviewApplication() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Status Change & Interview State
  const [newStatus, setNewStatus] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('10:00 AM');
  const [interviewVenue, setInterviewVenue] = useState('DYPIU Akurdi Pune Campus - Conference Room A');
  const [interviewMode, setInterviewMode] = useState('IN_PERSON');

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/applications/${id}`);
      setApp(data);
      setNewStatus(data?.status || 'SUBMITTED');
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

  const handleStatusChangeSubmit = async (e) => {
    e.preventDefault();
    if (!newStatus) {
      alert('Please select a valid status.');
      return;
    }

    setSubmitting(true);
    setError('');
    setStatusSuccess('');

    try {
      // 1. Update Application Status
      await apiRequest(`/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          comment: adminComment
        })
      });

      // 2. If status is Interview Scheduled, also schedule the interview record
      if (newStatus === 'Interview Scheduled' && interviewDate) {
        await apiRequest('/interviews', {
          method: 'POST',
          body: JSON.stringify({
            applicationId: id,
            jobId: app?.jobId,
            candidateId: app?.applicantId,
            date: interviewDate,
            time: interviewTime,
            venue: interviewVenue,
            mode: interviewMode,
            round: 'Technical & HR Interview'
          })
        }).catch(() => {});
      }

      setStatusSuccess(`Application status changed to "${newStatus}" successfully.`);
      setAdminComment('');
      fetchApplicationDetails();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadFile = async (e, docId, filename) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/applications/${app?.id}/documents/${docId}`, {
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

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: '#0f2b5c', fontWeight: 600 }}>Loading candidate dossier profile...</p>
      </div>
    );
  }

  if (error && !app) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          ⚠️ Error: {error}
        </div>
        <Link to="/admin/applications" style={{ color: '#0f2b5c', fontWeight: 700 }}>
          &larr; Return to Applications List
        </Link>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <p>Application record not found.</p>
        <Link to="/admin/applications" style={{ color: '#0f2b5c', fontWeight: 700 }}>
          &larr; Return to Applications List
        </Link>
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
  const skillsCertificates = parseJsonField(app.skillsCertificates, {});

  const displayTitle = (personal.title && personal.title !== 'Select' && personal.title !== 'Select Title' && personal.title !== 'Select...') ? personal.title : '';
  const formattedFullName = [displayTitle, personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const candidateName = formattedFullName || app.applicant?.name || 'Candidate';
  const candidateEmail = app.applicant?.user?.email || personal.email || contact.email || 'N/A';
  const candidateMobile = app.applicant?.mobile || contact.mobile || 'N/A';
  const positionTitle = app.job?.position || personal.postAppliedFor || 'Faculty Position';
  const departmentName = app.job?.department || personal.faculty || 'Department';
  const jobCategory = app.job?.type || (personal.faculty?.includes('NON-TEACHING') ? 'NON_TEACHING' : 'TEACHING');

  const documents = Array.isArray(app.documents) ? app.documents : [];
  const statusHistory = Array.isArray(app.statusHistory) ? app.statusHistory : [];

  return (
    <div className="container" style={{ maxWidth: '1100px', padding: '20px 15px' }}>
      
      {/* Top Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/admin/applications" style={{ fontSize: '0.9rem', color: '#0891b2', fontWeight: 700, textDecoration: 'none' }}>
          &larr; Back to Applications List
        </Link>
      </div>

      {/* Candidate Dossier Header */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px', marginBottom: '25px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>
              CANDIDATE DOSSIER REVIEW &bull; {app.applicationNumber || 'APP-2026-000001'}
            </span>
            <h1 style={{ color: '#0f2b5c', margin: '6px 0 6px 0', fontSize: '1.6rem', fontWeight: 800 }}>
              {candidateName}
            </h1>
            <p style={{ color: '#475569', margin: 0, fontSize: '0.92rem', fontWeight: 600 }}>
              Applied For: <strong style={{ color: '#0f2b5c' }}>{positionTitle}</strong> ({departmentName})
            </p>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>📧 <strong>Email:</strong> {candidateEmail}</span>
              <span>📱 <strong>Mobile:</strong> {candidateMobile}</span>
              <span>📅 <strong>Applied On:</strong> {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.78rem', display: 'block', color: '#64748b', marginBottom: '4px', fontWeight: 700 }}>Current Status</span>
            <span style={{
              fontSize: '0.88rem',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 800,
              display: 'inline-block',
              backgroundColor: app.status === 'Shortlisted' ? '#dcfce7' : app.status === 'Under Review' ? '#cff4fc' : '#e0f2fe',
              color: app.status === 'Shortlisted' ? '#15803d' : app.status === 'Under Review' ? '#0e7490' : '#0369a1',
              border: '1px solid currentColor'
            }}>
              {app.status || 'SUBMITTED'}
            </span>
          </div>
        </div>
      </div>

      {/* HR Action Box: Change Recruitment Status */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '22px', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 14px 0', color: '#0f2b5c', fontWeight: 800, fontSize: '1.1rem' }}>
          ⚡ HR Recruitment Action Panel
        </h3>
        
        {statusSuccess && (
          <div style={{ padding: '12px 16px', backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: 700 }}>
            ✔️ {statusSuccess}
          </div>
        )}

        <form onSubmit={handleStatusChangeSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Update Status</label>
            <select 
              value={newStatus} 
              onChange={(e) => setNewStatus(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
            >
              <option value="Application Submitted">Application Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Interview Scheduled">Interview Scheduled</option>
              <option value="Selected">Selected</option>
              <option value="Waitlisted">Waitlisted</option>
              <option value="Not Selected">Not Selected</option>
              <option value="Application Closed">Application Closed</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Remarks / Interview Feedback</label>
            <input 
              type="text" 
              value={adminComment} 
              onChange={(e) => setAdminComment(e.target.value)} 
              placeholder="e.g. Candidate profile shortlisted for Technical Interview round." 
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <button 
            type="submit" 
            style={{ backgroundColor: '#0f2b5c', color: '#ffffff', fontWeight: 700, border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem' }}
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Status'}
          </button>

          {newStatus === 'Interview Scheduled' && (
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #cbd5e1' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>Interview Date *</label>
                <input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>Interview Time</label>
                <input type="text" value={interviewTime} onChange={e => setInterviewTime(e.target.value)} placeholder="10:00 AM" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>Interview Mode</label>
                <select value={interviewMode} onChange={e => setInterviewMode(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="IN_PERSON">In-Person (Campus)</option>
                  <option value="ONLINE">Online Video Call</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>Venue / Meeting Link</label>
                <input type="text" value={interviewVenue} onChange={e => setInterviewVenue(e.target.value)} placeholder="Conference Room A / Google Meet Link" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Candidate Dossier Profile Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* 1. Personal Information */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#0f2b5c', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
            1. Personal Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Full Name</span>
              <strong style={{ color: '#0f2b5c' }}>{candidateName}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Date of Birth (Age)</span>
              <strong>{personal.dob || 'N/A'} {personal.age ? `(${personal.age} Yrs)` : ''}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Gender</span>
              <strong>{personal.gender || 'N/A'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Marital Status</span>
              <strong>{personal.maritalStatus || 'N/A'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Primary Email</span>
              <strong>{candidateEmail}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Alternate Email</span>
              <strong>{personal.alternateEmail || 'N/A'}</strong>
            </div>
          </div>
        </div>

        {/* 2. Contact & Location */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#0f2b5c', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
            2. Location & Communication
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Mobile Number</span>
              <strong>{candidateMobile}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Alternate Mobile</span>
              <strong>{contact.alternateMobile || 'N/A'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>State</span>
              <strong>{contact.state || 'Maharashtra'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>City</span>
              <strong>{contact.city || 'Pune'}</strong>
            </div>
          </div>
        </div>

        {/* 3. Academic Qualifications */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#0f2b5c', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
            3. Academic Qualifications
          </h3>
          {qualifications.length === 0 ? (
            <p style={{ color: '#64748b' }}>No qualification entries provided.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Degree Level</th>
                    <th style={{ padding: '8px 12px' }}>Degree Name</th>
                    <th style={{ padding: '8px 12px' }}>Institute / University</th>
                    <th style={{ padding: '8px 12px' }}>Specialization</th>
                    <th style={{ padding: '8px 12px' }}>Year</th>
                    <th style={{ padding: '8px 12px' }}>CGPA / %</th>
                    <th style={{ padding: '8px 12px' }}>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {qualifications.map((q, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f2b5c' }}>{q.qualificationDegree || 'Degree'}</td>
                      <td style={{ padding: '8px 12px' }}>{q.degreeName || 'N/A'}</td>
                      <td style={{ padding: '8px 12px' }}>{q.instituteName || 'N/A'}</td>
                      <td style={{ padding: '8px 12px' }}>{q.specialization || 'N/A'}</td>
                      <td style={{ padding: '8px 12px' }}>{q.passingYear || 'N/A'}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{q.percentage || q.cgpa || 'N/A'}</td>
                      <td style={{ padding: '8px 12px' }}>{q.studyMode || 'Full-Time'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. Research / Ph.D. (Teaching Positions) */}
        {jobCategory === 'TEACHING' && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#0f2b5c', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
              4. Ph.D. & Research Profile
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Ph.D. Status</span>
                <strong>{research.phdStatus || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>University & Year</span>
                <strong>{research.phdUniversity ? `${research.phdUniversity} (${research.phdYear || ''})` : 'N/A'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Scopus Publications</span>
                <strong>{research.scopusCount || 0}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Web of Science</span>
                <strong>{research.wosCount || research.webOfScienceCount || 0}</strong>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Eligibility Exams: </span>
              <span style={{ fontSize: '0.88rem', color: '#0f2b5c', fontWeight: 600 }}>
                NET: {research.net?.cleared === 'Yes' || research.netCleared ? '✅ Yes' : '❌ No'} &bull; 
                SET: {research.setExam?.cleared === 'Yes' || research.setCleared ? '✅ Yes' : '❌ No'} &bull; 
                GATE: {research.gate?.cleared === 'Yes' || research.gateCleared ? '✅ Yes' : '❌ No'}
              </span>
            </div>
          </div>
        )}

        {/* 5. Professional Work Experience */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#0f2b5c', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
            {jobCategory === 'TEACHING' ? '5. Work Experience' : '4. Work Experience'}
          </h3>
          {experience.length === 0 ? (
            <p style={{ color: '#64748b' }}>No work experience recorded (Fresher Candidate).</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Organization</th>
                    <th style={{ padding: '8px 12px' }}>Type</th>
                    <th style={{ padding: '8px 12px' }}>Designation</th>
                    <th style={{ padding: '8px 12px' }}>From</th>
                    <th style={{ padding: '8px 12px' }}>To</th>
                    <th style={{ padding: '8px 12px' }}>Salary</th>
                    <th style={{ padding: '8px 12px' }}>Notice Period</th>
                  </tr>
                </thead>
                <tbody>
                  {experience.map((e, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f2b5c' }}>{e.organization || 'N/A'}</td>
                      <td style={{ padding: '8px 12px' }}>{e.type || e.experienceType || 'Teaching'}</td>
                      <td style={{ padding: '8px 12px' }}>{e.designation || 'N/A'}</td>
                      <td style={{ padding: '8px 12px' }}>{e.fromDate || 'N/A'}</td>
                      <td style={{ padding: '8px 12px' }}>{e.isCurrent ? 'Present' : e.toDate || 'N/A'}</td>
                      <td style={{ padding: '8px 12px' }}>{e.salary || 'N/A'}</td>
                      <td style={{ padding: '8px 12px' }}>{e.noticePeriod || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 6. Uploaded Documents */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#0f2b5c', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
            📁 Uploaded Documents
          </h3>
          {documents.length === 0 ? (
            <p style={{ color: '#64748b' }}>CV / Resume attached in candidate submission.</p>
          ) : (
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {documents.map((doc) => (
                <li key={doc.id} style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                    {doc.documentType === 'resume' ? 'CV / Resume' : doc.documentType}:
                  </span>{' '}
                  <a 
                    href="#download" 
                    onClick={(e) => handleDownloadFile(e, doc.id, doc.originalName)} 
                    style={{ color: '#0891b2', fontWeight: 700, textDecoration: 'underline' }}
                  >
                    {doc.originalName || 'Document.pdf'}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 7. Recruitment Timeline History */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#0f2b5c', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
            📜 Recruitment Status History Timeline
          </h3>
          {statusHistory.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Application submitted by candidate. No status updates logged yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {statusHistory.map((step, idx) => (
                <div key={idx} style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #0f2b5c' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: '#0f2b5c' }}>{step.newStatus}</strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {step.changedAt ? new Date(step.changedAt).toLocaleString('en-IN') : 'Recent'}
                    </span>
                  </div>
                  {step.comment && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }}>
                      &ldquo;{step.comment}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default AdminReviewApplication;
