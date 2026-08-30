import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest, API_URL } from '../utils/api';
import { statusLabel } from '../utils/status';

function AdminJobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const jobData = await apiRequest(`/admin/vacancies/${id}`);
        setJob(jobData);

        const appsData = await apiRequest(`/applications?jobId=${id}&limit=100`);
        setApplications(Array.isArray(appsData) ? appsData : (appsData?.data || []));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const downloadCV = async (appId, docId, filename) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/applications/${appId}/documents/${docId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('File download failed.');
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

  if (loading) return <div className="container"><p>Loading vacancy and applicants details...</p></div>;
  if (error) return <div className="container"><p className="text-danger">Error: {error}</p><Link to="/admin/jobs">Back to Jobs</Link></div>;
  if (!job) return <div className="container"><p>Job vacancy not found.</p></div>;

  return (
    <div className="container">
      <div style={{ marginBottom: '20px' }}>
        <Link to="/admin/jobs" style={{ fontSize: '0.9rem', color: '#64748b', textDecoration: 'none' }}>
          &larr; Back to Vacancies
        </Link>
      </div>

      <div style={{ border: '1px solid #cbd5e1', padding: '20px', backgroundColor: '#f8fafc', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>JOB VACANCY DETAILS</span>
            <h2 style={{ border: 'none', margin: '5px 0', padding: 0 }}>{job.position}</h2>
            <span style={{ fontSize: '0.9rem' }}>{job.department} &bull; {job.type === 'TEACHING' ? 'Teaching Faculty' : 'Non-Teaching'}</span>
          </div>
          <span className={`badge badge-${job.status.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '5px 10px' }}>
            {job.status}
          </span>
        </div>
      </div>

      <h3>Applications Received ({applications.length})</h3>

      {applications.length === 0 ? (
        <p style={{ fontStyle: 'italic', color: '#64748b', marginTop: '15px' }}>
          No applications have been submitted for this vacancy yet.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Application Number</th>
              <th>Candidate Name</th>
              <th>Email</th>
              <th>Date Applied</th>
              <th>Status</th>
              <th>CV</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id}>
                <td>
                  <strong>{app.applicationNumber}</strong>
                </td>
                <td>{app.applicant?.name}</td>
                <td>{app.applicant?.user?.email}</td>
                <td>{new Date(app.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                  <span className={`badge badge-${(app.status || '').toLowerCase().replace(/_/g, '')}`}>
                    {statusLabel(app.status)}
                  </span>
                </td>
                <td>
                  {/* Since CV has relation load, let's fetch application documents dynamically or link. 
                      Since CV is always uploaded to submit, we check if the applicant has uploaded resume.
                      We will fetch documents inside the backend search application listing or fetch dynamically.
                      Wait, the applications list returned by GET /applications?jobId=XXX does not include documents.
                      We can handle downloading CV from the Review detail page, or let's check if the resume is easy to fetch.
                      To keep it robust, we can just link to details or let them download. Let's provide a direct CV download button.
                      Wait! In `backend/src/controllers/applicationController.js`, getApplications returns `applicant` and `job` but NOT documents list. 
                      Let's check: To download CV directly here, we can make the admin open the applicant profile. 
                      So we can just display "Available in Profile" or fetch, or let's update backend or keep it as "Review" button. 
                      Let's make Action link to review profile `/admin/applications/${app.id}` where they can review details and download CV! */}
                  <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>In Profile</span>
                </td>
                <td>
                  <Link to={`/admin/applications/${app.id}`} className="btn btn-sm btn-primary">
                    Review Application
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminJobDetails;
