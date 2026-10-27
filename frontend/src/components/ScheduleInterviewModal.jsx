import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

function ScheduleInterviewModal({ application, isOpen, onClose, onSuccess }) {
  const [panels, setPanels] = useState([]);
  const [loadingPanels, setLoadingPanels] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [selectedPanelistIds, setSelectedPanelistIds] = useState([]);

  // Candidate/Application selection (used when opened without preselected application)
  const [availableApplications, setAvailableApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');

  // Date and Time (default tomorrow at 10:00 AM)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [interviewDate, setInterviewDate] = useState(defaultDateStr);
  const [interviewTime, setInterviewTime] = useState('10:00 AM');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [zoomJoinUrl, setZoomJoinUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [zoomNotice, setZoomNotice] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPanels();
      setError('');
      setZoomNotice('');

      if (application?.id) {
        setSelectedAppId(application.id);
      } else {
        fetchAvailableApplications();
      }
    }
  }, [isOpen, application]);

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
      setError('Failed to load interview panels. Please verify panels are set up.');
    } finally {
      setLoadingPanels(false);
    }
  }

  async function fetchAvailableApplications() {
    try {
      const res = await apiRequest('/applications?limit=200');
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setAvailableApplications(list);
      if (list.length > 0 && !selectedAppId) {
        setSelectedAppId(list[0].id);
      }
    } catch (err) {
      console.warn('Could not load applications for interview selector:', err.message);
    }
  }

  const currentApp = application || availableApplications.find(a => a.id === selectedAppId);

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
    const effectiveAppId = currentApp?.id || selectedAppId;

    if (!effectiveAppId) {
      setError('Please select a valid candidate application.');
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

      // Build scheduledAt date object (IST to UTC)
      const scheduledDateTime = new Date(`${interviewDate} ${interviewTime}`);
      const validDate = isNaN(scheduledDateTime.getTime()) ? new Date(interviewDate) : scheduledDateTime;

      const payload = {
        applicationId: effectiveAppId,
        panelId: selectedPanelId,
        panelistIds: selectedPanelistIds,
        scheduledAt: validDate.toISOString(),
        durationMinutes: parseInt(durationMinutes, 10) || 30,
        notes: notes.trim() || undefined,
        zoomJoinUrl: zoomJoinUrl.trim() || undefined
      };

      const res = await apiRequest('/admin/interviews/schedule-panel', {
        method: 'POST',
        body: JSON.stringify(payload)
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

  if (!isOpen) return null;

  const candidateName = currentApp?.applicant?.name ||
    `${currentApp?.personalInfo?.firstName || ''} ${currentApp?.personalInfo?.lastName || ''}`.trim() ||
    'Candidate';
  const positionTitle = currentApp?.job?.position || currentApp?.personalInfo?.postAppliedFor || 'Faculty Position';
  const candidateEmail = currentApp?.applicant?.user?.email || currentApp?.personalInfo?.email || 'N/A';

  return (
    <div style={modalBackdropStyle}>
      <div style={modalContainerStyle}>
        
        {/* MODAL HEADER - Maroon / Gold / White */}
        <div style={{
          background: 'linear-gradient(135deg, #721B28 0%, #4A1019 100%)',
          color: '#FFFFFF',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #D9A43C'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.2px', color: '#FFFFFF' }}>
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
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* CANDIDATE SUMMARY BANNER */}
        {application ? (
          <div style={{
            backgroundColor: '#FEF3C7',
            borderBottom: '1px solid #FDE68A',
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#92400E', letterSpacing: '0.5px' }}>CANDIDATE:</span>
              <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>{candidateName}</strong>
              <span style={{ fontSize: '0.8rem', color: '#475569' }}>({candidateEmail})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#92400E', letterSpacing: '0.5px' }}>ROLE:</span>
              <strong style={{ fontSize: '0.86rem', color: '#0F172A' }}>{positionTitle}</strong>
              <span style={{
                backgroundColor: '#FFFFFF',
                color: '#721B28',
                border: '1px solid #FDE68A',
                fontSize: '0.76rem',
                fontWeight: 700,
                padding: '1px 8px',
                borderRadius: '4px'
              }}>
                #{application.applicationNumber}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px 24px 0', backgroundColor: '#FDFBF7' }}>
            <label style={labelStyle}>Select Candidate / Application *</label>
            <select
              value={selectedAppId}
              onChange={e => setSelectedAppId(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">-- Choose Candidate Application --</option>
              {availableApplications.map(app => (
                <option key={app.id} value={app.id}>
                  {app.applicant?.name || 'Candidate'} — {app.applicationNumber} ({app.job?.position || 'Position'})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div style={{ margin: '16px 24px 0', padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '8px', fontSize: '0.86rem' }}>
            <strong>Error: </strong> {error}
          </div>
        )}

        {zoomNotice && (
          <div style={{ margin: '16px 24px 0', padding: '12px 16px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', borderRadius: '8px', fontSize: '0.86rem' }}>
            {zoomNotice}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 1. SELECT PANEL */}
          <div>
            <label style={labelStyle}>
              1. Select Interview Panel *
            </label>
            {loadingPanels ? (
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B' }}>Loading panels from Interview Panels Management...</p>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ ...labelStyle, margin: 0 }}>
                2. Pick Panelists from {currentPanel?.name || 'Selected Panel'} (At least 1 required) *
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
              maxHeight: '170px',
              overflowY: 'auto',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '8px 10px',
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
                        padding: '8px 10px',
                        backgroundColor: checked ? '#FDF8F6' : '#FFFFFF',
                        border: `1.5px solid ${checked ? '#721B28' : '#E2E8F0'}`,
                        borderRadius: '6px',
                        cursor: member.isActive ? 'pointer' : 'not-allowed',
                        opacity: member.isActive ? 1 : 0.6,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!member.isActive}
                        onChange={() => handlePanelistToggle(member.id)}
                        style={{ accentColor: '#721B28', cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <div style={{ flex: 1, fontSize: '0.84rem' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{member.name}</span>
                        <span style={{ color: '#64748B', marginLeft: '6px', fontSize: '0.78rem' }}>({member.email})</span>
                        {member.designation && (
                          <span style={{
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            marginLeft: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid #FDE68A'
                          }}>
                            {member.designation}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '6px' }}>
              <strong>{selectedPanelistIds.length}</strong> panelist(s) selected to evaluate and receive meeting details.
            </div>
          </div>

          {/* 3. DATE, TIME & DURATION */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>3. Interview Date *</label>
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
              <label style={labelStyle}>Start Time (IST) *</label>
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

          {/* 4. OPTIONAL NOTES / AGENDA */}
          <div>
            <label style={labelStyle}>4. Interview Notes / Agenda (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Please prepare a 15-minute presentation on your research domain and teaching portfolio."
              style={{ ...inputStyle, resize: 'vertical' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* 5. ZOOM: AUTO OR PASTE FALLBACK */}
          <div>
            <label style={labelStyle}>
              5. Zoom Join Link (Optional Fallback / Manual Meeting)
            </label>
            <input
              type="url"
              placeholder="https://zoom.us/j/... (Leave blank for automated Zoom creation)"
              style={inputStyle}
              value={zoomJoinUrl}
              onChange={e => setZoomJoinUrl(e.target.value)}
            />
            <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '3px' }}>
              If Server-to-Server Zoom OAuth is configured, a meeting will be auto-generated. If not, paste a link here or email will advise HR will coordinate.
            </span>
          </div>

          {/* AUTOMATION NOTICE - Warm Neutral / Gold border */}
          <div style={{
            backgroundColor: '#FDFBF7',
            border: '1px solid #FDE68A',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '0.78rem',
            color: '#475569'
          }}>
            <strong style={{ color: '#721B28' }}>Automated Actions on Confirm:</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <li>Creates scheduled <strong>Zoom Meeting</strong> room (if configured) or uses provided link.</li>
              <li>Emails personalized invitations with Zoom link to <strong>candidate</strong> and <strong>each selected panelist</strong>.</li>
              <li>Updates application stage to <strong>Interview Scheduled</strong> in screening pipeline.</li>
            </ul>
          </div>

          {/* BUTTON ACTIONS - Maroon / White / Gold */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
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
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(114, 27, 40, 0.3)',
                transition: 'background-color 0.15s ease'
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
  backgroundColor: 'rgba(15, 23, 42, 0.75)',
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: '16px'
};

const modalContainerStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '14px',
  maxWidth: '680px',
  width: '100%',
  maxHeight: '92vh',
  overflowY: 'auto',
  boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.35)',
  border: '1px solid #E2E8F0'
};

const closeBtnStyle = {
  background: 'rgba(255, 255, 255, 0.15)',
  border: 'none',
  borderRadius: '6px',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.4rem',
  lineHeight: 1,
  color: '#FFFFFF',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: '#0F172A',
  marginBottom: '5px'
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid #CBD5E1',
  borderRadius: '8px',
  fontSize: '0.86rem',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#0F172A',
  backgroundColor: '#FFFFFF',
  transition: 'border-color 0.15s ease'
};

const textActionBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#721B28',
  fontSize: '0.76rem',
  fontWeight: 700,
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline'
};

const secondaryBtnStyle = {
  backgroundColor: '#FFFFFF',
  border: '1.5px solid #CBD5E1',
  color: '#475569',
  padding: '10px 18px',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '0.86rem',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease'
};

export default ScheduleInterviewModal;
