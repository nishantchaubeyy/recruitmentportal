import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';

function ApplicationSuccess() {
  const location = useLocation();
  const state = location.state;

  // Protect route: if no submission state exists, redirect to home
  if (!state || !state.appNumber) {
    return <Navigate to="/" replace />;
  }

  const isInterest = Boolean(state.isInterest);

  return (
    <div className="container" style={{ maxWidth: '680px', padding: '60px 20px', fontFamily: 'inherit' }}>
      <div 
        className="success-card" 
        style={{ 
          backgroundColor: '#ffffff', 
          border: '2px solid #8B1235', 
          borderRadius: '8px', 
          padding: '44px 36px', 
          boxShadow: '0 4px 20px rgba(139,18,53,0.08)', 
          textAlign: 'center' 
        }}
      >
        {isInterest ? (
          <>
            <h2 style={{ color: '#8B1235', margin: '0 0 12px 0', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Form Submitted — Details Registered
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#4B5563', margin: '0 0 32px 0', lineHeight: '1.6' }}>
              {state.message || 'Thank you for submitting your form! Applications for this position are currently closed. We have registered your details in our system and will automatically notify you as soon as a relevant vacancy opens at D Y Patil International University.'}
            </p>
          </>
        ) : (
          <>
            <h2 style={{ color: '#8B1235', margin: '0 0 12px 0', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Application Submitted Successfully
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#4B5563', margin: '0 0 32px 0', lineHeight: '1.6' }}>
              Thank you for applying. Your application has been successfully received by D Y Patil International University recruitment cell.
            </p>
          </>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '0 0 32px 0' }} />

        {/* Application Details Document Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#8B1235', display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {isInterest ? 'REGISTRATION REFERENCE NUMBER' : 'APPLICATION NUMBER'}
            </span>
            <strong style={{ fontSize: '1.6rem', color: '#8B1235', display: 'block', marginTop: '4px', fontWeight: 800, letterSpacing: '0.02em' }}>
              {state.appNumber}
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#8B1235', display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              POSITION / FACULTY
            </span>
            <strong style={{ fontSize: '1.1rem', color: '#8B1235', display: 'block', marginTop: '4px', fontWeight: 800 }}>
              {state.position}
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#8B1235', display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {isInterest ? 'NOTIFICATION STATUS' : 'APPLICATION STATUS'}
            </span>
            <span style={{ 
              fontSize: '1.15rem', 
              color: '#8B1235', 
              display: 'block', 
              marginTop: '4px', 
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              {isInterest ? 'WILL NOTIFY WHEN OPEN' : (state.status || 'SUBMITTED')}
            </span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '0 0 28px 0' }} />

        <p style={{ fontSize: '0.875rem', color: '#4B5563', marginBottom: '32px', lineHeight: '1.6' }}>
          {isInterest
            ? 'We have recorded your credentials. Our HR team will reach out to you via email and mobile as soon as a vacancy is officially opened for this position.'
            : 'Please keep your Application Number for future communication.'}
        </p>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link 
            to="/" 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '44px', 
              padding: '0 32px', 
              borderRadius: '6px', 
              border: 'none', 
              backgroundColor: '#8B1235',
              color: '#FCD34D', 
              textDecoration: 'none', 
              fontWeight: 800, 
              fontSize: '0.92rem',
              boxShadow: '0 2px 8px rgba(139,18,53,0.25)',
              transition: 'background-color 0.15s ease'
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ApplicationSuccess;

