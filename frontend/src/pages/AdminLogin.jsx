import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../utils/api';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

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

      if (data.user.role !== 'ADMIN') {
        throw new Error('Access denied. This login is restricted to administrators.');
      }

      login(data.token, data.user);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600, display: 'block', letterSpacing: '0.5px' }}>
            D Y PATIL INTERNATIONAL UNIVERSITY
          </span>
          <h2 style={{ border: 'none', margin: '5px 0 0 0', padding: 0 }}>HR / Admin Portal</h2>
        </div>
        
        {error && (
          <div style={{ padding: '10px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '15px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Admin Email <span className="required">*</span></label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@dypiu.edu"
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password <span className="required">*</span></label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            style={{ padding: '10px', fontSize: '0.9rem', marginTop: '10px', backgroundColor: '#0f172a' }}
            disabled={loading}
          >
            {loading ? 'Logging in as Admin...' : 'Admin Login'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem' }}>
          <Link to="/login" style={{ color: '#475569', textDecoration: 'none' }}>
            &larr; Back to Applicant Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
