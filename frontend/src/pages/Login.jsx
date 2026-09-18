import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { homePathForRole, isStaffRole } from '../utils/status';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      login(data.token, data.user);

      // Return to the page the user was trying to reach (e.g. an apply link),
      // otherwise route by role.
      const from = location.state?.from;
      if (from && !isStaffRole(data.user.role)) {
        navigate(from, { replace: true });
      } else {
        navigate(homePathForRole(data.user.role), { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', border: '2px solid #8B1235', borderRadius: '8px', backgroundColor: '#ffffff', boxShadow: '0 4px 20px rgba(139, 18, 53, 0.08)' }}>
        <h2 style={{ border: 'none', margin: '0 0 20px 0', padding: 0, textAlign: 'center', color: '#8B1235', fontWeight: 800 }}>Applicant Login</h2>
        
        {error && (
          <div style={{ padding: '10px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '15px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" style={{ color: '#8B1235', fontWeight: 700 }}>Email Address <span className="required">*</span></label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. candidate@example.com"
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" style={{ color: '#8B1235', fontWeight: 700 }}>Password <span className="required">*</span></label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required 
            />
          </div>

          <button 
            type="submit" 
            style={{ width: '100%', padding: '12px', fontSize: '0.92rem', marginTop: '10px', backgroundColor: '#8B1235', color: '#FCD34D', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: 700, color: '#8B1235' }}>Register here</Link>
        </div>

        <div style={{ marginTop: '30px', borderTop: '1px solid #cbd5e1', paddingTop: '15px', textAlign: 'center', fontSize: '0.85rem' }}>
          <Link to="/admin/login" style={{ color: '#475569', textDecoration: 'none' }}>
            &rarr; Access Admin / HR Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
