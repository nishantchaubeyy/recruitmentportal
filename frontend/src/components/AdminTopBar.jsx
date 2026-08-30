import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { IconSearch, IconBell, IconPlus } from './icons/AdminIcons';

function AdminTopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/admin/jobs/create')) return 'Post New Vacancy';
    if (path.startsWith('/admin/jobs/edit')) return 'Edit Vacancy';
    if (path.startsWith('/admin/jobs/')) return 'Vacancy Details';
    if (path.startsWith('/admin/jobs')) return 'Vacancies Management';
    if (path.startsWith('/admin/applications/')) return 'Candidate Dossier Review';
    if (path.startsWith('/admin/applications')) return 'Candidate Applications';
    if (path.startsWith('/admin/interviews')) return 'Interview Management';
    if (path.startsWith('/admin/vacancy-interests')) return 'Interested Applicants';
    if (path.startsWith('/admin/reports')) return 'Analytics & Reports';
    if (path.startsWith('/admin/users')) return 'User Management';
    return 'Dashboard';
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/admin/applications?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header style={headerContainerStyle}>
      {/* 1. PAGE TITLE & BREADCRUMB */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
          {getPageTitle()}
        </h1>
        <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginTop: '1px' }}>
          D Y Patil International University &bull; HR Portal
        </div>
      </div>

      {/* 2. GLOBAL SEARCH BAR */}
      <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: '420px', margin: '0 24px', position: 'relative' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '12px', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
            <IconSearch size={16} color="#94A3B8" />
          </div>
          <input
            type="text"
            placeholder="Search candidates, application ID, or positions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
          <span style={searchHotkeyStyle}>/</span>
        </div>
      </form>

      {/* 3. RIGHT ACTIONS (POST NEW VACANCY & NOTIFICATIONS) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Link
          to="/admin/jobs/create"
          style={primaryActionButtonStyle}
        >
          <IconPlus size={15} color="#FFFFFF" />
          <span>Post New Vacancy</span>
        </Link>

        <button
          style={iconButtonStyle}
          title="Notifications"
          onClick={() => navigate('/admin/applications')}
        >
          <IconBell size={18} color="#475569" />
          <span style={notificationDotStyle} />
        </button>
      </div>
    </header>
  );
}

const headerContainerStyle = {
  height: '64px',
  backgroundColor: '#FFFFFF',
  borderBottom: '1px solid #E2E8F0',
  padding: '0 28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  zIndex: 90
};

const searchInputStyle = {
  width: '100%',
  padding: '8px 36px 8px 36px',
  backgroundColor: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  fontSize: '0.84rem',
  color: '#0F172A',
  outline: 'none',
  transition: 'all 0.15s ease'
};

const searchHotkeyStyle = {
  position: 'absolute',
  right: '10px',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#94A3B8',
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '4px',
  padding: '1px 5px',
  pointerEvents: 'none'
};

const primaryActionButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#0F172A',
  color: '#FFFFFF',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '0.84rem',
  fontWeight: 700,
  textDecoration: 'none',
  transition: 'all 0.15s ease',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.1)'
};

const iconButtonStyle = {
  position: 'relative',
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

const notificationDotStyle = {
  position: 'absolute',
  top: '7px',
  right: '7px',
  width: '7px',
  height: '7px',
  backgroundColor: '#EF4444',
  borderRadius: '50%',
  border: '1.5px solid #FFFFFF'
};

export default AdminTopBar;
