import React, { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar-dypiu">
      <div className="navbar-container">
        {/* FAR LEFT: Official University Logo */}
        <Link to="/" className="navbar-brand-link" onClick={() => setMobileMenuOpen(false)}>
          <img 
            src="/logo.dypiu.png" 
            alt="D Y PATIL INTERNATIONAL UNIVERSITY" 
            className="navbar-logo-img" 
          />
        </Link>

        {/* Mobile Hamburger Toggle */}
        <button 
          className="navbar-mobile-toggle" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`}></span>
        </button>

        {/* PUBLIC NAVIGATION: ONLY 'Home' and 'Track Application' */}
        <div className={`navbar-content ${mobileMenuOpen ? 'is-active' : ''}`}>
          <nav className="navbar-nav-main" style={{ marginLeft: 'auto' }}>
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>

            <Link 
              to="/track" 
              className={`nav-link ${location.pathname === '/track' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Track Application
            </Link>

            {user && user.role === 'APPLICANT' && (
              <Link 
                to="/applicant/dashboard" 
                className={`nav-link ${location.pathname.startsWith('/applicant/dashboard') || location.pathname.startsWith('/my-applications') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                My Applications
              </Link>
            )}
          </nav>

          {/* RIGHT ACTIONS: Logged-in user profile & Logout */}
          {user && (
            <div className="navbar-actions" style={{ marginLeft: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: '#0f2b5c' }}>{user.name}</div>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    backgroundColor: '#e0f2fe', 
                    color: '#0369a1',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {user.role}
                  </span>
                </div>
                <button 
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="btn btn-outline btn-sm"
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
