import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 });

  useEffect(() => {
    fetchAuditLogs(1);
  }, [actionFilter]);

  async function fetchAuditLogs(page = 1) {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(actionFilter ? { action: actionFilter } : {})
      });

      const res = await apiRequest(`/admin/audit-logs?${query.toString()}`);
      setLogs(res?.data || []);
      if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve system security audit logs.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <h2 style={{ color: '#0f3b46', margin: 0, fontWeight: 800 }}>System Audit Logs</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>
            Real-time security trail recording user logins, vacancy updates, status changes, and evaluation submissions.
          </p>
        </div>

        <div>
          <select 
            className="form-input"
            style={{ minWidth: '220px' }}
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
          >
            <option value="">All Security Actions</option>
            <option value="USER_LOGIN">User Logins</option>
            <option value="APPLICATION_SUBMITTED">Application Submissions</option>
            <option value="APPLICATION_STATUS_UPDATED">Status Updates</option>
            <option value="EVALUATION_SUBMITTED">Evaluation Submissions</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduling</option>
            <option value="USER_ROLE_UPDATED">Role Changes</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading audit security logs...</p>
      ) : logs.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ margin: 0, fontSize: '1.05rem' }}>No audit logs recorded for the selected filter.</p>
        </div>
      ) : (
        <>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User / Email</th>
                  <th>Target Entity</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '0.78rem', 
                        padding: '3px 8px', 
                        borderRadius: '4px',
                        fontWeight: 700,
                        backgroundColor: '#f1f5f9',
                        color: '#0f3b46'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{log.user?.email || 'System'}</div>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{log.userId || 'N/A'}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.entity}</span>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{log.entityId}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
              <button 
                className="btn btn-outline btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchAuditLogs(pagination.page - 1)}
              >
                &larr; Previous
              </button>

              <span style={{ alignSelf: 'center', fontSize: '0.9rem', color: '#64748b' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button 
                className="btn btn-outline btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchAuditLogs(pagination.page + 1)}
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

export default AdminAuditLogs;
