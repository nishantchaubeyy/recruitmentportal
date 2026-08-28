import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function AdminHeader() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (path) => {
    if (path === '/admin/dashboard' && location.pathname === '/admin/dashboard') return true;
    if (path !== '/admin/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const isSuperAdminOrHRAdmin = user && ['SUPER_ADMIN', 'HR_ADMIN', 'ADMIN'].includes(user.role);

  return (
    <header className="admin-clean-navbar" style={navContainerStyle}>
      {/* LEFT: DYPIU LOGO & BRANDING */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Link to="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src="/logo.dypiu.png"
            alt="DYPIU Logo"
            style={{ height: '42px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </Link>
        <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '14px' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
            Recruitment Portal
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
            HR Management Panel
          </div>
        </div>
      </div>

      {/* CENTER: CLEAN BASIC NAVIGATION LINKS */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Link
          to="/admin/dashboard"
          style={isActive('/admin/dashboard') ? activeLinkStyle : linkStyle}
        >
          Dashboard
        </Link>

        <Link
          to="/admin/jobs"
          style={isActive('/admin/jobs') ? activeLinkStyle : linkStyle}
        >
          Vacancies
        </Link>

        <Link
          to="/admin/applications"
          style={isActive('/admin/applications') ? activeLinkStyle : linkStyle}
        >
          Applications
        </Link>

        <Link
          to="/admin/interviews"
          style={isActive('/admin/interviews') ? activeLinkStyle : linkStyle}
        >
          Interviews
        </Link>

        <Link
          to="/admin/vacancy-interests"
          style={isActive('/admin/vacancy-interests') ? activeLinkStyle : linkStyle}
        >
          Interested Applicants
        </Link>

        <Link
          to="/admin/reports"
          style={isActive('/admin/reports') ? activeLinkStyle : linkStyle}
        >
          Reports
        </Link>

        {isSuperAdminOrHRAdmin && (
          <Link
            to="/admin/users"
            style={isActive('/admin/users') ? activeLinkStyle : linkStyle}
          >
            Users
          </Link>
        )}
      </nav>

      {/* RIGHT: USER PROFILE & LOGOUT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
            {user?.name || 'HR Administrator'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 700 }}>
            {user?.role || 'ADMIN'}
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={logoutBtnStyle}
          title="Logout of Admin Portal"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

const navContainerStyle = {
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #e2e8f0',
  padding: '0 28px',
  height: '68px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
};

const linkStyle = {
  padding: '8px 14px',
  borderRadius: '6px',
  color: '#475569',
  fontSize: '0.88rem',
  fontWeight: 600,
  textDecoration: 'none',
  transition: 'all 0.15s ease'
};

const activeLinkStyle = {
  padding: '8px 14px',
  borderRadius: '6px',
  backgroundColor: '#f1f5f9',
  color: '#0f766e',
  fontSize: '0.88rem',
  fontWeight: 800,
  textDecoration: 'none'
};

const logoutBtnStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  color: '#475569',
  padding: '7px 14px',
  borderRadius: '6px',
  fontSize: '0.82rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease'
};

export default AdminHeader;
