import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { homePathForRole } from '../utils/status';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });

  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
    // Reset OTP verification if email changes
    if (id === 'email' && emailVerified) {
      setEmailVerified(false);
      setOtpSent(false);
      setOtpInput('');
      setOtpMessage('');
    }
  };

  const handleSendOtp = async () => {
    const { email } = formData;
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address first.');
      return;
    }
    setError('');
    setSendingOtp(true);
    setOtpMessage('');
    try {
      const res = await apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setOtpSent(true);
      setOtpMessage(res.message || `Verification code sent to ${email}.`);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.trim().length < 4) {
      setError('Please enter the 6-digit OTP code received.');
      return;
    }
    setError('');
    setVerifyingOtp(true);
    try {
      await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: formData.email, otp: otpInput })
      });
      setEmailVerified(true);
      setOtpSent(false);
      setOtpMessage('✓ Email verified successfully!');
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, mobile, password, confirmPassword } = formData;

    if (!name || !email || !mobile || !password || !confirmPassword) {
      setError('All fields are mandatory.');
      return;
    }
    if (!emailVerified) {
      setError('Please verify your email address via OTP before registering.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, mobile, password, confirmPassword })
      });

      login(data.token, data.user);
      navigate(homePathForRole(data.user?.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '470px', margin: '40px auto', padding: '30px', border: '2px solid #8B1235', borderRadius: '8px', backgroundColor: '#ffffff', boxShadow: '0 4px 20px rgba(139, 18, 53, 0.08)' }}>
        <h2 style={{ border: 'none', margin: '0 0 20px 0', padding: 0, textAlign: 'center', color: '#8B1235', fontWeight: 800 }}>Applicant Registration</h2>

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '15px', fontSize: '0.85rem', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="name" style={{ color: '#8B1235', fontWeight: 700 }}>Full Name <span className="required">*</span></label>
            <input type="text" id="name" value={formData.name} onChange={handleChange} placeholder="e.g. Rahul Sharma" required />
          </div>

          {/* Email + OTP */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="email" style={{ color: '#8B1235', fontWeight: 700, margin: 0 }}>
                Email Address <span className="required">*</span>
              </label>
              {emailVerified ? (
                <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>✓ Verified</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !formData.email}
                  style={{
                    background: '#8B1235', color: '#d9a43c', border: 'none', borderRadius: '4px',
                    padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700,
                    cursor: sendingOtp || !formData.email ? 'not-allowed' : 'pointer',
                    opacity: sendingOtp || !formData.email ? 0.6 : 1
                  }}
                >
                  {sendingOtp ? 'Sending…' : otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              )}
            </div>
            <input
              type="email" id="email" value={formData.email} onChange={handleChange}
              placeholder="e.g. rahul@example.com" required readOnly={emailVerified}
              style={{ backgroundColor: emailVerified ? '#f0fdf4' : undefined, borderColor: emailVerified ? '#16a34a' : undefined }}
            />
            {otpMessage && (
              <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: emailVerified ? '#16a34a' : '#0f2b5c', fontWeight: 600 }}>
                {otpMessage}
              </p>
            )}
            {otpSent && !emailVerified && (
              <div style={{ marginTop: '10px', padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Enter 6-Digit Verification Code:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text" maxLength={6} placeholder="e.g. 123456" value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '130px', letterSpacing: '3px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.95rem', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                  <button
                    type="button" onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otpInput.length < 4}
                    style={{
                      backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px',
                      padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700,
                      cursor: verifyingOtp || otpInput.length < 4 ? 'not-allowed' : 'pointer',
                      opacity: verifyingOtp || otpInput.length < 4 ? 0.6 : 1
                    }}
                  >
                    {verifyingOtp ? 'Verifying…' : 'Confirm OTP'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile */}
          <div className="form-group">
            <label htmlFor="mobile" style={{ color: '#8B1235', fontWeight: 700 }}>Mobile Number <span className="required">*</span></label>
            <input type="tel" id="mobile" value={formData.mobile} onChange={handleChange} placeholder="10-digit mobile number" required />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" style={{ color: '#8B1235', fontWeight: 700 }}>Password <span className="required">*</span></label>
            <input type="password" id="password" value={formData.password} onChange={handleChange} placeholder="Min 6 characters" required />
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword" style={{ color: '#8B1235', fontWeight: 700 }}>Confirm Password <span className="required">*</span></label>
            <input type="password" id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter password" required />
          </div>

          {!emailVerified && (
            <p style={{ fontSize: '0.8rem', color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '4px', padding: '8px 12px', margin: '0 0 12px 0' }}>
              ⚠ You must verify your email via OTP before registering.
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%', padding: '12px', fontSize: '0.92rem', marginTop: '10px',
              backgroundColor: emailVerified ? '#8B1235' : '#b0b0b0',
              color: emailVerified ? '#FCD34D' : '#ffffff',
              border: 'none', borderRadius: '6px', fontWeight: 800,
              cursor: emailVerified && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s'
            }}
            disabled={loading || !emailVerified}
          >
            {loading ? 'Creating Account…' : 'Register'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 700, color: '#8B1235' }}>Login here</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
