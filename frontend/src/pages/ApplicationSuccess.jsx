import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';

function ApplicationSuccess() {
  const location = useLocation();
  const state = location.state;

  // Protect route: if no submission state exists, redirect to dashboard or home
  if (!state || !state.appNumber) {
    return <Navigate to="/" replace />;
  }

  const isInterest = Boolean(state.isInterest);

  return (
    <div className="container" style={{ maxWidth: '780px', padding: '50px 24px' }}>
      <div className="success-card" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '36px', boxShadow: '0 4px 16px rgba(15,23,42,0.05)', textAlign: 'center' }}>
        
        {isInterest ? (
          <>
            <h2 style={{ color: '#0f766e', margin: '0 0 12px 0', fontSize: '1.75rem', fontWeight: 800 }}>
              Form Submitted — Details Registered
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#475569', margin: '0 0 24px 0', lineHeight: '1.6' }}>
              {state.message || 'Thank you for submitting your form! Applications for this position are currently closed. We have registered your details in our system and will automatically notify you as soon as a relevant vacancy opens at D Y Patil International University.'}
            </p>
          </>
        ) : (
          <>
            <h2 style={{ color: '#0f766e', margin: '0 0 12px 0', fontSize: '1.75rem', fontWeight: 800 }}>
              Application Submitted Successfully
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#475569', margin: '0 0 24px 0', lineHeight: '1.6' }}>
              Thank you for applying. Your application has been successfully received by D Y Patil International University recruitment cell.
            </p>
          </>
        )}

        <div className="success-details" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', margin: '20px 0 28px 0', textAlign: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>
              {isInterest ? 'REGISTRATION REFERENCE NUMBER' : 'APPLICATION NUMBER'}
            </span>
            <strong style={{ fontSize: '1.5rem', color: '#0f172a', display: 'block', marginTop: '4px' }}>{state.appNumber}</strong>
          </div>

          <div style={{ marginTop: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>POSITION / FACULTY</span>
            <strong style={{ fontSize: '1rem', color: '#0f3b46' }}>{state.position}</strong>
          </div>

          <div style={{ marginTop: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>NOTIFICATION STATUS</span>
            <span style={{
              display: 'inline-block',
              backgroundColor: isInterest ? '#fef3c7' : '#dcfce7',
              color: isInterest ? '#b45309' : '#166534',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 800,
              marginTop: '6px'
            }}>
              {isInterest ? 'WILL NOTIFY WHEN OPEN' : (state.status || 'SUBMITTED')}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '32px', lineHeight: '1.6' }}>
          {isInterest
            ? 'We have recorded your credentials. Our HR team will reach out to you via email and mobile as soon as a vacancy is officially opened for this position.'
            : 'Please note down your Application Number for future communications. You can track the real-time status of your application at any time using our tracking tool.'}
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={{ padding: '10px 22px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
            Back to Home
          </Link>
          <Link to="/track" style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#0f766e', color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
            Track Status
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ApplicationSuccess;
