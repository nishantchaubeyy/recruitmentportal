import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';

function ApplicantDashboard() {
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const appsData = await apiRequest('/applications');
        setApplications(appsData);

        const notifData = await apiRequest('/notifications');
        setNotifications(notifData);
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Application Submitted': return 'status-submitted';
      case 'Under Review': return 'status-under-review';
      case 'Shortlisted': return 'status-shortlisted';
      case 'Interview Scheduled': return 'status-interview';
      case 'Selected': return 'status-selected';
      case 'Waitlisted': return 'status-waitlisted';
      case 'Not Selected': return 'status-not-selected';
      case 'Application Closed': return 'status-closed';
      default: return 'status-submitted';
    }
  };

  return (
    <div className="container">
      <h2>Applicant Dashboard</h2>
      <p style={{ color: '#64748b', marginBottom: '30px' }}>
        Manage your ongoing job applications and track status updates from the University.
      </p>

      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Notifications Box */}
      {notifications.length > 0 && notifications.some(n => !n.isRead) && (
        <div style={{ border: '1px solid #cbd5e1', padding: '15px', backgroundColor: '#eff6ff', marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0, color: '#1e40af', fontSize: '1rem', borderBottom: '1px solid #bfdbfe', paddingBottom: '5px' }}>
            System Notifications
          </h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {notifications.filter(n => !n.isRead).map(notif => (
              <li key={notif.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <span>{notif.content}</span>
                <button 
                  onClick={() => handleMarkAsRead(notif.id)}
                  className="btn btn-sm"
                  style={{ backgroundColor: '#bfdbfe', color: '#1e40af' }}
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3>My Applications</h3>
      
      {loading ? (
        <p>Loading your applications...</p>
      ) : applications.length === 0 ? (
        <div style={{ border: '1px dashed #cbd5e1', padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
          <p>You have not started any applications yet.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '10px' }}>
            Browse Job Vacancies
          </Link>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Application No.</th>
              <th>Position</th>
              <th>Department / School</th>
              <th>Applied Date</th>
              <th>Current Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const isDraft = app.status === 'DRAFT';
              return (
                <tr key={app.id}>
                  <td>
                    <strong>{isDraft ? 'DRAFT' : app.applicationNumber}</strong>
                  </td>
                  <td>{app.job.position}</td>
                  <td>{app.job.department}</td>
                  <td>{new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    {isDraft ? (
                      <button 
                        onClick={() => navigate(`/applicant/apply/${app.jobId}`)}
                        className="btn btn-sm btn-primary"
                      >
                        Resume Draft
                      </button>
                    ) : (
                      <Link to={`/applicant/applications/${app.id}`} className="btn btn-sm btn-outline">
                        View Details
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ApplicantDashboard;
