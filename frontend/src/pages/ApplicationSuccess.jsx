import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';

function ApplicationSuccess() {
  const location = useLocation();
  const state = location.state;

  // Protect route: if no submission state exists, redirect to dashboard
  if (!state || !state.appNumber) {
    return <Navigate to="/applicant/dashboard" replace />;
  }

  return (
    <div className="container">
      <div className="success-card">
        <h2>✓ Application Submitted Successfully</h2>
        <p style={{ fontSize: '1.05rem', color: '#475569', margin: '15px 0' }}>
          Thank you for applying. Your application has been successfully received by D Y Patil International University recruitment cell.
        </p>

        <div className="success-details">
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', fontWeight: 600 }}>APPLICATION NUMBER</span>
            <strong style={{ fontSize: '1.4rem', color: '#0f172a' }}>{state.appNumber}</strong>
          </div>
          <div style={{ marginTop: '15px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', fontWeight: 600 }}>POSITION</span>
            <strong>{state.position}</strong>
          </div>
          <div style={{ marginTop: '15px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', fontWeight: 600 }}>CURRENT STATUS</span>
            <span className="badge badge-submitted" style={{ padding: '4px 10px', fontSize: '0.8rem', marginTop: '5px' }}>
              {state.status}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '30px' }}>
          Please note down your Application Number for future communications. You can track the real-time status of your application at any time using our tracking tool or from your applicant dashboard.
        </p>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <Link to="/track" className="btn btn-outline" style={{ padding: '10px 20px' }}>
            Track Application
          </Link>
          <Link to="/applicant/dashboard" className="btn btn-primary" style={{ padding: '10px 20px' }}>
            Go to My Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ApplicationSuccess;
