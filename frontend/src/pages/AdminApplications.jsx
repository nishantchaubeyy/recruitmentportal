import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { IconSearch } from '../components/icons/AdminIcons';

function AdminApplications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentStatusTab = searchParams.get('status') || 'ALL';
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1 });

  useEffect(() => {
    fetchApplications(1);
  }, [currentStatusTab, deptFilter]);

  async function fetchApplications(page = 1) {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(currentStatusTab !== 'ALL' ? { status: currentStatusTab } : {}),
        ...(deptFilter ? { department: deptFilter } : {}),
        ...(searchTerm ? { search: searchTerm } : {})
      });

      const res = await apiRequest(`/applications?${query.toString()}`);
      setApplications(res?.data || res || []);
      if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplications(1);
  };

  const handleStatusTabChange = (status) => {
    if (status === 'ALL') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  const handleClearApplications = () => {
    if (window.confirm('Are you sure you want to clear all candidate applications?')) {
      localStorage.removeItem('MOCK_APPLICATIONS_PERSIST');
      setApplications([]);
      fetchApplications(1);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Selected':
      case 'Shortlisted':
        return { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' };
      case 'Interview Scheduled':
      case 'Interview':
        return { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE' };
      case 'Under Review':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'Not Selected':
      case 'Application Closed':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
      default:
        return { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: '#0F172A', margin: 0, fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.3px' }}>
            Candidate Applications Screening
          </h2>
          <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '0.84rem' }}>
            Review candidate dossiers, inspect uploaded qualification documents, and update recruitment status.
          </p>
        </div>
        <button
          onClick={handleClearApplications}
          style={clearButtonStyle}
        >
          Reset / Clear Applications
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '8px', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {/* PIPELINE STATUS TAB BAR */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #E2E8F0', overflowX: 'auto', paddingBottom: '0' }}>
        {[
          { key: 'ALL', label: 'All Applications' },
          { key: 'Application Submitted', label: 'Submitted' },
          { key: 'Under Review', label: 'Under Review' },
          { key: 'Shortlisted', label: 'Shortlisted' },
          { key: 'Interview Scheduled', label: 'Interview' },
          { key: 'Selected', label: 'Selected' },
          { key: 'Not Selected', label: 'Rejected' }
        ].map(tab => {
          const active = currentStatusTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleStatusTabChange(tab.key)}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: '0.86rem',
                fontWeight: active ? 800 : 600,
                color: active ? '#0F172A' : '#64748B',
                borderBottom: active ? '2px solid #0F172A' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SEARCH BAR */}
      <form onSubmit={handleSearchSubmit} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '12px', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
            <IconSearch size={16} color="#94A3B8" />
          </div>
          <input 
            type="text"
            placeholder="Search by candidate name, application ID, or position..."
            style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <button type="submit" style={{ backgroundColor: '#0F172A', color: '#FFFFFF', padding: '8px 18px', border: 'none', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
          Search
        </button>
      </form>

      {/* DATA TABLE */}
      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>Loading applications...</div>
      ) : applications.length === 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748B' }}>
          <p style={{ margin: 0, fontSize: '0.92rem' }}>No candidate applications found for the selected stage.</p>
        </div>
      ) : (
        <>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>App No.</th>
                  <th style={{ padding: '12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Candidate Name</th>
                  <th style={{ padding: '12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Position Applied</th>
                  <th style={{ padding: '12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Department</th>
                  <th style={{ padding: '12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Applied On</th>
                  <th style={{ padding: '12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => {
                  const badge = getStatusBadgeStyle(app.status);
                  const candidateName = app.applicant?.name || `${app.personalInfo?.firstName || ''} ${app.personalInfo?.lastName || ''}`.trim() || 'Candidate';
                  return (
                    <tr key={app.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#0F172A' }}>
                        {app.applicationNumber}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{candidateName}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '1px' }}>{app.applicant?.user?.email || app.personalInfo?.email}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{app.job?.position || app.personalInfo?.postAppliedFor || 'Position'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#0369A1', marginTop: '1px' }}>{app.job?.type}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>{app.job?.department || app.personalInfo?.faculty}</td>
                      <td style={{ padding: '12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}>
                          {app.status || 'SUBMITTED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button 
                          onClick={() => navigate(`/admin/applications/${app.id}`)}
                          style={ghostButtonStyle}
                        >
                          Review Dossier &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const clearButtonStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  color: '#991B1B',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer'
};

const ghostButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#0F172A',
  fontSize: '0.82rem',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: '4px',
  transition: 'all 0.15s ease'
};

export default AdminApplications;
