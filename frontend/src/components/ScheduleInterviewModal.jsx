import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { fetchApplicationsByStatus } from '../utils/applicationsApi';

// Interviews can be arranged from these statuses only (mirrors SCHEDULABLE_STATUSES on the server).
const SCHEDULABLE = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'WAITLISTED', 'INTERVIEW_SCHEDULED'];

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
  const [interviewTime, setInterviewTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [meetingJoinUrl, setMeetingJoinUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [meetingNotice, setMeetingNotice] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Start from a clean slate so a previous choice is never submitted by accident.
      setSelectedPanelId('');
      setSelectedPanelistIds([]);
      fetchPanels();
      setError('');
      setMeetingNotice('');

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
    } catch (err) {
      setError('Failed to load interview panels. Please verify panels are set up.');
    } finally {
      setLoadingPanels(false);
    }
  }

  async function fetchAvailableApplications() {
    try {
      // Only candidates an interview can actually be arranged for, across all pages; never pre-select one.
      setAvailableApplications(await fetchApplicationsByStatus(SCHEDULABLE));
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

  const handleSelectAll = (select) => {
    if (select) {
      const activeIds = panelMembers.filter(m => m.isActive).map(m => m.id);
      setSelectedPanelistIds(activeIds);
    } else {
      setSelectedPanelistIds([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const effectiveAppId = currentApp?.id || selectedAppId;

    if (!effectiveAppId) {
      setError('Please select a valid candidate application.');
      return;
    }
    if (currentApp?.status && !SCHEDULABLE.includes(currentApp.status)) {
      setError('An interview cannot be scheduled for an application in its current status.');
      return;
    }
    if (!selectedPanelId) {
      setError('Please select an interview panel.');
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
      setMeetingNotice('');

      // The form is in IST; send an unambiguous instant.
      const validDate = new Date(`${interviewDate}T${interviewTime}:00+05:30`);
      if (Number.isNaN(validDate.getTime())) {
        setError('The interview date or time is not valid.');
        setSubmitting(false);
        return;
      }
      if (validDate.getTime() <= Date.now()) {
        setError('The interview must be scheduled for a future date and time.');
        setSubmitting(false);
        return;
      }

      const payload = {
        applicationId: effectiveAppId,
        panelId: selectedPanelId,
        panelistIds: selectedPanelistIds,
        scheduledAt: validDate.toISOString(),
        durationMinutes: parseInt(durationMinutes, 10) || 30,
        notes: notes.trim() || undefined,
        zoomJoinUrl: meetingJoinUrl.trim() || undefined
      };

      const res = await apiRequest('/admin/interviews/schedule-panel', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res?.zoomWarning) {
        setMeetingNotice(res.zoomWarning);
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
  const positionTitle = currentApp?.job?.position || currentApp?.personalInfo?.postAppliedFor || 'Position not specified';
  const candidateEmail = currentApp?.applicant?.user?.email || currentApp?.personalInfo?.email || 'N/A';
  const appNumber = currentApp?.applicationNumber || currentApp?.id || '';

  return (
    <>
      <style>{`
        .sim-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 20px;
          overflow-y: auto;
        }

        .sim-modal {
          width: 100%;
          max-width: 650px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: simSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          color: #111827;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }

        @keyframes simSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .sim-header {
          background: linear-gradient(135deg, #7B1F2B 0%, #5C1520 100%);
          padding: 22px 28px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .sim-header::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 140px; height: 140px;
          background: rgba(255,255,255,0.06);
          border-radius: 50%;
        }

        .sim-header::after {
          content: '';
          position: absolute;
          bottom: -30px; right: 60px;
          width: 90px; height: 90px;
          background: rgba(201, 162, 39, 0.15);
          border-radius: 50%;
        }

        .sim-header-content { position: relative; z-index: 1; }

        .sim-header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.9);
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 20px;
          margin-bottom: 10px;
          letter-spacing: 0.02em;
        }

        .sim-header-badge svg { width: 12px; height: 12px; }

        .sim-header h1 {
          color: white;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.3;
          margin: 0 0 4px 0;
        }

        .sim-header p {
          color: rgba(255,255,255,0.7);
          font-size: 12.5px;
          font-weight: 400;
          margin: 0;
        }

        .sim-close-btn {
          position: relative;
          z-index: 1;
          width: 36px; height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.1);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
          margin-left: 16px;
        }

        .sim-close-btn:hover {
          background: rgba(255,255,255,0.22);
          transform: rotate(90deg);
        }

        .sim-body {
          padding: 24px 28px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #D1D5DB transparent;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sim-section {
          display: flex;
          flex-direction: column;
        }

        .sim-section-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
        }

        .sim-section-number {
          width: 22px; height: 22px;
          background: #7B1F2B;
          color: white;
          font-size: 11px;
          font-weight: 700;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sim-required {
          color: #DC2626;
          font-weight: 600;
          font-size: 12px;
        }

        .sim-optional-tag {
          font-size: 11px;
          font-weight: 500;
          color: #9CA3AF;
          background: #F3F4F6;
          padding: 2px 8px;
          border-radius: 4px;
          margin-left: 4px;
        }

        .sim-select,
        .sim-input,
        .sim-textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #E5E7EB;
          border-radius: 8px;
          font-family: inherit;
          font-size: 13.5px;
          color: #111827;
          background: #FFFFFF;
          transition: all 0.2s;
          outline: none;
          box-sizing: border-box;
        }

        .sim-select {
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%236B7280' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 6l3.5 3.5L11.5 6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 38px;
        }

        .sim-select:focus,
        .sim-input:focus,
        .sim-textarea:focus {
          border-color: #7B1F2B;
          box-shadow: 0 0 0 3px rgba(123, 31, 43, 0.1);
        }

        .sim-candidate-banner {
          background: #F8EDEF;
          border: 1px solid #F0D5D9;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .sim-divider {
          height: 1px;
          background: #E5E7EB;
          margin: 2px 0;
        }

        .sim-panelist-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .sim-link-actions {
          display: flex;
          gap: 12px;
        }

        .sim-link-btn {
          background: none;
          border: none;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #7B1F2B;
          cursor: pointer;
          padding: 0;
        }

        .sim-link-btn:hover {
          text-decoration: underline;
        }

        .sim-panelist-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 180px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .sim-panelist-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border: 1.5px solid #E5E7EB;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          background: #FFFFFF;
          user-select: none;
        }

        .sim-panelist-card:hover {
          border-color: #D1D5DB;
          background: #FDFBFB;
        }

        .sim-panelist-card.selected {
          border-color: #7B1F2B;
          background: #F8EDEF;
        }

        .sim-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 1.5px solid #D1D5DB;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
        }

        .sim-panelist-card.selected .sim-checkbox {
          background: #7B1F2B;
          border-color: #7B1F2B;
        }

        .sim-checkbox svg {
          width: 12px; height: 12px;
          color: white;
          opacity: 0;
          transition: opacity 0.15s;
        }

        .sim-panelist-card.selected .sim-checkbox svg {
          opacity: 1;
        }

        .sim-panelist-info {
          flex: 1;
          min-width: 0;
        }

        .sim-panelist-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 2px;
        }

        .sim-panelist-email {
          font-size: 12px;
          color: #6B7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sim-role-badge {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 20px;
          background: #FBF6E9;
          color: #8B6914;
          white-space: nowrap;
          flex-shrink: 0;
          border: 1px solid #F0E0A0;
        }

        .sim-selection-count {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 8px 12px;
          background: #E8F7F0;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 500;
          color: #0F7B4B;
        }

        .sim-selection-count svg {
          width: 15px; height: 15px; flex-shrink: 0;
        }

        .sim-datetime-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 0.9fr;
          gap: 12px;
        }

        .sim-field-group label {
          display: block;
          font-size: 11.5px;
          font-weight: 500;
          color: #6B7280;
          margin-bottom: 6px;
        }

        .sim-input-icon-wrap {
          position: relative;
        }

        .sim-input-icon-wrap input {
          padding-left: 38px;
        }

        .sim-input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #9CA3AF;
          pointer-events: none;
        }

        .sim-duration-suffix {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          color: #9CA3AF;
          font-weight: 500;
          pointer-events: none;
        }

        .sim-meeting-link-wrap {
          position: relative;
        }

        .sim-meeting-link-wrap input {
          padding-left: 38px;
          padding-right: 110px;
        }

        .sim-meeting-badge {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: #F0FDF4;
          color: #166534;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid #BBF7D0;
        }

        .sim-helper-text {
          font-size: 11.5px;
          color: #6B7280;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .sim-modal-footer {
          padding: 16px 28px;
          background: #F9FAFB;
          border-top: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-shrink: 0;
        }

        .sim-footer-note {
          font-size: 12px;
          color: #6B7280;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sim-footer-note svg {
          width: 14px; height: 14px; flex-shrink: 0; color: #7B1F2B;
        }

        .sim-footer-actions {
          display: flex;
          gap: 10px;
        }

        .sim-btn {
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 600;
          padding: 9px 18px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: none;
          outline: none;
        }

        .sim-btn svg { width: 15px; height: 15px; }

        .sim-btn-ghost {
          background: white;
          color: #6B7280;
          border: 1.5px solid #E5E7EB;
        }

        .sim-btn-ghost:hover {
          background: #F3F4F6;
          color: #111827;
        }

        .sim-btn-primary {
          background: linear-gradient(135deg, #7B1F2B 0%, #5C1520 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(123, 31, 43, 0.35);
        }

        .sim-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(123, 31, 43, 0.45);
        }

        .sim-btn-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @media (max-width: 560px) {
          .sim-datetime-grid { grid-template-columns: 1fr; }
          .sim-modal-footer { flex-direction: column; align-items: stretch; }
          .sim-footer-actions { flex-direction: column-reverse; }
          .sim-btn { justify-content: center; }
        }
      `}</style>

      <div className="sim-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
        <div className="sim-modal" role="dialog" aria-modal="true">

          {/* HEADER */}
          <div className="sim-header">
            <div className="sim-header-content">
              <div className="sim-header-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Panel Interview
              </div>
              <h1>Schedule Interview with Panel &amp; Meeting Invite</h1>
              <p>D Y Patil International University &middot; Recruitment Cell</p>
            </div>
            <button
              type="button"
              className="sim-close-btn"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* BODY */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="sim-body">

              {/* CANDIDATE INFO */}
              {application ? (
                <div className="sim-candidate-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#7B1F2B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Candidate:</span>
                    <strong style={{ fontSize: '14px', color: '#111827' }}>{candidateName}</strong>
                    <span style={{ fontSize: '12.5px', color: '#6B7280' }}>({candidateEmail})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#7B1F2B' }}>{positionTitle}</span>
                    <span style={{ background: '#FFFFFF', color: '#7B1F2B', border: '1px solid #E5E7EB', fontSize: '11.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                      #{appNumber}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="sim-section">
                  <div className="sim-section-label">
                    Select Candidate / Application <span className="sim-required">*</span>
                  </div>
                  <select
                    className="sim-select"
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Candidate Application --</option>
                    {availableApplications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.applicant?.name || 'Candidate'} &mdash; {app.applicationNumber} ({app.job?.position || 'Position'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '8px', fontSize: '13px' }}>
                  <strong>Error:</strong> {error}
                </div>
              )}

              {meetingNotice && (
                <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', borderRadius: '8px', fontSize: '13px' }}>
                  {meetingNotice}
                </div>
              )}

              <div className="sim-divider"></div>

              {/* 1. SELECT PANEL */}
              <div className="sim-section">
                <div className="sim-section-label">
                  <span className="sim-section-number">1</span>
                  Select Interview Panel <span className="sim-required">*</span>
                </div>
                {loadingPanels ? (
                  <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Loading configured panels...</p>
                ) : (
                  <select
                    className="sim-select"
                    value={selectedPanelId}
                    onChange={(e) => handlePanelChange(e.target.value)}
                    required
                  >
                    <option value="">-- Select an interview panel --</option>
                    {panels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code}) &mdash; {p.description || 'Standard Panel'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2. PICK PANELISTS */}
              <div className="sim-section">
                <div className="sim-panelist-header">
                  <div className="sim-section-label" style={{ marginBottom: 0 }}>
                    <span className="sim-section-number">2</span>
                    Pick Panelists from {currentPanel?.name || 'Panel'} <span className="sim-required">*</span>
                  </div>
                  <div className="sim-link-actions">
                    <button
                      type="button"
                      className="sim-link-btn"
                      onClick={() => handleSelectAll(true)}
                    >
                      SELECT ALL
                    </button>
                    <span style={{ color: '#E5E7EB' }}>|</span>
                    <button
                      type="button"
                      className="sim-link-btn"
                      onClick={() => handleSelectAll(false)}
                    >
                      DESELECT ALL
                    </button>
                  </div>
                </div>

                <div className="sim-panelist-list">
                  {panelMembers.length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                      No panelists registered in this panel. Please add members in "Interview Panels".
                    </div>
                  ) : (
                    panelMembers.map((member) => {
                      const isSelected = selectedPanelistIds.includes(member.id);
                      return (
                        <div
                          key={member.id}
                          className={`sim-panelist-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (member.isActive) handlePanelistToggle(member.id);
                          }}
                          style={{ opacity: member.isActive ? 1 : 0.6, cursor: member.isActive ? 'pointer' : 'not-allowed' }}
                        >
                          <div className="sim-checkbox">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <div className="sim-panelist-info">
                            <div className="sim-panelist-name">{member.name}</div>
                            <div className="sim-panelist-email">{member.email}</div>
                          </div>
                          {member.designation && (
                            <span className="sim-role-badge">{member.designation}</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="sim-selection-count">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>{selectedPanelistIds.length} panelist(s) selected to evaluate and receive candidate documents &amp; meeting details</span>
                </div>
              </div>

              {/* 3. DATE / TIME / DURATION */}
              <div className="sim-section">
                <div className="sim-section-label">
                  <span className="sim-section-number">3</span>
                  Schedule Details <span className="sim-required">*</span>
                </div>
                <div className="sim-datetime-grid">
                  <div className="sim-field-group">
                    <label>Interview Date</label>
                    <div className="sim-input-icon-wrap">
                      <svg className="sim-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <input
                        type="date"
                        className="sim-input"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={interviewDate}
                        onChange={(e) => setInterviewDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sim-field-group">
                    <label>Start Time (IST)</label>
                    <div className="sim-input-icon-wrap">
                      <svg className="sim-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <input
                        type="time"
                        className="sim-input"
                        required
                        value={interviewTime}
                        onChange={(e) => setInterviewTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sim-field-group">
                    <label>Duration</label>
                    <div className="sim-input-icon-wrap">
                      <input
                        type="number"
                        className="sim-input"
                        min="15"
                        max="180"
                        step="15"
                        style={{ paddingLeft: '14px', paddingRight: '48px' }}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                      />
                      <span className="sim-duration-suffix">mins</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. NOTES / AGENDA */}
              <div className="sim-section">
                <div className="sim-section-label">
                  <span className="sim-section-number">4</span>
                  Interview Notes / Agenda
                  <span className="sim-optional-tag">Optional</span>
                </div>
                <textarea
                  className="sim-textarea"
                  rows={2}
                  placeholder="e.g. Please prepare a 15-minute presentation on your research domain and teaching portfolio."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* 5. MEETING LINK */}
              <div className="sim-section">
                <div className="sim-section-label">
                  <span className="sim-section-number">5</span>
                  Meeting Link
                  <span className="sim-optional-tag">Optional Fallback</span>
                </div>
                <div className="sim-meeting-link-wrap">
                  <svg className="sim-input-icon" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  <input
                    type="url"
                    className="sim-input"
                    placeholder="https://meet.google.com/... or https://teams.microsoft.com/..."
                    value={meetingJoinUrl}
                    onChange={(e) => setMeetingJoinUrl(e.target.value)}
                  />
                  <span className="sim-meeting-badge">Meeting Link</span>
                </div>
                <p className="sim-helper-text">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  This link and candidate Resume/CV files will be emailed directly to each selected panelist.
                </p>
              </div>

            </div>

            {/* FOOTER */}
            <div className="sim-modal-footer">
              <div className="sim-footer-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Candidate resume &amp; CV will be attached automatically
              </div>
              <div className="sim-footer-actions">
                <button
                  type="button"
                  className="sim-btn sim-btn-ghost"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sim-btn sim-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    'Scheduling & Dispatching...'
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                      </svg>
                      Schedule &amp; Send Invite
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>

        </div>
      </div>
    </>
  );
}

export default ScheduleInterviewModal;
