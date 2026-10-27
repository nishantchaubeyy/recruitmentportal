import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { IconCheckCircle } from './icons/AdminIcons';

function ScheduleInterviewModal({ application, isOpen, onClose, onSuccess }) {
  const [panels, setPanels] = useState([]);
  const [loadingPanels, setLoadingPanels] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [selectedPanelistIds, setSelectedPanelistIds] = useState([]);
  
  // Date and Time (default tomorrow at 10:00 AM)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [interviewDate, setInterviewDate] = useState(defaultDateStr);
  const [interviewTime, setInterviewTime] = useState('10:00 AM');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [zoomNotice, setZoomNotice] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPanels();
      setError('');
      setZoomNotice('');
    }
  }, [isOpen]);

  async function fetchPanels() {
    try {
      setLoadingPanels(true);
      const data = await apiRequest('/admin/panels');
      const list = Array.isArray(data) ? data : [];
      setPanels(list);
      if (list.length > 0) {
        setSelectedPanelId(list[0].id);
        const activeMembers = (list[0].members || []).filter(m => m.isActive);
        setSelectedPanelistIds(activeMembers.map(m => m.id));
      }
    } catch (err) {
      setError('Failed to load interview panels.');
    } finally {
      setLoadingPanels(false);
    }
  }

  const handlePanelChange = (panelId) => {
    setSelectedPanelId(panelId);
    const chosen = panels.find(p => p.id === panelId);
    if (chosen) {
      const activeMembers = (chosen.members || []).filter(m => m.isActive);
      setSelectedPanelistIds(activeMembers.map(m => m.id));
    } else {
      setSelectedPanelistIds([]);
    }
  };

  const currentPanel = panels.find(p => p.id === selectedPanelId);
  const panelMembers = currentPanel?.members || [];

  const handlePanelistToggle = (memberId) => {
    setSelectedPanelistIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = () => {
    const activeIds = panelMembers.filter(m => m.isActive).map(m => m.id);
    setSelectedPanelistIds(activeIds);
  };

  const handleDeselectAll = () => {
    setSelectedPanelistIds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!application?.id) {
      setError('Invalid application reference.');
      return;
    }
    if (!selectedPanelId) {
      setError('Please select an interview panel (Panel A / B / C).');
      return;
    }
    if (selectedPanelistIds.length === 0) {
      setError('Please select at least one panelist for the interview.');
      return;
    }
    if (!interviewDate || !interviewTime) {
      setError('Interview date and time are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setZoomNotice('');

      // Build scheduledAt date object
      // Combine date and time string
      const scheduledDateTime = new Date(`${interviewDate} ${interviewTime}`);
      const validDate = isNaN(scheduledDateTime.getTime()) ? new Date(interviewDate) : scheduledDateTime;

      const res = await apiRequest('/admin/interviews/schedule-panel', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: application.id,
          panelId: selectedPanelId,
          panelistMemberIds: selectedPanelistIds,
          scheduledAt: validDate.toISOString(),
          durationMinutes: parseInt(durationMinutes) || 30,
          notes
        })
      });

      if (res?.zoomWarning) {
        setZoomNotice(res.zoomWarning);
      }

      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to schedule interview.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !application) return null;

  const candidateName = application.applicant?.name ||
    `${application.personalInfo?.firstName || ''} ${application.personalInfo?.lastName || ''}`.trim() ||
    'Candidate';
  const positionTitle = application.job?.position || application.personalInfo?.postAppliedFor || 'Faculty Position';
  const candidateEmail = application.applicant?.user?.email || application.personalInfo?.email || 'N/A';

  return (
    <div style={modalBackdropStyle}>
      <div style={modalContainerStyle}>
        
        {/* MODAL HEADER */}
        <div style={{ backgroundColor: '#721B28', color: '#FFFFFF', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.2px' }}>
              Schedule Interview with Panel & Zoom Invite
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#FCD34D', fontWeight: 600 }}>
              D Y Patil International University &bull; Recruitment Cell
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={closeBtnStyle}
          >
            &times;
          </button>
        </div>

        {/* CANDIDATE SUMMARY BANNER */}
        <div style={{ backgroundColor: '#FEF3C7', borderBottom: '1px solid #FDE68A', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Candidate: </span>
            <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{candidateName}</strong>
            <span style={{ fontSize: '0.8rem', color: '#475569', marginLeft: '6px' }}>({candidateEmail})</span>
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Role: </span>
            <strong style={{ fontSize: '0.86rem', color: '#0F172A' }}>{positionTitle}</strong>
            <span style={{ fontSize: '0.78rem', color: '#64748B', marginLeft: '6px' }}>#{application.applicationNumber}</span>
          </div>
        </div>

        {error && (
          <div style={{ margin: '16px 24px 0', padding: '10px 14px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '6px', fontSize: '0.86rem' }}>
            {error}
          </div>
        )}

        {zoomNotice && (
          <div style={{ margin: '16px 24px 0', padding: '10px 14px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309', borderRadius: '6px', fontSize: '0.86rem' }}>
            {zoomNotice}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 1. SELECT PANEL */}
          <div>
            <label style={labelStyle}>
              Select Interview Panel *
            </label>
            {loadingPanels ? (
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B' }}>Loading panels...</p>
            ) : (
              <select
                value={selectedPanelId}
                onChange={e => handlePanelChange(e.target.value)}
                style={inputStyle}
                required
              >
                {panels.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) — {p.description || 'Standard Panel'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. MULTI-SELECT PANELISTS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ ...labelStyle, margin: 0 }}>
                Pick Panelists from {currentPanel?.name || 'Selected Panel'} *
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={textActionBtnStyle}
                >
                  Select All
                </button>
                <span style={{ color: '#CBD5E1' }}>|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  style={textActionBtnStyle}
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div style={{
              maxHeight: '160px',
              overflowY: 'auto',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '8px 12px',
              backgroundColor: '#FAFAFA',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {panelMembers.length === 0 ? (
                <p style={{ margin: '8px 0', fontSize: '0.82rem', color: '#64748B' }}>
                  No panelists registered in this panel. Please add members in "Interview Panels".
                </p>
              ) : (
                panelMembers.map(member => {
                  const checked = selectedPanelistIds.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 8px',
                        backgroundColor: checked ? '#FEF2F2' : '#FFFFFF',
                        border: `1px solid ${checked ? '#FECACA' : '#E2E8F0'}`,
                        borderRadius: '6px',
                        cursor: member.isActive ? 'pointer' : 'not-allowed',
                        opacity: member.isActive ? 1 : 0.6
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!member.isActive}
                        onChange={() => handlePanelistToggle(member.id)}
                        style={{ accentColor: '#721B28', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, fontSize: '0.84rem' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{member.name}</span>
                        <span style={{ color: '#64748B', marginLeft: '6px', fontSize: '0.78rem' }}>({member.email})</span>
                        {member.designation && (
                          <span style={{ color: '#721B28', marginLeft: '6px', fontSize: '0.76rem', fontWeight: 600 }}>&bull; {member.designation}</span>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px' }}>
              {selectedPanelistIds.length} panelist(s) selected to evaluate and receive meeting details.
            </div>
          </div>

          {/* 3. DATE, TIME & DURATION */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Interview Date *</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                style={inputStyle}
                value={interviewDate}
                onChange={e => setInterviewDate(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Time (IST) *</label>
              <input
                type="text"
                required
                placeholder="10:00 AM"
                style={inputStyle}
                value={interviewTime}
                onChange={e => setInterviewTime(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Duration (mins)</label>
              <input
                type="number"
                min="15"
                max="180"
                step="15"
                style={inputStyle}
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
              />
            </div>
          </div>

          {/* 4. OPTIONAL ADMINISTRATIVE NOTES */}
          <div>
            <label style={labelStyle}>Interview Notes / Agenda (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Please bring teaching portfolio and be prepared for a 15-minute presentation."
              style={{ ...inputStyle, resize: 'vertical' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* AUTOMATION NOTICE */}
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 14px', fontSize: '0.78rem', color: '#475569' }}>
            <strong>Automated Actions on Confirm:</strong>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
              <li>Creates scheduled <strong>Zoom Meeting</strong> room (Server-to-Server OAuth).</li>
              <li>Emails personalized invitations with Zoom links to <strong>candidate</strong> and <strong>each selected panelist</strong>.</li>
              <li>Advances application stage to <strong>Interview Scheduled</strong> in screening pipeline.</li>
            </ul>
          </div>

          {/* BUTTON ACTIONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: '#721B28',
                color: '#FFFFFF',
                padding: '10px 22px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {submitting ? 'Creating Meeting & Dispatching...' : 'Confirm & Schedule Interview \u2192'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: '16px'
};

const modalContainerStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  maxWidth: '680px',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  fontSize: '1.6rem',
  lineHeight: 1,
  color: '#FFFFFF',
  cursor: 'pointer'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: '#0F172A',
  marginBottom: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '0.86rem',
  outline: 'none',
  boxSizing: 'border-box'
};

const textActionBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#721B28',
  fontSize: '0.76rem',
  fontWeight: 700,
  cursor: 'pointer',
  padding: 0
};

const secondaryBtnStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #CBD5E1',
  color: '#475569',
  padding: '10px 18px',
  borderRadius: '6px',
  fontWeight: 700,
  fontSize: '0.86rem',
  cursor: 'pointer'
};

export default ScheduleInterviewModal;
