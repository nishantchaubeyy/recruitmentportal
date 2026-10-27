import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import {
  IconUsers,
  IconPlus,
  IconTrash,
  IconCheckCircle
} from '../components/icons/AdminIcons';

function AdminInterviewPanels() {
  const [panels, setPanels] = useState([]);
  const [selectedPanelId, setSelectedPanelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showCreatePanelModal, setShowCreatePanelModal] = useState(false);

  // Form states
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    designation: ''
  });

  const [panelForm, setPanelForm] = useState({
    name: '',
    code: '',
    description: ''
  });

  useEffect(() => {
    fetchPanels();
  }, []);

  async function fetchPanels(selectId = null) {
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest('/admin/panels');
      const list = Array.isArray(data) ? data : [];
      setPanels(list);
      if (selectId) {
        setSelectedPanelId(selectId);
      } else if (list.length > 0 && !selectedPanelId) {
        setSelectedPanelId(list[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load interview panels.');
    } finally {
      setLoading(false);
    }
  }

  const selectedPanel = panels.find(p => p.id === selectedPanelId) || panels[0];

  const handleCreatePanel = async (e) => {
    e.preventDefault();
    if (!panelForm.name || !panelForm.code) {
      alert('Panel name and code are required.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      const created = await apiRequest('/admin/panels', {
        method: 'POST',
        body: JSON.stringify(panelForm)
      });
      setSuccess(`Panel "${created.name}" created successfully.`);
      setShowCreatePanelModal(false);
      setPanelForm({ name: '', code: '', description: '' });
      fetchPanels(created.id);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to create panel.');
    }
  };

  const handleOpenAddMember = () => {
    setEditingMember(null);
    setMemberForm({ name: '', email: '', phone: '', designation: '' });
    setShowAddMemberModal(true);
  };

  const handleOpenEditMember = (member) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      designation: member.designation || ''
    });
    setShowAddMemberModal(true);
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!memberForm.name || !memberForm.email) {
      alert('Panelist name and email are required.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      if (editingMember) {
        await apiRequest(`/admin/panels/members/${editingMember.id}`, {
          method: 'PUT',
          body: JSON.stringify(memberForm)
        });
        setSuccess(`Panelist "${memberForm.name}" updated successfully.`);
      } else {
        await apiRequest(`/admin/panels/${selectedPanel.id}/members`, {
          method: 'POST',
          body: JSON.stringify(memberForm)
        });
        setSuccess(`Panelist "${memberForm.name}" added to ${selectedPanel.name}.`);
      }
      setShowAddMemberModal(false);
      setEditingMember(null);
      setMemberForm({ name: '', email: '', phone: '', designation: '' });
      fetchPanels(selectedPanel.id);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save panelist.');
    }
  };

  const handleToggleMemberStatus = async (member) => {
    try {
      await apiRequest(`/admin/panels/members/${member.id}/toggle-status`, {
        method: 'PATCH'
      });
      fetchPanels(selectedPanel.id);
    } catch (err) {
      alert(`Error toggling panelist status: ${err.message}`);
    }
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove panelist ${member.name} from ${selectedPanel.name}?`)) {
      return;
    }
    try {
      await apiRequest(`/admin/panels/members/${member.id}`, {
        method: 'DELETE'
      });
      setSuccess(`Panelist "${member.name}" removed.`);
      fetchPanels(selectedPanel.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      alert(`Error deleting panelist: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ color: '#0F172A', margin: 0, fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.3px' }}>
            Interview Panels Management
          </h2>
          <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '0.86rem' }}>
            Manage interview panels (Panel A, B, C), register faculty panelists, and maintain evaluation boards.
          </p>
        </div>

        <button
          onClick={() => setShowCreatePanelModal(true)}
          style={primaryButtonStyle}
        >
          <IconPlus size={16} color="#FFFFFF" />
          Add New Custom Panel
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '8px', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#721B28', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
          {success}
        </div>
      )}

      {/* PANEL TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', overflowX: 'auto', paddingBottom: '0' }}>
        {panels.map(panel => {
          const active = selectedPanel?.id === panel.id;
          return (
            <button
              key={panel.id}
              onClick={() => setSelectedPanelId(panel.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 20px',
                fontSize: '0.92rem',
                fontWeight: active ? 800 : 600,
                color: active ? '#721B28' : '#64748B',
                borderBottom: active ? '3px solid #721B28' : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{panel.name}</span>
              <span style={{
                backgroundColor: active ? '#721B28' : '#F1F5F9',
                color: active ? '#FFFFFF' : '#64748B',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.74rem',
                fontWeight: 700
              }}>
                {panel.activeMembersCount || (panel.members ? panel.members.filter(m => m.isActive).length : 0)} panelists
              </span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE PANEL DETAILS CARD */}
      {selectedPanel && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1.2rem', fontWeight: 800 }}>
                  {selectedPanel.name}
                </h3>
                <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 800 }}>
                  CODE: {selectedPanel.code}
                </span>
              </div>
              <p style={{ margin: '6px 0 0 0', color: '#64748B', fontSize: '0.86rem' }}>
                {selectedPanel.description || 'Standard university recruitment interview panel.'}
              </p>
            </div>

            <button
              onClick={handleOpenAddMember}
              style={maroonButtonStyle}
            >
              <IconPlus size={16} color="#FFFFFF" />
              Add Panelist to {selectedPanel.name}
            </button>
          </div>

          {/* PANEL MEMBERS TABLE */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading panelists...</div>
          ) : !selectedPanel.members || selectedPanel.members.length === 0 ? (
            <div style={{ backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '8px', padding: '36px', textAlign: 'center', color: '#64748B' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: 600 }}>
                No panelists registered in {selectedPanel.name} yet.
              </p>
              <button
                onClick={handleOpenAddMember}
                style={maroonButtonStyle}
              >
                + Add First Panelist
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#721B28', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Panelist Name</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Designation / Department</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPanel.members.map((member, idx) => (
                    <tr key={member.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>
                        {member.name}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {member.designation || 'Faculty / Panelist'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#0F172A', fontFamily: 'monospace', fontSize: '0.84rem' }}>
                        {member.email}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748B' }}>
                        {member.phone || '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          backgroundColor: member.isActive ? '#DCFCE7' : '#F1F5F9',
                          color: member.isActive ? '#166534' : '#64748B',
                          border: `1px solid ${member.isActive ? '#BBF7D0' : '#E2E8F0'}`
                        }}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenEditMember(member)}
                            style={tableActionBtn}
                            title="Edit Panelist"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleMemberStatus(member)}
                            style={{
                              ...tableActionBtn,
                              color: member.isActive ? '#991B1B' : '#166534'
                            }}
                            title={member.isActive ? 'Deactivate panelist' : 'Activate panelist'}
                          >
                            {member.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member)}
                            style={{ ...tableActionBtn, color: '#991B1B' }}
                            title="Remove panelist"
                          >
                            <IconTrash size={14} color="#991B1B" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* MODAL: ADD / EDIT PANELIST */}
      {showAddMemberModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#721B28', fontSize: '1.15rem', fontWeight: 800 }}>
                {editingMember ? `Edit Panelist (${editingMember.name})` : `Add Panelist to ${selectedPanel?.name}`}
              </h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                style={closeBtnStyle}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveMember} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Kulkarni"
                    style={inputStyle}
                    value={memberForm.name}
                    onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Email Address (for Zoom invites & assignments) *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rajesh.kulkarni@dypiu.ac.in"
                    style={inputStyle}
                    value={memberForm.email}
                    onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Designation / Cadre</label>
                    <input
                      type="text"
                      placeholder="e.g. Professor & Dean"
                      style={inputStyle}
                      value={memberForm.designation}
                      onChange={e => setMemberForm({ ...memberForm, designation: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone / Mobile Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 9822011223"
                      style={inputStyle}
                      value={memberForm.phone}
                      onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  style={secondaryBtnStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={maroonButtonStyle}
                >
                  {editingMember ? 'Update Panelist' : 'Add Panelist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOM PANEL */}
      {showCreatePanelModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#721B28', fontSize: '1.15rem', fontWeight: 800 }}>
                Create Custom Interview Panel
              </h3>
              <button
                onClick={() => setShowCreatePanelModal(false)}
                style={closeBtnStyle}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePanel} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Panel Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Panel D (Technical Screening)"
                    style={inputStyle}
                    value={panelForm.name}
                    onChange={e => setPanelForm({ ...panelForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Panel Code * (e.g. D)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. D"
                    style={inputStyle}
                    value={panelForm.code}
                    onChange={e => setPanelForm({ ...panelForm, code: e.target.value })}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Description / Focus Area</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Evaluates specialized computer science candidates and technical projects."
                    style={{ ...inputStyle, resize: 'vertical' }}
                    value={panelForm.description}
                    onChange={e => setPanelForm({ ...panelForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreatePanelModal(false)}
                  style={secondaryBtnStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={maroonButtonStyle}
                >
                  Create Panel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const primaryButtonStyle = {
  backgroundColor: '#0F172A',
  color: '#FFFFFF',
  padding: '10px 18px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 700,
  fontSize: '0.86rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
};

const maroonButtonStyle = {
  backgroundColor: '#721B28',
  color: '#FFFFFF',
  padding: '10px 18px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 700,
  fontSize: '0.86rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px'
};

const tableActionBtn = {
  background: 'none',
  border: '1px solid #E2E8F0',
  borderRadius: '4px',
  padding: '4px 10px',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#0F172A',
  cursor: 'pointer'
};

const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalContainerStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  maxWidth: '560px',
  width: '100%',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
  overflow: 'hidden'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  lineHeight: 1,
  color: '#64748B',
  cursor: 'pointer'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '6px'
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box'
};

const secondaryBtnStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #CBD5E1',
  color: '#475569',
  padding: '9px 16px',
  borderRadius: '6px',
  fontWeight: 700,
  fontSize: '0.86rem',
  cursor: 'pointer'
};

export default AdminInterviewPanels;
