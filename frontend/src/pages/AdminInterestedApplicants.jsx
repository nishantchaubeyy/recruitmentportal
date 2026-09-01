import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

function AdminInterestedApplicants() {
  const [interests, setInterests] = useState([]);
  const [positionCounts, setPositionCounts] = useState({});
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [notificationMsg, setNotificationMsg] = useState('');

  useEffect(() => {
    fetchSchools();
    fetchInterests();
  }, [categoryFilter, schoolFilter, statusFilter, searchQuery]);

  const fetchSchools = async () => {
    try {
      const data = await apiRequest('/public/schools');
      setSchools(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch schools error:', err);
    }
  };

  const fetchInterests = async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (categoryFilter) query.set('category', categoryFilter);
      if (schoolFilter) query.set('schoolId', schoolFilter);
      if (statusFilter) query.set('status', statusFilter);
      if (searchQuery) query.set('search', searchQuery);

      const resData = await apiRequest(`/admin/vacancy-interests?${query.toString()}`);
      setInterests(resData.data || []);
      setPositionCounts(resData.counts || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 30px' }}>
      {/* Action Notification Banner */}
      {notificationMsg && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', fontWeight: 600 }}>
          ✓ {notificationMsg}
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={cardSummaryStyle}>
          <div style={summaryNumberStyle}>{interests.length}</div>
          <div style={summaryLabelStyle}>Total Interest Registrations</div>
        </div>

        <div style={cardSummaryStyle}>
          <div style={{ ...summaryNumberStyle, color: '#0f766e' }}>
            {interests.filter(i => i.category === 'TEACHING').length}
          </div>
          <div style={summaryLabelStyle}>Teaching Candidates Waiting</div>
        </div>

        <div style={cardSummaryStyle}>
          <div style={{ ...summaryNumberStyle, color: '#1e40af' }}>
            {interests.filter(i => i.category === 'NON_TEACHING').length}
          </div>
          <div style={summaryLabelStyle}>Non-Teaching Candidates Waiting</div>
        </div>

        <div style={cardSummaryStyle}>
          <div style={{ ...summaryNumberStyle, color: '#d97706' }}>
            {interests.filter(i => i.status === 'PENDING').length}
          </div>
          <div style={summaryLabelStyle}>Pending Notifications</div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '18px 20px',
        marginBottom: '24px',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={filterLabelStyle}>VACANCY CATEGORY</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Categories</option>
            <option value="TEACHING">Teaching</option>
            <option value="NON_TEACHING">Non-Teaching</option>
          </select>
        </div>

        <div style={{ flex: '1 1 200px' }}>
          <label style={filterLabelStyle}>SCHOOL / DIVISION</label>
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Schools / Divisions</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 180px' }}>
          <label style={filterLabelStyle}>NOTIFICATION STATUS</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Not Notified (Pending)</option>
            <option value="NOTIFIED">Notified</option>
          </select>
        </div>

        <div style={{ flex: '1 1 240px' }}>
          <label style={filterLabelStyle}>SEARCH CANDIDATE / POSITION</label>
          <input
            type="text"
            placeholder="Search name, email, mobile, position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={inputSearchStyle}
          />
        </div>
      </div>

      {/* Main Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
            Loading interested applicant records...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#b91c1c', fontWeight: 600 }}>
            Error: {error}
          </div>
        ) : interests.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            No interested candidate records found matching the current filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={thStyle}>Candidate Name</th>
                <th style={thStyle}>Contact Details</th>
                <th style={thStyle}>Interested Position</th>
                <th style={thStyle}>School / Division</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Registered Date</th>
                <th style={thStyle}>Notification Status</th>
              </tr>
            </thead>
            <tbody>
              {interests.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                    {item.message && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                        "{item.message}"
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div>{item.email}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>📞 {item.mobile}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700, color: '#0f3b46' }}>{item.interestedPosition}</div>
                  </td>
                  <td style={tdStyle}>
                    {item.school?.name || 'General / Unspecified'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      backgroundColor: item.category === 'TEACHING' ? '#ccfbf1' : '#e0e7ff',
                      color: item.category === 'TEACHING' ? '#0f766e' : '#3730a3',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>
                      {item.category}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={tdStyle}>
                    {item.status === 'NOTIFIED' ? (
                      <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800 }}>
                        ✓ Notified ({item.notifiedAt ? new Date(item.notifiedAt).toLocaleDateString() : 'Yes'})
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800 }}>
                        ⏳ Pending Notification
                      </span>
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

const cardSummaryStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
};

const summaryNumberStyle = {
  fontSize: '1.75rem',
  fontWeight: 800,
  color: '#0f172a',
  lineHeight: 1
};

const summaryLabelStyle = {
  fontSize: '0.82rem',
  fontWeight: 700,
  color: '#64748b',
  marginTop: '6px'
};

const filterLabelStyle = {
  display: 'block',
  fontSize: '0.75rem',
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

export default AdminInterestedApplicants;
