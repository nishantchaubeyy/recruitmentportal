import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

function AdminJobs() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Menu open ID
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  // Success / Notice Banner
  const [actionBanner, setActionBanner] = useState('');

  useEffect(() => {
    fetchVacancies();
  }, [typeFilter, statusFilter, searchQuery]);

  const fetchVacancies = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `${API_BASE_URL}/admin/vacancies?`;
      if (typeFilter) url += `type=${typeFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve vacancies.');
      }

      const data = await res.json();
      setVacancies(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    setActionMenuOpenId(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/vacancies/${jobId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status.');

      setActionBanner(`Vacancy status changed to ${newStatus}.`);
      fetchVacancies();
      setTimeout(() => setActionBanner(''), 3000);
    } catch (err) {
      alert(`Error updating vacancy status: ${err.message}`);
    }
  };

  const handleTriggerNotify = async (jobId, positionTitle) => {
    setActionMenuOpenId(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/vacancies/${jobId}/notify-interested`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Notification trigger failed.');

      setActionBanner(data.message || `Notifications sent to interested candidates for ${positionTitle}.`);
      fetchVacancies();
      setTimeout(() => setActionBanner(''), 4000);
    } catch (err) {
      alert(`Error triggering notification: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem', fontWeight: 800 }}>
            Vacancy Management
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Create, publish, and manage teaching and non-teaching university recruitment openings
          </p>
        </div>

        <Link
          to="/admin/jobs/create"
          style={{
            backgroundColor: '#0f766e',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 2px 4px rgba(15,118,110,0.2)'
          }}
        >
          + Create Vacancy
        </Link>
      </div>

      {actionBanner && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
          ✓ {actionBanner}
        </div>
      )}

      {/* Filter Control Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1 1 160px' }}>
          <label style={filterLabelStyle}>TYPE</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
            <option value="">All Types</option>
            <option value="TEACHING">Teaching</option>
            <option value="NON_TEACHING">Non-Teaching</option>
          </select>
        </div>

        <div style={{ flex: '1 1 160px' }}>
          <label style={filterLabelStyle}>STATUS</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div style={{ flex: '1 1 240px' }}>
          <label style={filterLabelStyle}>SEARCH VACANCIES</label>
          <input
            type="text"
            placeholder="Search reference #, position, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={inputSearchStyle}
          />
        </div>
      </div>

      {/* HR Vacancies Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'visible', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
            Loading vacancy openings...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#b91c1c', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        ) : vacancies.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            No vacancies found matching the selected criteria.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={thStyle}>Position & Ref #</th>
                <th style={thStyle}>School / Department</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Applications</th>
                <th style={thStyle}>Interested</th>
                <th style={thStyle}>Opening Date</th>
                <th style={thStyle}>Deadline</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vacancies.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{v.position}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Ref: {v.vacancyNumber}</div>
                  </td>
                  <td style={tdStyle}>
                    <div>{v.department}</div>
                    {v.school?.name && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{v.school.name}</div>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      backgroundColor: v.type === 'TEACHING' ? '#ccfbf1' : '#e0e7ff',
                      color: v.type === 'TEACHING' ? '#0f766e' : '#3730a3',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.74rem',
                      fontWeight: 800
                    }}>
                      {v.type}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{v.applicationsCount || 0}</span>
                  </td>
                  <td style={tdStyle}>
                    <Link
                      to={`/admin/vacancy-interests?position=${encodeURIComponent(v.position)}`}
                      style={{ fontWeight: 700, color: '#0f766e', textDecoration: 'none' }}
                      title="View interested candidates"
                    >
                      🔔 {v.interestCount || 0}
                    </Link>
                  </td>
                  <td style={tdStyle}>
                    {new Date(v.openingDate || v.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={tdStyle}>
                    {new Date(v.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge status={v.status} isOpen={v.isApplicationOpen} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', position: 'relative' }}>
                    {/* Three Dot Action Menu Button */}
                    <button
                      onClick={() => setActionMenuOpenId(actionMenuOpenId === v.id ? null : v.id)}
                      style={{
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ⋮
                    </button>

                    {/* Popover Action Menu */}
                    {actionMenuOpenId === v.id && (
                      <div style={menuStyle}>
                        <div style={menuItemStyle} onClick={() => navigate(`/admin/jobs/${v.id}`)}>
                          👁 View Details
                        </div>
                        <div style={menuItemStyle} onClick={() => navigate(`/admin/jobs/edit/${v.id}`)}>
                          ✏️ Edit Vacancy
                        </div>
                        {v.status !== 'PUBLISHED' && (
                          <div style={menuItemStyle} onClick={() => handleStatusChange(v.id, 'PUBLISHED')}>
                            🚀 Publish
                          </div>
                        )}
                        {v.status !== 'CLOSED' && (
                          <div style={menuItemStyle} onClick={() => handleStatusChange(v.id, 'CLOSED')}>
                            🔒 Mark Closed
                          </div>
                        )}
                        {v.status !== 'ARCHIVED' && (
                          <div style={menuItemStyle} onClick={() => handleStatusChange(v.id, 'ARCHIVED')}>
                            📦 Archive
                          </div>
                        )}
                        <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #f1f5f9' }} />
                        <div style={{ ...menuItemStyle, color: '#0f766e' }} onClick={() => handleTriggerNotify(v.id, v.position)}>
                          🔔 Notify Interested ({v.interestCount || 0})
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, isOpen }) {
  let style = { padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 };
  if (status === 'PUBLISHED') {
    if (isOpen) {
      return <span style={{ ...style, backgroundColor: '#dcfce7', color: '#15803d' }}>PUBLISHED (OPEN)</span>;
    }
    return <span style={{ ...style, backgroundColor: '#fee2e2', color: '#991b1b' }}>PUBLISHED (EXPIRED)</span>;
  }
  if (status === 'DRAFT') {
    return <span style={{ ...style, backgroundColor: '#f1f5f9', color: '#475569' }}>DRAFT</span>;
  }
  if (status === 'CLOSED') {
    return <span style={{ ...style, backgroundColor: '#fee2e2', color: '#991b1b' }}>CLOSED</span>;
  }
  return <span style={{ ...style, backgroundColor: '#f3e8ff', color: '#6b21a8' }}>ARCHIVED</span>;
}

const filterLabelStyle = {
  display: 'block',
  fontSize: '0.74rem',
  fontWeight: 800,
  color: '#475569',
  marginBottom: '4px'
};

const selectStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '0.88rem',
  color: '#0f172a',
  backgroundColor: '#ffffff'
};

const inputSearchStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '0.88rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box'
};

const thStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid #e2e8f0'
};

const tdStyle = {
  padding: '14px 16px',
  verticalAlign: 'middle'
};

const menuStyle = {
  position: 'absolute',
  right: '16px',
  top: '40px',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  zIndex: 100,
  width: '180px',
  padding: '6px 0',
  textAlign: 'left'
};

const menuItemStyle = {
  padding: '8px 14px',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#334155',
  cursor: 'pointer'
};

export default AdminJobs;
