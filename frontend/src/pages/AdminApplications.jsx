import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../utils/api';

function AdminApplications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* PAGE HEADER */}
      <div>
        <h2 style={{ color: '#0f2b5c', margin: 0, fontWeight: 800, fontSize: '1.4rem' }}>Candidate Applications Screening</h2>
        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.86rem' }}>
          Review candidate dossiers, inspect uploaded qualification documents, and update recruitment status.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* TOP PIPELINE STATUS TAB BAR */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', overflowX: 'auto', paddingBottom: '2px' }}>
        {[
          { key: 'ALL', label: 'All Applications' },
          { key: 'Application Submitted', label: 'Submitted' },
          { key: 'Under Review', label: 'Under Review' },
          { key: 'Shortlisted', label: 'Shortlisted' },
          { key: 'Interview Scheduled', label: 'Interview' },
          { key: 'Selected', label: 'Selected' },
          { key: 'Not Selected', label: 'Rejected' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleStatusTabChange(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 16px',
              fontSize: '0.88rem',
              fontWeight: currentStatusTab === tab.key ? 800 : 600,
              color: currentStatusTab === tab.key ? '#0f2b5c' : '#64748b',
              borderBottom: currentStatusTab === tab.key ? '3px solid #0891b2' : '3px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEARCH AND FILTER BAR */}
      <form onSubmit={handleSearchSubmit} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '14px', alignItems: 'center' }}>
        <input 
          type="text"
          className="form-input"
          placeholder="Search by candidate name, application ID, or position..."
          style={{ flex: 3 }}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0f2b5c', padding: '8px 18px' }}>
          Search
        </button>
      </form>

      {/* TABLE CONTENT */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Loading applications...</p>
      ) : applications.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ margin: 0, fontSize: '1rem' }}>No candidate applications found for the selected stage.</p>
        </div>
      ) : (
        <>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <table>
              <thead>
                <tr>
                  <th>App No.</th>
                  <th>Candidate Name</th>
                  <th>Position applied</th>
                  <th>Department</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 700, color: '#0f2b5c', fontSize: '0.85rem' }}>
                      {app.applicationNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f2b5c' }}>{app.applicant?.name || 'Applicant'}</div>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{app.applicant?.user?.email || app.personalInfo?.email}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{app.job?.position || 'Position'}</div>
                      <span style={{ fontSize: '0.76rem', color: '#0e7490' }}>{app.job?.type}</span>
                    </td>
                    <td style={{ fontSize: '0.88rem', color: '#475569' }}>{app.job?.department}</td>
                    <td style={{ fontSize: '0.84rem', color: '#64748b' }}>
                      {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.78rem',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        backgroundColor: app.status === 'Shortlisted' ? '#f0fdf4' : app.status === 'Under Review' ? '#ecfeff' : '#eff6ff',
                        color: app.status === 'Shortlisted' ? '#15803d' : app.status === 'Under Review' ? '#0e7490' : '#0f2b5c'
                      }}>
                        {app.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => navigate(`/admin/applications/${app.id}`)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.78rem', padding: '5px 12px', backgroundColor: '#0f2b5c' }}
                      >
                        Review Dossier &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
              <button 
                className="btn btn-outline btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchApplications(pagination.page - 1)}
              >
                &larr; Previous
              </button>
              <span style={{ alignSelf: 'center', fontSize: '0.88rem', color: '#64748b' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button 
                className="btn btn-outline btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchApplications(pagination.page + 1)}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminApplications;
