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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, mobile, password, confirmPassword } = formData;

    // Client-side validations
    if (!name || !email || !mobile || !password || !confirmPassword) {
      setError('All fields are mandatory.');
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
      <div style={{ maxWidth: '450px', margin: '40px auto', padding: '30px', border: '2px solid #8B1235', borderRadius: '8px', backgroundColor: '#ffffff', boxShadow: '0 4px 20px rgba(139, 18, 53, 0.08)' }}>
        <h2 style={{ border: 'none', margin: '0 0 20px 0', padding: 0, textAlign: 'center', color: '#8B1235', fontWeight: 800 }}>Applicant Registration</h2>

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '15px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" style={{ color: '#8B1235', fontWeight: 700 }}>Full Name <span className="required">*</span></label>
            <input 
              type="text" 
              id="name" 
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Rahul Sharma"
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" style={{ color: '#8B1235', fontWeight: 700 }}>Email Address <span className="required">*</span></label>
            <input 
              type="email" 
              id="email" 
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. rahul@example.com"
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="mobile" style={{ color: '#8B1235', fontWeight: 700 }}>Mobile Number <span className="required">*</span></label>
            <input 
              type="tel" 
              id="mobile" 
              value={formData.mobile}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" style={{ color: '#8B1235', fontWeight: 700 }}>Password <span className="required">*</span></label>
            <input 
              type="password" 
              id="password" 
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 6 characters"
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" style={{ color: '#8B1235', fontWeight: 700 }}>Confirm Password <span className="required">*</span></label>
            <input 
              type="password" 
              id="confirmPassword" 
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              required 
            />
          </div>

          <button 
            type="submit" 
            style={{ width: '100%', padding: '12px', fontSize: '0.92rem', marginTop: '10px', backgroundColor: '#8B1235', color: '#FCD34D', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register'}
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
