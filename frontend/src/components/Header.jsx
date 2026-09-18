import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 25) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={`navbar-dypiu ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* LEFT SIDE: Logo Crest + Disappearing University Name on Scroll */}
        <Link to="/" className="navbar-brand-link" onClick={() => setMobileMenuOpen(false)}>
          <div className={`logo-container ${scrolled ? 'scrolled' : ''}`}>
            <img 
              src="/Screenshot_2026-09-18_143910-removebg-preview.png" 
              alt="D Y Patil Crest" 
              className="logo-icon" 
            />
            <div className={`logo-text-block ${scrolled ? 'scrolled-hide' : ''}`}>
              <span className="logo-main-title">D Y PATIL</span>
              <span className="logo-sub-title">INTERNATIONAL UNIVERSITY</span>
              <span className="logo-tagline">AKURDI PUNE</span>
            </div>
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

        {/* RIGHT SIDE: Navigation Menu (3 Items) */}
        <div className={`navbar-content ${mobileMenuOpen ? 'is-active' : ''}`}>
          <nav className="navbar-nav-main">
            <Link 
              to="/teaching" 
              className={`nav-link ${location.pathname === '/teaching' ? 'active' : ''}`} 
              onClick={() => setMobileMenuOpen(false)}
            >
              Teaching
            </Link>
            <Link 
              to="/non-teaching" 
              className={`nav-link ${location.pathname === '/non-teaching' ? 'active' : ''}`} 
              onClick={() => setMobileMenuOpen(false)}
            >
              Non-Teaching
            </Link>
            <Link 
              to="/advertisments" 
              className={`nav-link ${location.pathname === '/advertisments' ? 'active' : ''}`} 
              onClick={() => setMobileMenuOpen(false)}
            >
              Advertisements
            </Link>
            {user && (
              <button 
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="nav-link-logout-btn"
              >
                Logout ({user.name})
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
