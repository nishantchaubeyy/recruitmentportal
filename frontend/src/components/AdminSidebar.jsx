import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  IconDashboard,
  IconBriefcase,
  IconFileText,
  IconCalendar,
  IconUserCheck,
  IconBarChart,
  IconUsers,
  IconLogOut
} from './icons/AdminIcons';

function AdminSidebar() {
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

  const isSuperAdminOrHRAdmin = !user || ['SUPER_ADMIN', 'HR_ADMIN', 'ADMIN'].includes(user.role);

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: IconDashboard },
    { label: 'Vacancies', path: '/admin/jobs', icon: IconBriefcase },
    { label: 'Applications', path: '/admin/applications', icon: IconFileText },
    { label: 'Interviews', path: '/admin/interviews', icon: IconCalendar },
    { label: 'Interested Applicants', path: '/admin/vacancy-interests', icon: IconUserCheck },
    { label: 'Reports', path: '/admin/reports', icon: IconBarChart },
    ...(isSuperAdminOrHRAdmin ? [{ label: 'User Management', path: '/admin/users', icon: IconUsers }] : [])
  ];

  return (
    <aside style={sidebarContainerStyle}>
      {/* 1. TOP BRANDING */}
      <div style={{ padding: '20px 20px 18px 20px', borderBottom: '1px solid #E2E8F0' }}>
        <Link to="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <img
            src="/logo.dypiu.png"
            alt="DYPIU Logo"
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              Recruitment Portal
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
              Enterprise HR Admin
            </div>
          </div>
        </Link>
      </div>

      {/* 2. NAVIGATION MENU */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.8px', textTransform: 'uppercase', padding: '0 12px 8px 12px' }}>
          Navigation
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: active ? 700 : 600,
                  color: active ? '#0F172A' : '#475569',
                  backgroundColor: active ? '#F1F5F9' : 'transparent',
                  borderLeft: active ? '3px solid #0F172A' : '3px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} color={active ? '#0F172A' : '#64748B'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 3. USER PROFILE & LOGOUT FOOTER */}
      <div style={{ padding: '16px 14px', borderTop: '1px solid #E2E8F0', backgroundColor: '#FAFAFA' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'HR Administrator'}
            </div>
            <div style={{ display: 'inline-block', fontSize: '0.68rem', fontWeight: 700, color: '#0369A1', backgroundColor: '#E0F2FE', padding: '1px 6px', borderRadius: '4px', marginTop: '2px' }}>
              {user?.role || 'ADMIN'}
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={logoutButtonStyle}
            title="Sign out of Admin Portal"
          >
            <IconLogOut size={16} color="#64748B" />
          </button>
        </div>
      </div>
    </aside>
  );
}

const sidebarContainerStyle = {
  width: '250px',
  height: '100vh',
  position: 'fixed',
  top: 0,
  left: 0,
  backgroundColor: '#FFFFFF',
  borderRight: '1px solid #E2E8F0',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 100
};

const logoutButtonStyle = {
  background: 'none',
  border: '1px solid #E2E8F0',
  borderRadius: '6px',
  padding: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  backgroundColor: '#FFFFFF'
};

export default AdminSidebar;
