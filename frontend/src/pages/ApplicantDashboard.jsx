import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { statusLabel, statusBadgeClass, APPLICATION_STATUS } from '../utils/status';

function ApplicantDashboard() {
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const appsData = await apiRequest('/applications/my');
        setApplications(Array.isArray(appsData) ? appsData : (appsData?.data || []));

        const notifData = await apiRequest('/notifications').catch(() => []);
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

  return (
    <div className="container" style={{ maxWidth: '980px', padding: '30px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: '#0f2b5c', margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
          My Applications
        </h2>
        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
          Manage your job applications, continue incomplete drafts, and track recruitment progress with DYPIU.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '10px', marginBottom: '20px', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {/* Notifications Box */}
      {notifications.length > 0 && notifications.some(n => !n.isRead) && (
        <div style={{ border: '1px solid #bfdbfe', padding: '18px', backgroundColor: '#eff6ff', borderRadius: '12px', marginBottom: '28px' }}>
          <h3 style={{ marginTop: 0, color: '#1e40af', fontSize: '0.98rem', fontWeight: 800, borderBottom: '1px solid #bfdbfe', paddingBottom: '8px' }}>
            Notifications & Status Updates
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {notifications.filter(n => !n.isRead).map(notif => (
              <li key={notif.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <span>{notif.content}</span>
                <button 
                  onClick={() => handleMarkAsRead(notif.id)}
                  style={{ backgroundColor: '#bfdbfe', color: '#1e40af', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ fontWeight: 600 }}>Loading your applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div style={{ border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '40px 24px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#0f2b5c', fontSize: '1.1rem', fontWeight: 800 }}>No applications found</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>You have not started any job applications yet.</p>
          <Link to="/teaching" style={{ backgroundColor: '#0f766e', color: '#ffffff', padding: '10px 22px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' }}>
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
                  border: isDraft ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '22px 26px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDraft ? '#2563eb' : '#0f172a' }}>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>
                        <span>Progress: Step {currentStep} of 7</span>
                        <span>{completionPct}%</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${completionPct}%`, height: '100%', backgroundColor: '#2563eb', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  {isDraft ? (
                    <button
                      onClick={() => navigate(`/apply?jobId=${app.jobId}&draftId=${app.id}&step=${currentStep}`)}
                      style={{
                        backgroundColor: '#0f2b5c',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(15,43,92,0.2)'
                      }}
                    >
                      Continue Application &rarr;
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/applicant/applications/${app.id}`)}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: '#0f172a',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer'
                      }}
                    >
                      View Application
                    </button>
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
