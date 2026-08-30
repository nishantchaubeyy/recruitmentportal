import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

function AdminInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // New Interview Form state
  const [formData, setFormData] = useState({
    applicationId: '',
    jobId: '',
    candidateId: '',
    date: '',
    time: '10:00 AM',
    mode: 'IN_PERSON',
    venue: 'DYPIU Akurdi Pune Campus - Conference Room A',
    meetingLink: '',
    round: 'Round 1 - Technical & HR',
    panelMemberUserIds: []
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const [interviewsRes, appsRes, jobsRes, usersRes] = await Promise.all([
        apiRequest('/interviews'),
        apiRequest('/applications?limit=100'),
        apiRequest('/admin/vacancies'),
        apiRequest('/admin/users').catch(() => []) // Fallback if not super admin
      ]);

      setInterviews(Array.isArray(interviewsRes) ? interviewsRes : (interviewsRes?.data || []));
      setApplications(appsRes?.data || appsRes || []);
      setJobs(Array.isArray(jobsRes) ? jobsRes : (jobsRes?.data || []));
      setUsers(Array.isArray(usersRes) ? usersRes : (usersRes?.data || []));
    } catch (err) {
      setError(err.message || 'Failed to load interview data.');
    } finally {
      setLoading(false);
    }
  }

  const handleApplicationChange = (e) => {
    const appId = e.target.value;
    const selectedApp = applications.find(a => a.id === appId);
    
    if (selectedApp) {
      setFormData(prev => ({
        ...prev,
        applicationId: appId,
        jobId: selectedApp.jobId,
        candidateId: selectedApp.applicantId
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        applicationId: appId,
        jobId: '',
        candidateId: ''
      }));
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.applicationId || !formData.date || !formData.time) {
      setError('Application, date, and time are mandatory.');
      return;
    }

    try {
      await apiRequest('/interviews', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      setSuccess('Interview scheduled successfully! Candidate and committee members notified.');
      setShowScheduleModal(false);
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to schedule interview.');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <h2>Interview Management & Scheduling</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>
            Schedule interview rounds, assign committee panel members, and manage candidate calendar evaluations.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowScheduleModal(true)}
        >
          + Schedule New Interview
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', marginBottom: '20px' }}>
          {success}
        </div>
      )}

      {/* SCHEDULE INTERVIEW MODAL */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '30px',
            boxShadow: '0 20px 45px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f3b46' }}>Schedule Candidate Interview</h3>
              <button 
                onClick={() => setShowScheduleModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Select Candidate Application *</label>
                <select 
                  className="form-input"
                  value={formData.applicationId}
                  onChange={handleApplicationChange}
                  required
                >
                  <option value="">-- Choose Candidate Application --</option>
                  {applications.map(app => (
                    <option key={app.id} value={app.id}>
                      {app.applicationNumber} — {app.applicant?.name || 'Candidate'} ({app.job?.position || 'Job'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Interview Date *</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Interview Time *</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="e.g. 10:30 AM"
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Interview Mode *</label>
                  <select 
                    className="form-input"
                    value={formData.mode}
                    onChange={e => setFormData({ ...formData, mode: e.target.value })}
                  >
                    <option value="IN_PERSON">In-Person (On Campus)</option>
                    <option value="ONLINE">Online Meeting</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Round / Stage</label>
                  <input 
                    type="text"
                    className="form-input"
                    value={formData.round}
                    onChange={e => setFormData({ ...formData, round: e.target.value })}
                  />
                </div>
              </div>

              {formData.mode === 'IN_PERSON' ? (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Campus Venue / Room</label>
                  <input 
                    type="text"
                    className="form-input"
                    value={formData.venue}
                    onChange={e => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Online Meeting Link (Google Meet / Zoom / Teams)</label>
                  <input 
                    type="url"
                    className="form-input"
                    placeholder="https://meet.google.com/xyz-abc-def"
                    value={formData.meetingLink}
                    onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '25px' }}>
                <button 
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                >
                  Confirm & Schedule Interview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULED INTERVIEWS TABLE */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Loading scheduled interviews...</p>
      ) : interviews.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: '1.05rem', margin: 0 }}>No interviews scheduled currently.</p>
          <button 
            className="btn btn-primary btn-sm" 
            style={{ marginTop: '15px' }}
            onClick={() => setShowScheduleModal(true)}
          >
            Schedule First Interview
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <table>
            <thead>
              <tr>
                <th>Candidate & App ID</th>
                <th>Position / Department</th>
                <th>Date & Time</th>
                <th>Mode & Venue</th>
                <th>Round</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map(inv => (
                <tr key={inv.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f3b46' }}>{inv.candidate?.name || 'Candidate'}</div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{inv.applicationId}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inv.job?.position || 'Vacancy'}</div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{inv.job?.department}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <span style={{ fontSize: '0.82rem', color: '#475569' }}>{inv.time}</span>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '0.78rem', 
                      padding: '3px 8px', 
                      borderRadius: '4px',
                      fontWeight: 700,
                      backgroundColor: inv.mode === 'ONLINE' ? '#e0f2fe' : '#f0fdf4',
                      color: inv.mode === 'ONLINE' ? '#0369a1' : '#15803d'
                    }}>
                      {inv.mode}
                    </span>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                      {inv.mode === 'ONLINE' ? inv.meetingLink || 'Link provided' : inv.venue}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: '0.88rem' }}>{inv.round}</td>
                  <td>
                    <span style={{
                      fontSize: '0.8rem',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      backgroundColor: '#eff6ff',
                      color: '#0f2b5c'
                    }}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminInterviews;
