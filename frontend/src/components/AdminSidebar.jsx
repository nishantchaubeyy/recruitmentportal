import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function AdminSidebar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation collapsible state
  const [recruitmentOpen, setRecruitmentOpen] = useState(true);
  const [interviewsOpen, setInterviewsOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

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
    <>
      {/* Mobile Backdrop overlay */}
      {mobileOpen && (
        <div 
          className="admin-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* BRAND LOGO HEADER */}
        <div className="sidebar-logo-header">
          <Link to="/admin/dashboard" className="sidebar-brand-link">
            <img src="/logo.dypiu.png" alt="DYPIU" className="sidebar-logo-img" />
          </Link>
          <div className="sidebar-portal-tag">Recruitment Portal</div>
        </div>

        {/* SIDEBAR NAVIGATION SCROLLABLE AREA */}
        <nav className="sidebar-nav-container">
          {/* DASHBOARD LINK */}
          <Link 
            to="/admin/dashboard" 
            className={`sidebar-nav-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </Link>

          {/* GROUP 1: RECRUITMENT */}
          <div className="sidebar-nav-group">
            <div 
              className="group-title-row"
              onClick={() => setRecruitmentOpen(!recruitmentOpen)}
            >
              <span className="group-title-text">RECRUITMENT</span>
              <span className="group-toggle-arrow">{recruitmentOpen ? '▾' : '▸'}</span>
            </div>

            {recruitmentOpen && (
              <div className="group-links-list">
                <Link 
                  to="/admin/jobs" 
                  className={`sidebar-sublink ${isActive('/admin/jobs') ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="sublink-icon">📋</span>
                  <span>Vacancies</span>
                </Link>

                <Link 
                  to="/admin/applications" 
                  className={`sidebar-sublink ${isActive('/admin/applications') && !location.search.includes('Shortlisted') ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="sublink-icon">📄</span>
                  <span>Applications</span>
                </Link>

                <Link 
                  to="/admin/vacancy-interests" 
                  className={`sidebar-sublink ${isActive('/admin/vacancy-interests') ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="sublink-icon">🔔</span>
                  <span>Interested Applicants</span>
                </Link>
              </div>
            )}
          </div>

          {/* GROUP 2: INTERVIEWS */}
          <div className="sidebar-nav-group">
            <div 
              className="group-title-row"
              onClick={() => setInterviewsOpen(!interviewsOpen)}
            >
              <span className="group-title-text">INTERVIEWS</span>
              <span className="group-toggle-arrow">{interviewsOpen ? '▾' : '▸'}</span>
            </div>

            {interviewsOpen && (
              <div className="group-links-list">
                <Link 
                  to="/admin/interviews" 
                  className={`sidebar-sublink ${isActive('/admin/interviews') ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="sublink-icon">🗓</span>
                  <span>Schedule & Calendar</span>
                </Link>

                <Link 
                  to="/committee/dashboard" 
                  className={`sidebar-sublink ${isActive('/committee/dashboard') ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="sublink-icon">✍️</span>
                  <span>Committee Evaluations</span>
                </Link>
              </div>
            )}
          </div>

          {/* GROUP 3: REPORTS */}
          <div className="sidebar-nav-group">
            <Link 
              to="/admin/reports" 
              className={`sidebar-nav-link ${isActive('/admin/reports') ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">📈</span>
              <span>Reports & Analytics</span>
            </Link>
          </div>

          {/* GROUP 4: ADMINISTRATION */}
          {isSuperAdminOrHRAdmin && (
            <div className="sidebar-nav-group">
              <div 
                className="group-title-row"
                onClick={() => setAdminOpen(!adminOpen)}
              >
                <span className="group-title-text">ADMINISTRATION</span>
                <span className="group-toggle-arrow">{adminOpen ? '▾' : '▸'}</span>
              </div>

              {adminOpen && (
                <div className="group-links-list">
                  <Link 
                    to="/admin/users" 
                    className={`sidebar-sublink ${isActive('/admin/users') ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="sublink-icon">👥</span>
                    <span>Users & RBAC Roles</span>
                  </Link>

                  <Link 
                    to="/admin/audit-logs" 
                    className={`sidebar-sublink ${isActive('/admin/audit-logs') ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="sublink-icon">📜</span>
                    <span>Security Audit Logs</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* USER PROFILE FOOTER */}
        <div className="sidebar-profile-footer">
          <div className="profile-info-block">
            <div className="profile-name">{user?.name || 'HR Administrator'}</div>
            <div className="profile-role-badge">{user?.role || 'ADMIN'}</div>
          </div>

          <button 
            onClick={handleLogout}
            className="sidebar-logout-btn"
            title="Logout of Admin Portal"
          >
            ↪ Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;
