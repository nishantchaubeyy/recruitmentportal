import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';

function TrackApplication() {
  const [appNumber, setAppNumber] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!appNumber.trim()) {
      setError('Please enter a valid application reference number.');
      return;
    }

    setError('');
    setResult(null);
    setLoading(true);

    try {
      const data = await apiRequest(`/applications/track?applicationNumber=${encodeURIComponent(appNumber.trim())}`);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  // Determine stage progression index for the tracking timeline
  const getStageStep = (currentStatus) => {
    if (currentStatus === 'Application Submitted') return 1;
    if (currentStatus === 'Under Review') return 2;
    if (currentStatus === 'Shortlisted') return 3;
    if (currentStatus === 'Interview Scheduled') return 4;
    if (['Selected', 'Not Selected', 'Application Closed'].includes(currentStatus)) return 5;
    return 1;
  };

  const currentStepNum = result ? getStageStep(result.status) : 0;

  return (
    <div className="container" style={{ maxWidth: '850px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ fontSize: '0.9rem', color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>
          &larr; Back to Portal Home
        </Link>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#0f2b5c', fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0' }}>
          Track Application Status
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.98rem' }}>
          Enter your unique application reference number (e.g., APP-2026-000001) to view real-time recruitment status.
        </p>
      </div>

      {/* Search Card */}
      <div style={{ 
        border: '1px solid #e2e8f0', 
        borderRadius: '14px',
        padding: '28px', 
        backgroundColor: '#ffffff', 
        boxShadow: '0 4px 14px rgba(15,23,42,0.05)',
        marginBottom: '35px' 
      }}>
        <form onSubmit={handleTrack}>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label htmlFor="appNumber" style={{ fontWeight: 700, color: '#0f2b5c' }}>
              Application Reference Number <span style={{ color: '#ea580c' }}>*</span>
            </label>
            <input 
              type="text" 
              id="appNumber" 
              value={appNumber}
              onChange={(e) => setAppNumber(e.target.value)}
              placeholder="e.g. APP-2026-000001"
              style={{ fontSize: '1rem', padding: '12px 16px' }}
              required 
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '12px 28px' }}
            disabled={loading}
          >
            {loading ? 'Searching Record...' : '🔍 Track Status'}
          </button>
        </form>
      </div>

      {error && (
        <div style={{ 
          padding: '16px 20px', 
          backgroundColor: '#fff7ed', 
          border: '1px solid #fdba74', 
          borderRadius: '10px',
          color: '#c2410c', 
          marginBottom: '25px',
          fontWeight: 600
        }}>
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div style={{ 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '35px', 
          backgroundColor: '#ffffff',
          boxShadow: '0 8px 24px rgba(15,23,42,0.06)'
        }}>
          {/* Header Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderBottom: '1px solid #e2e8f0', 
            paddingBottom: '20px',
            marginBottom: '25px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Application ID</span>
              <h3 style={{ margin: 0, color: '#0f2b5c', fontSize: '1.45rem', fontWeight: 800 }}>{result.applicationNumber}</h3>
            </div>

            <div>
              <span className={`status-badge ${getStatusBadgeClass(result.status)}`} style={{ fontSize: '0.92rem', padding: '6px 16px' }}>
                ● {result.status}
              </span>
            </div>
          </div>

          {/* Details Table */}
          <table style={{ margin: '0 0 35px 0' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, width: '200px', backgroundColor: '#f8fafc', color: '#0f2b5c' }}>Position Applied For</td>
                <td><strong>{result.position}</strong></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, backgroundColor: '#f8fafc', color: '#0f2b5c' }}>Department / Division</td>
                <td>{result.department}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, backgroundColor: '#f8fafc', color: '#0f2b5c' }}>Submission Date</td>
                <td>{new Date(result.appliedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>
            </tbody>
          </table>

          {/* DYPIU BRANDED PROGRESSION TIMELINE */}
          <h4 style={{ color: '#0f2b5c', fontWeight: 800, margin: '0 0 20px 0', fontSize: '1.1rem' }}>
            Recruitment Progress Tracker
          </h4>

          <div className="tracking-timeline">
            {/* Step 1: Submitted (Teal) */}
            <div className={`timeline-step ${currentStepNum >= 1 ? (currentStepNum === 1 ? 'active-teal' : 'completed') : ''}`}>
              <div className="timeline-node">1</div>
              <div className="timeline-label">Submitted</div>
            </div>

            {/* Step 2: Under Review (Blue) */}
            <div className={`timeline-step ${currentStepNum >= 2 ? (currentStepNum === 2 ? 'active-blue' : 'completed') : ''}`}>
              <div className="timeline-node">2</div>
              <div className="timeline-label">Under Review</div>
            </div>

            {/* Step 3: Shortlisted (Green) */}
            <div className={`timeline-step ${currentStepNum >= 3 ? (currentStepNum === 3 ? 'active-green' : 'completed') : ''}`}>
              <div className="timeline-node">3</div>
              <div className="timeline-label">Shortlisted</div>
            </div>

            {/* Step 4: Interview (Orange) */}
            <div className={`timeline-step ${currentStepNum >= 4 ? (currentStepNum === 4 ? 'active-orange' : 'completed') : ''}`}>
              <div className="timeline-node">4</div>
              <div className="timeline-label">Interview</div>
            </div>

            {/* Step 5: Final Decision */}
            <div className={`timeline-step ${currentStepNum >= 5 ? (result.status === 'Selected' ? 'active-green' : 'completed') : ''}`}>
              <div className="timeline-node">5</div>
              <div className="timeline-label">Decision</div>
            </div>
          </div>

          {/* Activity Logs */}
          <h4 style={{ color: '#0f2b5c', fontWeight: 800, marginTop: '35px', marginBottom: '15px', fontSize: '1.05rem' }}>
            Status Audit Log
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {result.history.map((step, idx) => (
              <div key={idx} style={{ 
                padding: '16px 20px', 
                backgroundColor: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '10px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <span className={`status-badge ${getStatusBadgeClass(step.newStatus)}`}>
                    {step.newStatus}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                    {new Date(step.changedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {step.comment && (
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155' }}>
                    {step.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TrackApplication;
