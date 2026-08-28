import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest, API_URL } from '../utils/api';

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

  if (loading) return <div className="container"><p>Loading application details...</p></div>;
  if (error) return <div className="container"><p className="text-danger">Error: {error}</p><Link to="/applicant/dashboard">Back to Dashboard</Link></div>;
  if (!app) return <div className="container"><p>Application not found.</p></div>;

  const personal = app.personalInfo || {};
  const contact = app.contactDetails || {};
  const qualifications = app.qualifications || [];
  const experience = app.experience || [];
  const research = app.researchDetails || {};
  const references = app.references || [];

  return (
    <div className="container">
      <div style={{ marginBottom: '20px' }}>
        <Link to="/applicant/dashboard" style={{ fontSize: '0.9rem', color: '#64748b', textDecoration: 'none' }}>
          &larr; Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '25px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Submitted Application</span>
          <h2 style={{ border: 'none', margin: 0, padding: 0 }}>{app.applicationNumber}</h2>
          <span style={{ fontSize: '0.9rem', color: '#475569' }}>
            Position: <strong>{app.job.position}</strong> ({app.job.department})
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.85rem', display: 'block', color: '#64748b', marginBottom: '5px' }}>Current Status</span>
          <span className={`badge badge-${app.status.toLowerCase().replace(/ /g, '')}`} style={{ fontSize: '0.95rem', padding: '6px 12px' }}>
            {app.status}
          </span>
        </div>
      </div>

      {/* Grid of Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Personal Details */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>1. Personal Information</h3>
          <div className="form-grid">
            <div className="detail-item">
              <strong>Full Name</strong>
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
              <strong>Email Address</strong>
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
          <h3>2. Contact Details & Current Location</h3>
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
              <strong>Alternate Mobile Number</strong>
              <p style={{ margin: 0 }}>{contact.alternateMobile || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Qualifications */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>3. Academic Qualifications</h3>
          {qualifications.length === 0 ? (
            <p>No qualifications listed.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Degree / Class</th>
                  <th>Degree Name</th>
                  <th>Institute / University</th>
                  <th>Specialization</th>
                  <th>Year of Passing</th>
                  <th>Marks / CGPA</th>
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
                    <td>{q.percentage} %</td>
                    <td>{q.studyMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Research (Teaching only) */}
        {app.job.type === 'TEACHING' && (
          <div className="form-section" style={{ margin: 0 }}>
            <h3>4. Research / Publications & Eligibility Exams</h3>
            <div className="form-grid">
              <div className="detail-item">
                <strong>Ph.D. Status</strong>
                <p style={{ margin: 0 }}>{research.phdStatus || 'N/A'}</p>
              </div>
              <div className="detail-item">
                <strong>Ph.D. University & Year</strong>
                <p style={{ margin: 0 }}>{research.phdUniversity ? `${research.phdUniversity} (${research.phdYear})` : 'N/A'}</p>
              </div>
              <div className="detail-item">
                <strong>Total Publications</strong>
                <p style={{ margin: 0 }}>{research.publicationsCount || 0}</p>
              </div>
              <div className="detail-item">
                <strong>Scopus Publications</strong>
                <p style={{ margin: 0 }}>{research.scopusCount || 0} (ID: {research.scopusId || 'N/A'})</p>
              </div>
              <div className="detail-item">
                <strong>Web of Science Publications</strong>
                <p style={{ margin: 0 }}>{research.webOfScienceCount || 0}</p>
              </div>
              <div className="detail-item">
                <strong>Other Profile (ResearchGate/etc)</strong>
                <p style={{ margin: 0 }}>{research.researchProfileUrl || 'N/A'}</p>
              </div>
            </div>
            
            <div style={{ marginTop: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '15px' }}>
              <strong>National/State level eligibility exams cleared:</strong>
              <div className="form-grid" style={{ marginTop: '10px' }}>
                <div>NET Cleared: <strong>{research.netCleared ? `Yes (${research.netYear})` : 'No'}</strong></div>
                <div>SET Cleared: <strong>{research.setCleared ? `Yes (${research.setYear})` : 'No'}</strong></div>
                <div>SLET Cleared: <strong>{research.sletCleared ? `Yes (${research.sletYear})` : 'No'}</strong></div>
                <div>GATE Cleared: <strong>{research.gateCleared ? `Yes (${research.gateYear})` : 'No'}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Experience */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>{app.job.type === 'TEACHING' ? '5. Professional Work Experience' : '4. Professional Work Experience'}</h3>
          {experience.length === 0 ? (
            <p>No work experience listed.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Designation</th>
                  <th>From Date</th>
                  <th>To Date</th>
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
                    <td>{e.isCurrent ? 'Current Role' : e.toDate}</td>
                    <td>{e.salary || 'N/A'}</td>
                    <td>{e.noticePeriod || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* References */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>References</h3>
          {references.length === 0 ? (
            <p>No professional references listed.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              {references.map((r, idx) => (
                <div key={idx} style={{ border: '1px solid #cbd5e1', padding: '12px', backgroundColor: '#ffffff' }}>
                  <strong>Reference #{idx + 1}: {r.refName}</strong>
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

        {/* Uploaded Documents */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>Uploaded Supporting Documents</h3>
          {app.documents.length === 0 ? (
            <p>No files uploaded.</p>
          ) : (
            <ul style={{ paddingLeft: '20px' }}>
              {app.documents.map((doc) => {
                // Generate a secure download URL passing application ID and doc ID
                const downloadLink = `${API_URL}/applications/${app.id}/documents/${doc.id}`;
                
                // Get token to construct auth download
                const token = localStorage.getItem('token');
                const secureLinkWithToken = (e) => {
                  e.preventDefault();
                  // In a production app we do this via custom request or headers.
                  // For simple downloads in phase 1, we can fetch the file with headers and create a local blob object url.
                  fetch(downloadLink, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                  .then(response => {
                    if(!response.ok) throw new Error('Failed to retrieve file.');
                    return response.blob();
                  })
                  .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = doc.originalName;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  })
                  .catch(err => alert(err.message));
                };

                return (
                  <li key={doc.id} style={{ margin: '8px 0' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{doc.documentType === 'resume' ? 'CV / Resume' : doc.documentType}:</span>{' '}
                    <a href="#download" onClick={secureLinkWithToken} style={{ color: '#1e40af', fontWeight: 600 }}>
                      {doc.originalName}
                    </a>{' '}
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      ({(doc.fileSize / (1024 * 1024)).toFixed(2)} MB, uploaded on {new Date(doc.uploadedAt).toLocaleDateString('en-IN')})
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Status History (Audit Trail) */}
        <div className="form-section" style={{ margin: 0 }}>
          <h3>Recruitment Progress Status Timeline</h3>
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

export default ApplicantApplicationDetails;
