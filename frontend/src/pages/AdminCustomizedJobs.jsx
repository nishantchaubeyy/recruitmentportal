import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { IconPlus, IconSearch } from '../components/icons/AdminIcons';

function AdminCustomizedJobs() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Action Menu open ID
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [actionBanner, setActionBanner] = useState('');

  useEffect(() => {
    fetchCustomVacancies();
  }, [statusFilter, searchQuery]);

  const fetchCustomVacancies = async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ type: 'CUSTOM' });
      if (statusFilter) query.set('status', statusFilter);
      if (searchQuery) query.set('search', searchQuery);

      const data = await apiRequest(`/admin/vacancies?${query.toString()}`);
      setVacancies(Array.isArray(data) ? data : (data?.data || []));
    } catch (err) {
      setError(err.message || 'Failed to load customized vacancies.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    setActionMenuOpenId(null);
    try {
      await apiRequest(`/admin/vacancies/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      setActionBanner(`Vacancy status changed to ${newStatus}.`);
      fetchCustomVacancies();
      setTimeout(() => setActionBanner(''), 3000);
    } catch (err) {
      alert(`Error updating vacancy status: ${err.message}`);
    }
  };

  // Derive unique categories present in vacancies
  const availableCategories = Array.from(
    new Set(vacancies.map(v => v.customCategory || v.customLabel).filter(Boolean))
  );

  const displayedVacancies = vacancies.filter(v => {
    if (!categoryFilter) return true;
    const cat = (v.customCategory || v.customLabel || '').toLowerCase();
    return cat === categoryFilter.toLowerCase();
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0F172A', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
            Customized Vacancies Management
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.86rem' }}>
            Create and manage non-standard appointments: Visiting Faculty, Project Fellows, Consultants, and Internships.
          </p>
        </div>

        <Link
          to="/admin/jobs/create?type=CUSTOM"
          style={{
            backgroundColor: '#721B28',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(114,27,40,0.2)'
          }}
        >
          <IconPlus size={16} color="#FFFFFF" />
          Post Customized Vacancy
        </Link>
      </div>

      {actionBanner && (
        <div style={{ backgroundColor: '#FEF2F2', color: '#721B28', border: '1px solid #FECACA', padding: '12px 16px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
          {actionBanner}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', padding: '12px 16px', borderRadius: '8px', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {/* Filter Control Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Category Filter */}
        <div style={{ flex: '1 1 180px' }}>
          <label style={filterLabelStyle}>CATEGORY / CADRE</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle}>
            <option value="">All Categories</option>
            {availableCategories.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '1 1 180px' }}>
          <label style={filterLabelStyle}>STATUS</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {/* Free text search */}
        <div style={{ flex: '2 1 240px' }}>
          <label style={filterLabelStyle}>SEARCH</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by position title or ref code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...selectStyle, paddingLeft: '32px' }}
            />
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <IconSearch size={14} color="#94A3B8" />
            </div>
          </div>
        </div>

        {/* Reset */}
        {(categoryFilter || statusFilter || searchQuery) && (
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingTop: '18px' }}>
            <button
              onClick={() => { setCategoryFilter(''); setStatusFilter(''); setSearchQuery(''); }}
              style={{ background: 'none', border: 'none', color: '#721B28', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Vacancies Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>Loading customized openings...</div>
      ) : displayedVacancies.length === 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
          <h3 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '1.1rem', fontWeight: 700 }}>No Customized Vacancies Found</h3>
          <p style={{ margin: '0 0 18px 0', color: '#64748B', fontSize: '0.86rem' }}>
            Post positions that are neither teaching nor non-teaching (Visiting Faculty, Project Fellow, Consultant, etc.)
          </p>
          <Link
            to="/admin/jobs/create?type=CUSTOM"
            style={{
              backgroundColor: '#721B28',
              color: '#FFFFFF',
              padding: '9px 18px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            + Create First Customized Vacancy
          </Link>
        </div>
      ) : (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#721B28', color: '#FFFFFF', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Position</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>School / Dept</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Applications</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deadline</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedVacancies.map((job) => {
                const categoryBadge = job.customLabel || job.customCategory || 'Customized';
                const deadlineDate = new Date(job.deadline);
                const isExpired = deadlineDate < new Date();

                return (
                  <tr key={job.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                        {job.position}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
                        {job.vacancyNumber}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        backgroundColor: '#FEF2F2',
                        color: '#721B28',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        border: '1px solid #FECACA'
                      }}>
                        {categoryBadge}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#334155', maxWidth: '220px' }}>
                      <div>{job.department || (job.school && job.school.name) || 'DYPIU Campus'}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>{job.location || 'Pune'}</div>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <Link
                        to={`/admin/applications?vacancyId=${job.id}`}
                        style={{
                          backgroundColor: '#F8FAFC',
                          color: '#0F172A',
                          border: '1px solid #CBD5E1',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          textDecoration: 'none'
                        }}
                      >
                        {job.applicationsCount || (job._count && job._count.applications) || 0}
                      </Link>
                    </td>

                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ color: isExpired ? '#991B1B' : '#0F172A', fontWeight: isExpired ? 700 : 500 }}>
                        {deadlineDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {isExpired && (
                        <div style={{ fontSize: '0.7rem', color: '#991B1B', fontWeight: 700 }}>Expired (Hidden Publicly)</div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        backgroundColor:
                          job.status === 'PUBLISHED' ? '#DCFCE7' :
                          job.status === 'DRAFT' ? '#FEF3C7' : '#FEE2E2',
                        color:
                          job.status === 'PUBLISHED' ? '#166534' :
                          job.status === 'DRAFT' ? '#92400E' : '#991B1B',
                        border: `1px solid ${
                          job.status === 'PUBLISHED' ? '#BBF7D0' :
                          job.status === 'DRAFT' ? '#FDE68A' : '#FECACA'
                        }`
                      }}>
                        {job.status}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => navigate(`/admin/jobs/edit/${job.id}`)}
                          style={tableBtnStyle}
                        >
                          Edit
                        </button>

                        {job.status === 'DRAFT' && (
                          <button
                            onClick={() => handleStatusChange(job.id, 'PUBLISHED')}
                            style={{ ...tableBtnStyle, color: '#166534', borderColor: '#BBF7D0' }}
                          >
                            Publish
                          </button>
                        )}

                        {job.status === 'PUBLISHED' && (
                          <button
                            onClick={() => handleStatusChange(job.id, 'CLOSED')}
                            style={{ ...tableBtnStyle, color: '#991B1B', borderColor: '#FECACA' }}
                          >
                            Close
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          style={tableBtnStyle}
                          title="View public preview"
                        >
                          Preview
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

const filterLabelStyle = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#475569',
  marginBottom: '4px',
  letterSpacing: '0.5px'
};

const selectStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '0.84rem',
  color: '#0F172A',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box'
};

const tableBtnStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #CBD5E1',
  borderRadius: '4px',
  padding: '4px 8px',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#0F172A',
  cursor: 'pointer'
};

export default AdminCustomizedJobs;
