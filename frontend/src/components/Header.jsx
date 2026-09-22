import React, { useContext, useState, useEffect } from 'react';
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
    <header className="site-header">
      <div className="nav-inner">
        <Link to="/" className="brand" onClick={() => setMobileMenuOpen(false)}>
          <img src="/logo.png" alt="D Y Patil International University" />
          <div className="brand-text">
            <b>D Y PATIL</b>
            <span>International University · Akurdi Pune</span>
          </div>
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

        <nav className={mobileMenuOpen ? 'mobile-open' : ''}>
          <Link 
            to="/teaching" 
            className={location.pathname === '/teaching' ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            Teaching
          </Link>
          <Link 
            to="/non-teaching" 
            className={location.pathname === '/non-teaching' ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            Non-Teaching
          </Link>
          <Link 
            to="/advertisments" 
            className={location.pathname === '/advertisments' || location.pathname === '/advertisements' ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            Advertisements
          </Link>
          {user && (
            <button 
              onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              className="nav-logout-btn"
            >
              Logout ({user.name})
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
