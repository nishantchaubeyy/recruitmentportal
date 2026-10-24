import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import {
  IconCalendar,
  IconSearch,
  IconPlus,
  IconExternalLink,
  IconTrash,
  IconCheckCircle
} from '../components/icons/AdminIcons';

function AdminInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Interview Form
  const [formData, setFormData] = useState({
    title: '',
    jobId: '',
    interviewDate: '',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    zoomLink: '',
    zoomMeetingId: '',
    zoomPassword: '',
    interviewerName: '',
    interviewType: 'Technical',
    notes: '',
    candidateIds: []
  });

  // Reschedule Form
  const [rescheduleData, setRescheduleData] = useState({
    date: '',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    zoomLink: '',
    zoomMeetingId: '',
    zoomPassword: '',
    interviewerName: '',
    notes: ''
  });

  // Cancellation Reason
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      setLoading(true);
      setError('');
      const [interviewsRes, appsRes, jobsRes] = await Promise.all([
        apiRequest('/interviews'),
        apiRequest('/applications?limit=200'),
        apiRequest('/admin/vacancies')
      ]);

      setInterviews(Array.isArray(interviewsRes) ? interviewsRes : (interviewsRes?.data || []));
      setApplications(appsRes?.data || appsRes || []);
      setJobs(Array.isArray(jobsRes) ? jobsRes : (jobsRes?.data || []));
    } catch (err) {
      setError(err.message || 'Failed to load interview records.');
    } finally {
      setLoading(false);
    }
  }

  // Candidates filtered by selected job in schedule modal
  const eligibleApplications = applications.filter(app => {
    if (!formData.jobId) return true;
    return app.jobId === formData.jobId;
  });

  const handleCandidateToggle = (applicantId) => {
    setFormData(prev => {
      const exists = prev.candidateIds.includes(applicantId);
      return {
        ...prev,
        candidateIds: exists
          ? prev.candidateIds.filter(id => id !== applicantId)
          : [...prev.candidateIds, applicantId]
      };
    });
  };

  const handleSelectAllEligible = () => {
    const allIds = eligibleApplications.map(a => a.applicantId).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      candidateIds: Array.from(new Set([...prev.candidateIds, ...allIds]))
    }));
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({ ...prev, candidateIds: [] }));
  };

  // Schedule Submit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.jobId || !formData.interviewDate || formData.candidateIds.length === 0) {
      setError('Please select a position, interview date, and at least one candidate.');
      return;
    }

    if (!formData.zoomLink) {
      setError('Please provide the Zoom meeting link.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/interviews', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          date: formData.interviewDate
        })
      });

      setSuccess(res.message || 'Zoom interview scheduled & links emailed to selected candidates.');
      setShowScheduleModal(false);
      setFormData({
        title: '',
        jobId: '',
        interviewDate: '',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        zoomLink: '',
        zoomMeetingId: '',
        zoomPassword: '',
        interviewerName: '',
        interviewType: 'Technical',
        notes: '',
        candidateIds: []
      });
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to schedule interview.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reschedule Submit
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInterview) return;
    setSubmitting(true);
    try {
      await apiRequest(`/interviews/${selectedInterview.id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify(rescheduleData)
      });
      setSuccess('Interview rescheduled and updated details emailed to candidates.');
      setShowRescheduleModal(false);
      setSelectedInterview(null);
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to reschedule interview.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Submit
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInterview) return;
    setSubmitting(true);
    try {
      await apiRequest(`/interviews/${selectedInterview.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason })
      });
      setSuccess('Interview cancelled and cancellation email dispatched.');
      setShowCancelModal(false);
      setSelectedInterview(null);
      setCancelReason('');
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to cancel interview.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend Email
  const handleResendEmail = async (interviewId, candidateId = null) => {
    try {
      setError('');
      setSuccess('Resending interview email...');
      const res = await apiRequest(`/interviews/${interviewId}/resend-email`, {
        method: 'POST',
        body: JSON.stringify({ candidateId })
      });
      setSuccess(res.message || 'Interview link email resent successfully.');
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to resend interview email.');
    }
  };

  // Filtered Interviews
  const filteredInterviews = interviews.filter(inv => {
    if (selectedStatusTab !== 'ALL' && inv.status !== selectedStatusTab) {
      return false;
    }
    if (selectedTypeFilter !== 'ALL' && inv.interviewType !== selectedTypeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = inv.title?.toLowerCase().includes(q);
      const matchJob = inv.job?.position?.toLowerCase().includes(q);
      const matchInterviewer = inv.interviewerName?.toLowerCase().includes(q);
      const matchCandidate = (inv.candidates || []).some(c =>
        c.candidate?.name?.toLowerCase().includes(q) ||
        c.candidate?.user?.email?.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchJob && !matchInterviewer && !matchCandidate) {
        return false;
      }
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ backgroundColor: '#2563EB', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Feature 1
            </span>
            <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>Zoom Integration & Email Distribution</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Interview Management
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.92rem' }}>
            Schedule Zoom interviews for single or multiple shortlisted candidates with automated, personalized email distribution.
          </p>
        </div>

        <button
          onClick={() => setShowScheduleModal(true)}
          style={{
            backgroundColor: '#0F172A',
            color: '#ffffff',
            border: 'none',
            padding: '11px 22px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
          }}
        >
          <IconPlus size={16} />
          Schedule Zoom Interview
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '12px 18px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', marginBottom: '20px', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 18px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '8px', marginBottom: '20px', fontSize: '0.88rem' }}>
          {success}
        </div>
      )}

      {/* Filters and Search Bar */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'].map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedStatusTab(tab)}
              style={{
                backgroundColor: selectedStatusTab === tab ? '#0F172A' : '#F1F5F9',
                color: selectedStatusTab === tab ? '#ffffff' : '#475569',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search & Round Filter */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: '280px' }}>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.84rem',
              backgroundColor: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="ALL">All Interview Types</option>
            <option value="Technical">Technical</option>
            <option value="HR">HR</option>
            <option value="Managerial">Managerial</option>
            <option value="Final">Final</option>
            <option value="Presentation">Presentation</option>
          </select>

          <div style={{ position: 'relative', width: '240px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
              <IconSearch size={15} />
            </span>
            <input
              type="text"
              placeholder="Search interview..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.84rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Interviews List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ fontWeight: 600 }}>Loading scheduled interview sessions...</p>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '1.5px dashed #CBD5E1', borderRadius: '12px', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#2563EB' }}>
            <IconCalendar size={26} />
          </div>
          <h3 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '1.15rem', fontWeight: 800 }}>No interviews scheduled</h3>
          <p style={{ color: '#64748B', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 20px auto' }}>
            There are currently no interview sessions matching your filter criteria. Click below to schedule a Zoom interview.
          </p>
          <button
            onClick={() => setShowScheduleModal(true)}
            style={{ backgroundColor: '#0F172A', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}
          >
            + Schedule Zoom Interview
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredInterviews.map((inv) => {
            const formattedDate = new Date(inv.date).toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
            const timeStr = inv.startTime && inv.endTime ? `${inv.startTime} - ${inv.endTime}` : (inv.startTime || inv.time);
            const candidatesList = inv.candidates || [];
            const isCancelled = inv.status === 'CANCELLED';

            return (
              <div
                key={inv.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: isCancelled ? '1px solid #FECACA' : '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '22px 26px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  opacity: isCancelled ? 0.75 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: inv.status === 'CANCELLED' ? '#FEE2E2' : inv.status === 'RESCHEDULED' ? '#FEF3C7' : '#E0E7FF',
                        color: inv.status === 'CANCELLED' ? '#991B1B' : inv.status === 'RESCHEDULED' ? '#92400E' : '#3730A3',
                        textTransform: 'uppercase'
                      }}>
                        {inv.status}
                      </span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, backgroundColor: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '4px' }}>
                        {inv.interviewType || 'Technical'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                        {candidatesList.length} candidate{candidatesList.length !== 1 ? 's' : ''} assigned
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                      {inv.title || `${inv.job?.position || 'Candidate'} Interview`}
                    </h3>
                    <div style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 600 }}>
                      {inv.job?.position} · {inv.job?.department || 'DYPIU Pune'}
                    </div>
                  </div>

                  {/* Date & Time Badge */}
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 16px', borderRadius: '8px', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                      📅 {formattedDate}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#721B28', marginTop: '2px' }}>
                      ⏰ {timeStr} (IST)
                    </div>
                  </div>
                </div>

                {/* Zoom Meeting Link Details Box */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px 18px', marginBottom: '18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: '#2D8CFF', color: '#fff', fontSize: '0.74rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px' }}>
                        ZOOM
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                        Meeting Details:
                      </span>
                    </div>

                    {inv.zoomMeetingId && (
                      <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                        <strong>ID:</strong> <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>{inv.zoomMeetingId}</code>
                      </div>
                    )}
                    {inv.zoomPassword && (
                      <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                        <strong>Passcode:</strong> <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>{inv.zoomPassword}</code>
                      </div>
                    )}
                    {inv.interviewerName && (
                      <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                        <strong>Interviewer:</strong> {inv.interviewerName}
                      </div>
                    )}
                  </div>

                  {inv.zoomLink && (
                    <a
                      href={inv.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: '#2D8CFF',
                        color: '#ffffff',
                        textDecoration: 'none',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>Join Zoom Meeting</span>
                      <IconExternalLink size={13} color="#ffffff" />
                    </a>
                  )}
                </div>

                {inv.notes && (
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '14px', backgroundColor: '#FFFBEB', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #F59E0B' }}>
                    <strong>Notes / Instructions:</strong> {inv.notes}
                  </div>
                )}

                {/* Candidate Multi-List with Email Status */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px', marginTop: '14px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Scheduled Candidates ({candidatesList.length}):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '8px' }}>
                    {candidatesList.map((ic) => (
                      <div
                        key={ic.id}
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                            {ic.candidate?.name || 'Candidate'}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                            {ic.candidate?.user?.email || ic.application?.applicationNumber || '—'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: ic.emailSent ? '#DEF7EC' : '#FDE8E8',
                            color: ic.emailSent ? '#03543F' : '#9B1C1C'
                          }}>
                            {ic.emailSent ? 'Email Sent ✓' : 'Email Pending'}
                          </span>
                          {!isCancelled && (
                            <button
                              onClick={() => handleResendEmail(inv.id, ic.candidateId)}
                              title="Resend Zoom invite email to this candidate"
                              style={{
                                backgroundColor: 'transparent',
                                border: '1px solid #CBD5E1',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                color: '#475569',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              Resend
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Actions Footer */}
                {!isCancelled && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #F1F5F9', marginTop: '16px', paddingTop: '12px' }}>
                    <button
                      onClick={() => handleResendEmail(inv.id)}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Resend Link to All
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInterview(inv);
                        setRescheduleData({
                          date: inv.date ? new Date(inv.date).toISOString().slice(0, 10) : '',
                          startTime: inv.startTime || inv.time || '10:00 AM',
                          endTime: inv.endTime || '11:00 AM',
                          zoomLink: inv.zoomLink || '',
                          zoomMeetingId: inv.zoomMeetingId || '',
                          zoomPassword: inv.zoomPassword || '',
                          interviewerName: inv.interviewerName || '',
                          notes: inv.notes || ''
                        });
                        setShowRescheduleModal(true);
                      }}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInterview(inv);
                        setCancelReason('');
                        setShowCancelModal(true);
                      }}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #FCA5A5',
                        color: '#DC2626',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel Interview
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. SCHEDULE INTERVIEW MODAL (Feature 1 Master Prompt) */}
      {/* ============================================================== */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '780px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>Schedule Zoom Interview</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.85rem' }}>
                  Distribute the same Zoom meeting link to single or multiple candidates via email.
                </p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.4rem', cursor: 'pointer', color: '#94A3B8' }}>&times;</button>
            </div>

            <form onSubmit={handleScheduleSubmit}>
              {/* Interview Title & Position */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Target Job Vacancy *
                  </label>
                  <select
                    value={formData.jobId}
                    onChange={(e) => {
                      const jId = e.target.value;
                      const selectedJob = jobs.find(j => j.id === jId);
                      setFormData(prev => ({
                        ...prev,
                        jobId: jId,
                        title: selectedJob ? `${selectedJob.position} - Round 1` : '',
                        candidateIds: []
                      }));
                    }}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  >
                    <option value="">-- Select Vacancy --</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.position} ({j.department})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Interview Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Developer - Round 1"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Date & Times */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Interview Date *
                  </label>
                  <input
                    type="date"
                    value={formData.interviewDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, interviewDate: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Start Time *
                  </label>
                  <input
                    type="text"
                    placeholder="10:00 AM"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    End Time *
                  </label>
                  <input
                    type="text"
                    placeholder="11:00 AM"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Zoom Credentials */}
              <div style={{ backgroundColor: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0369A1', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎥 Zoom Meeting Details (Pasted Link will be dispatched to all selected candidates)</span>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                    Zoom Meeting Link *
                  </label>
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/1234567890?pwd=xxxx"
                    value={formData.zoomLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, zoomLink: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #93C5FD', fontSize: '0.86rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Meeting ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 842 1234 5678"
                      value={formData.zoomMeetingId}
                      onChange={(e) => setFormData(prev => ({ ...prev, zoomMeetingId: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Meeting Passcode (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 987654"
                      value={formData.zoomPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, zoomPassword: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Interviewer & Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Interviewer / Committee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Prof. R. Sharma & HR Panel"
                    value={formData.interviewerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, interviewerName: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Interview Type / Round
                  </label>
                  <select
                    value={formData.interviewType}
                    onChange={(e) => setFormData(prev => ({ ...prev, interviewType: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  >
                    <option value="Technical">Technical Round</option>
                    <option value="HR">HR Round</option>
                    <option value="Managerial">Managerial Round</option>
                    <option value="Final">Final Round</option>
                    <option value="Presentation">Presentation / Demo Lecture</option>
                  </select>
                </div>
              </div>

              {/* Multi-Candidate Selection Table */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                    Select Candidate(s) ({formData.candidateIds.length} selected) *
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleSelectAllEligible}
                      style={{ border: 'none', background: 'none', color: '#2563EB', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Select All Available
                    </button>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      style={{ border: 'none', background: 'none', color: '#64748B', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1.5px solid #CBD5E1', borderRadius: '8px', padding: '6px' }}>
                  {eligibleApplications.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '0.84rem' }}>
                      {formData.jobId ? 'No candidates found for this position.' : 'Please select a vacancy position above to view candidates.'}
                    </div>
                  ) : (
                    eligibleApplications.map(app => {
                      const isChecked = formData.candidateIds.includes(app.applicantId);
                      return (
                        <label
                          key={app.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: isChecked ? '#EFF6FF' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCandidateToggle(app.applicantId)}
                              style={{ width: '16px', height: '16px', accentColor: '#0F172A', cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A' }}>
                                {app.applicant?.name || 'Applicant'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                {app.applicationNumber} · {app.applicant?.user?.email || 'No email registered'}
                              </div>
                            </div>
                          </div>

                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                            {app.status}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '6px' }}>
                  ℹ️ If multiple candidates are selected, the same Zoom link will be sent simultaneously to all of them with personalized email templates.
                </div>
              </div>

              {/* Instructions / Notes */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Additional Notes / Candidate Instructions
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Please join 5 minutes before scheduled time. Keep your PPT presentation and original certificates ready."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  style={{ padding: '10px 18px', border: '1px solid #CBD5E1', backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 24px',
                    border: 'none',
                    backgroundColor: '#0F172A',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Scheduling & Dispatching Emails...' : `Schedule & Send Zoom Links (${formData.candidateIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. RESCHEDULE MODAL */}
      {/* ============================================================== */}
      {showRescheduleModal && selectedInterview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', maxWidth: '560px', width: '100%', padding: '26px', boxShadow: '0 20px 45px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Reschedule Interview</h3>
            <p style={{ margin: '0 0 18px 0', color: '#64748B', fontSize: '0.85rem' }}>
              Updating this session will automatically send an updated reschedule email to all assigned candidates.
            </p>

            <form onSubmit={handleRescheduleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>New Date *</label>
                  <input
                    type="date"
                    required
                    value={rescheduleData.date}
                    onChange={(e) => setRescheduleData(prev => ({ ...prev, date: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Start Time *</label>
                  <input
                    type="text"
                    required
                    value={rescheduleData.startTime}
                    onChange={(e) => setRescheduleData(prev => ({ ...prev, startTime: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>End Time *</label>
                  <input
                    type="text"
                    required
                    value={rescheduleData.endTime}
                    onChange={(e) => setRescheduleData(prev => ({ ...prev, endTime: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Zoom Link *</label>
                <input
                  type="url"
                  required
                  value={rescheduleData.zoomLink}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, zoomLink: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Reschedule Note / Reason</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Rescheduled due to faculty evaluation panel availability."
                  value={rescheduleData.notes}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  style={{ padding: '8px 16px', border: '1px solid #CBD5E1', backgroundColor: '#ffffff', borderRadius: '6px', fontSize: '0.84rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 20px', border: 'none', backgroundColor: '#0F172A', color: '#ffffff', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Updating...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. CANCEL MODAL */}
      {/* ============================================================== */}
      {showCancelModal && selectedInterview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 45px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#DC2626' }}>Cancel Interview</h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: '0.85rem' }}>
              Are you sure you want to cancel this interview? A cancellation notice email will be sent to all assigned candidates.
            </p>

            <form onSubmit={handleCancelSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Cancellation Reason (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Candidate position filled or administrative postponement."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  style={{ padding: '8px 16px', border: '1px solid #CBD5E1', backgroundColor: '#ffffff', borderRadius: '6px', fontSize: '0.84rem', cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 20px', border: 'none', backgroundColor: '#DC2626', color: '#ffffff', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInterviews;
