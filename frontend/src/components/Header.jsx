import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../utils/api';

function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasDocRequests, setHasDocRequests] = useState(false);

  useEffect(() => {
    if (user && user.role === 'APPLICANT') {
      apiRequest('/documents/my')
        .then(data => {
          // Strictly show My Documents option ONLY if HR has requested documents
          const hasActive = Array.isArray(data) && data.some(r => ['PENDING', 'PARTIALLY_UPLOADED', 'REJECTED'].includes(r.status));
          setHasDocRequests(hasActive);
        })
        .catch(() => setHasDocRequests(false));
    } else {
      setHasDocRequests(false);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link to="/" className="brand" onClick={() => setMobileMenuOpen(false)}>
          <img src={`${import.meta.env.BASE_URL}footerlogo.png`} alt="D Y Patil International University" className="navbar-logo-img" />
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
            to="/advertisments" 
            className={location.pathname === '/advertisments' || location.pathname === '/advertisements' ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            Advertisements
          </Link>
          {!user ? (
            <button 
              type="button"
              className={`nav-login-btn ${location.pathname === '/login' ? 'active' : ''}`}
              onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
            >
              Login
            </button>
          ) : (
            <>
              <Link
                to={user.role === 'APPLICANT' ? '/applicant/dashboard' : '/admin/dashboard'}
                className={location.pathname.includes('/dashboard') ? 'active' : ''}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              {user.role === 'APPLICANT' && hasDocRequests && (
                <Link
                  to="/applicant/documents"
                  className={location.pathname.includes('/documents') ? 'active' : ''}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Documents
                </Link>
              )}
              <button 
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="nav-logout-btn"
              >
                Logout ({user.name || 'User'})
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
