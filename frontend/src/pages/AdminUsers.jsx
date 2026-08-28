import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'HR_ADMIN'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const data = await apiRequest('/admin/users');
      setUsers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch administrative users.');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiRequest('/admin/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      setSuccess('Administrative user account created successfully.');
      setShowCreateModal(false);
      setFormData({ name: '', email: '', password: '', role: 'HR_ADMIN' });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user.');
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiRequest(`/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user status.');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '1050px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <h2 style={{ color: '#0f3b46', margin: 0, fontWeight: 800 }}>User & Role Management (RBAC)</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>
            Manage Super Admins, HR Administrators, HR Officers, and Selection Committee accounts.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Add New Admin / Committee User
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', marginBottom: '20px' }}>
          {success}
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '550px',
            width: '100%',
            padding: '30px',
            boxShadow: '0 20px 45px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f3b46' }}>Create New System Account</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Full Name *</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Email Address *</label>
                <input 
                  type="email"
                  className="form-input"
                  placeholder="name@dypiu.ac.in"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Temporary Password *</label>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Assigned System Role *</label>
                <select 
                  className="form-input"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="HR_ADMIN">HR Administrator</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                  <option value="HR_USER">HR User / Staff</option>
                  <option value="COMMITTEE_MEMBER">Selection Committee Member</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                >
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SYSTEM USERS TABLE */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Loading administrative user accounts...</p>
      ) : (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <table>
            <thead>
              <tr>
                <th>User / Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f3b46' }}>{u.admin?.name || u.applicant?.name || 'User Account'}</div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{u.email}</span>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '0.78rem', 
                      padding: '4px 10px', 
                      borderRadius: '12px',
                      fontWeight: 700,
                      backgroundColor: u.role === 'SUPER_ADMIN' ? '#fef3c7' : '#e0f2fe',
                      color: u.role === 'SUPER_ADMIN' ? '#92400e' : '#0369a1'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '0.78rem', 
                      padding: '3px 8px', 
                      borderRadius: '4px',
                      fontWeight: 700,
                      backgroundColor: u.status === 'ACTIVE' ? '#f0fdf4' : '#fee2e2',
                      color: u.status === 'ACTIVE' ? '#15803d' : '#991b1b'
                    }}>
                      {u.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.88rem', color: '#64748b' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <button 
                      className={`btn btn-sm ${u.status === 'ACTIVE' ? 'btn-outline' : 'btn-primary'}`}
                      onClick={() => handleToggleStatus(u)}
                      style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                    >
                      {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
