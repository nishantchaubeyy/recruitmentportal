import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest, API_URL } from '../utils/api';

function AdminReviewApplication() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Status Change State
  const [newStatus, setNewStatus] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');

  const fetchApplicationDetails = async () => {
    try {
      const data = await apiRequest(`/applications/${id}`);
      setApp(data);
      setNewStatus(data.status);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationDetails();
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
      await apiRequest(`/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          comment: adminComment
        })
      });

      setStatusSuccess(`Application status changed to "${newStatus}" successfully.`);
      setAdminComment('');
      // Reload application details to display updated status timeline
      fetchApplicationDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadFile = async (e, docId, filename) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/applications/${app.id}/documents/${docId}`, {
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
      alert(err.message);
    }
  };

  if (loading) return <div className="container"><p>Loading candidate profile...</p></div>;
  if (error && !app) return <div className="container"><p className="text-danger">Error: {error}</p><Link to="/admin/applications">Back to Applications</Link></div>;
  if (!app) return <div className="container"><p>Application details not found.</p></div>;

  const personal = app.personalInfo || {};
  const contact = app.contactDetails || {};
  const qualifications = app.qualifications || [];
  const experience = app.experience || [];
  const research = app.researchDetails || {};
  const references = app.references || [];
  const skillsCertificates = app.skillsCertificates || {};

  return (
    <div className="container">
      <div style={{ marginBottom: '20px' }}>
        <Link to="/admin/applications" style={{ fontSize: '0.9rem', color: '#64748b', textDecoration: 'none' }}>
          &larr; Back to Applications List
        </Link>
      </div>

      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '25px' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>CANDIDATE APPLICATION REVIEW</span>
          <h2 style={{ border: 'none', margin: '5px 0 0 0', padding: 0 }}>{app.applicant.name} ({app.applicationNumber})</h2>
          <span style={{ fontSize: '0.9rem', color: '#475569' }}>
            Position: <strong>{app.job.position}</strong> ({app.job.department}) &bull; Email: {app.applicant.user.email}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.8rem', display: 'block', color: '#64748b', marginBottom: '3px' }}>Current Status</span>
          <span className={`badge badge-${app.status.toLowerCase().replace(/ /g, '')}`} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
            {app.status}
          </span>
        </div>
      </div>

      {/* Admin Action Box: Change Status and Add Comment */}
      <div style={{ border: '1px solid #cbd5e1', padding: '20px', backgroundColor: '#f8fafc', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>Recruitment Action panel</h3>
        
        {statusSuccess && (
          <div style={{ padding: '10px', backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#166534', marginBottom: '15px', fontSize: '0.85rem' }}>
            {statusSuccess}
          </div>
        )}

        <form onSubmit={handleStatusChangeSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label htmlFor="newStatus">Change Recruitment Status</label>
            <select id="newStatus" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option>Application Submitted</option>
              <option>Under Review</option>
              <option>Shortlisted</option>
              <option>Interview Scheduled</option>
              <option>Selected</option>
              <option>Waitlisted</option>
              <option>Not Selected</option>
              <option>Application Closed</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="adminComment">Comments / Internal Remarks</label>
            <input 
              type="text" 
              id="adminComment" 
              value={adminComment} 
              onChange={(e) => setAdminComment(e.target.value)} 
              placeholder="e.g. Candidates profile matches computing qualifications. Shortlist for technical interview round." 
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ gridColumn: 'span 2', width: '200px', alignSelf: 'flex-start' }}
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Status & Log'}
          </button>
        </form>
      </div>

      {/* Candidate Profile Details Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Personal Details */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>1. Personal Information</h3>
          <div className="form-grid">
            <div className="detail-item">
              <strong>Title & Name</strong>
              <p style={{ margin: 0 }}>{personal.title} {personal.firstName} {personal.middleName} {personal.lastName}</p>
            </div>
            <div className="detail-item">
              <strong>Date of Birth</strong>
              <p style={{ margin: 0 }}>{personal.dob}</p>
            </div>
            <div className="detail-item">
              <strong>Gender</strong>
              <p style={{ margin: 0 }}>{personal.gender}</p>
            </div>
            <div className="detail-item">
              <strong>Marital Status</strong>
              <p style={{ margin: 0 }}>{personal.maritalStatus || 'N/A'}</p>
            </div>
            <div className="detail-item">
              <strong>Email ID</strong>
              <p style={{ margin: 0 }}>{personal.email}</p>
            </div>
            <div className="detail-item">
              <strong>Alternate Email</strong>
              <p style={{ margin: 0 }}>{personal.alternateEmail || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>2. Current Location & Contact Details</h3>
          <div className="form-grid">
            <div className="detail-item">
              <strong>State</strong>
              <p style={{ margin: 0 }}>{contact.state}</p>
            </div>
            <div className="detail-item">
              <strong>City</strong>
              <p style={{ margin: 0 }}>{contact.city}</p>
            </div>
            <div className="detail-item">
              <strong>Mobile Number</strong>
              <p style={{ margin: 0 }}>{contact.mobile}</p>
            </div>
            <div className="detail-item">
              <strong>Alternate Mobile</strong>
              <p style={{ margin: 0 }}>{contact.alternateMobile || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Qualifications */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>3. Academic Qualifications</h3>
          {qualifications.length === 0 ? (
            <p>No qualifications listed by candidate.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Degree Level</th>
                  <th>Degree Name</th>
                  <th>Institute / University / Board</th>
                  <th>Specialization</th>
                  <th>Passing Year</th>
                  <th>Percentage / CGPA</th>
                  <th>Mode of Study</th>
                </tr>
              </thead>
              <tbody>
                {qualifications.map((q, idx) => (
                  <tr key={idx}>
                    <td><strong>{q.qualificationDegree}</strong></td>
                    <td>{q.degreeName}</td>
                    <td>{q.instituteName}</td>
                    <td>{q.specialization || 'N/A'}</td>
                    <td>{q.passingYear}</td>
                    <td>{q.percentage}</td>
                    <td>{q.studyMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Research Details (Teaching only) */}
        {app.job.type === 'TEACHING' && (
          <div className="form-section" style={{ margin: 0 }}>
            <h3>4. Research / Publications & Eligibility</h3>
            <div className="form-grid">
              <div className="detail-item">
                <strong>Ph.D. Status</strong>
                <p style={{ margin: 0 }}>{research.phdStatus || 'N/A'}</p>
              </div>
              <div className="detail-item">
                <strong>Ph.D. Details</strong>
                <p style={{ margin: 0 }}>{research.phdUniversity ? `${research.phdUniversity} (${research.phdYear})` : 'N/A'}</p>
              </div>
              <div className="detail-item">
                <strong>Core Research Area</strong>
                <p style={{ margin: 0 }}>{research.researchArea || 'N/A'}</p>
              </div>
              <div className="detail-item">
                <strong>Publications Count</strong>
                <p style={{ margin: 0 }}>{research.publicationsCount || 0}</p>
              </div>
              <div className="detail-item">
                <strong>Scopus Publications</strong>
                <p style={{ margin: 0 }}>{research.scopusCount || 0} (ID: {research.scopusId || 'N/A'})</p>
              </div>
              <div className="detail-item">
                <strong>Web of Science Count</strong>
                <p style={{ margin: 0 }}>{research.webOfScienceCount || 0}</p>
              </div>
              <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                <strong>Online Profile Link</strong>
                <p style={{ margin: 0 }}>
                  {research.researchProfileUrl ? (
                    <a href={research.researchProfileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1e40af' }}>
                      {research.researchProfileUrl}
                    </a>
                  ) : 'N/A'}
                </p>
              </div>
            </div>
            
            <div style={{ marginTop: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '15px' }}>
              <strong>Eligibility Exams Cleared:</strong>
              <div className="form-grid" style={{ marginTop: '10px' }}>
                <div>NET: <strong>{research.netCleared ? `Yes (${research.netYear})` : 'No'}</strong></div>
                <div>SET: <strong>{research.setCleared ? `Yes (${research.setYear})` : 'No'}</strong></div>
                <div>SLET: <strong>{research.sletCleared ? `Yes (${research.sletYear})` : 'No'}</strong></div>
                <div>GATE: <strong>{research.gateCleared ? `Yes (${research.gateYear})` : 'No'}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Experience */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>{app.job.type === 'TEACHING' ? '5. Professional Experience' : '4. Professional Experience'}</h3>
          {experience.length === 0 ? (
            <p>No work experience records listed.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Designation</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Current Salary</th>
                  <th>Notice Period</th>
                </tr>
              </thead>
              <tbody>
                {experience.map((e, idx) => (
                  <tr key={idx}>
                    <td><strong>{e.organization}</strong></td>
                    <td>{e.experienceType}</td>
                    <td>{e.designation}</td>
                    <td>{e.fromDate}</td>
                    <td>{e.isCurrent ? 'Current' : e.toDate}</td>
                    <td>{e.salary || 'N/A'}</td>
                    <td>{e.noticePeriod || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Skills & Certifications */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>Skills & Certifications</h3>
          <div className="detail-item" style={{ marginBottom: '15px' }}>
            <strong>Skills / Competencies</strong>
            <p style={{ whiteSpace: 'pre-wrap' }}>{skillsCertificates.skills || 'None listed.'}</p>
          </div>
          <div className="detail-item">
            <strong>Certifications</strong>
            <p style={{ whiteSpace: 'pre-wrap' }}>{skillsCertificates.certifications || 'None listed.'}</p>
          </div>
        </div>

        {/* References */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>References</h3>
          {references.length === 0 ? (
            <p>No references provided.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              {references.map((r, idx) => (
                <div key={idx} style={{ border: '1px solid #cbd5e1', padding: '12px', backgroundColor: '#ffffff' }}>
                  <strong>{r.refName}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                    {r.refDesignation} at {r.refOrganization}<br />
                    Email: {r.refEmail}<br />
                    Phone: {r.refPhone}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Candidate Documents */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>Uploaded Supporting Documents</h3>
          {app.documents.length === 0 ? (
            <p style={{ color: '#991b1b', fontWeight: 600 }}>Error: No documents found. Candidate must upload CV.</p>
          ) : (
            <ul style={{ paddingLeft: '20px' }}>
              {app.documents.map((doc) => (
                <li key={doc.id} style={{ margin: '8px 0' }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                    {doc.documentType === 'resume' ? 'CV / Resume' : doc.documentType}:
                  </span>{' '}
                  <a 
                    href="#download" 
                    onClick={(e) => handleDownloadFile(e, doc.id, doc.originalName)} 
                    style={{ color: '#1e40af', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    {doc.originalName}
                  </a>{' '}
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    ({(doc.fileSize / (1024 * 1024)).toFixed(2)} MB, uploaded on {new Date(doc.uploadedAt).toLocaleDateString('en-IN')})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Status History (Timeline Audit trail) */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>Recruitment Status History Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {app.statusHistory.map((step, idx) => (
              <div key={idx} className="track-step">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <strong>{step.newStatus}</strong>
                  <span className="track-step-date">
                    {new Date(step.changedAt).toLocaleString('en-IN')}
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
        </div>

      </div>
    </div>
  );
}

export default AdminReviewApplication;
