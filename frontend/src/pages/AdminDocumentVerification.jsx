import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest, API_URL } from '../utils/api';
import {
  IconFolder,
  IconSearch,
  IconPlus,
  IconExternalLink,
  IconCheckCircle
} from '../components/icons/AdminIcons';
import { APPROVED_UNIVERSITY_STRUCTURE } from '../constants/universityStructure';

const STANDARD_DOCUMENTS = [
  'Original Resume / CV',
  '10th Marksheet & Certificate',
  '12th Marksheet & Certificate',
  'Graduation Degree & Marksheet',
  'Post Graduation Degree & Marksheet',
  'PhD Degree / Thesis Submission Proof',
  'Experience Letter(s)',
  'Relieving Letter from Previous Employer',
  'Last 3 Months Salary Slips',
  'PAN Card',
  'Aadhar Card',
  'Passport Copy',
  'Passport Size Photographs',
  'Bank Passbook / Cancelled Cheque',
  'Address Proof',
  'Other Certificates / Merit Awards'
];

function AdminDocumentVerification() {
  const [requests, setRequests] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New Request Form – School/Department Filters
  const [filterSchool, setFilterSchool] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [selectedApplicantId, setSelectedApplicantId] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState('');

  // Derive school list from APPROVED_UNIVERSITY_STRUCTURE and existing applications
  const allSchools = useMemo(() => {
    const schoolMap = new Map();
    // 1. Add approved university structure schools
    APPROVED_UNIVERSITY_STRUCTURE.forEach(fac => {
      fac.schools.forEach(sch => {
        schoolMap.set(sch.name.toLowerCase(), {
          id: sch.id,
          name: sch.name,
          code: sch.code,
          departments: sch.departments ? sch.departments.map(d => d.name) : []
        });
      });
    });

    // 2. Add schools from loaded applications/jobs
    applications.forEach(app => {
      const sName = app.job?.school?.name || app.job?.department;
      if (sName) {
        const cleanName = sName.replace(/^\[ARCHIVED\]\s*/i, '').trim();
        const key = cleanName.toLowerCase();
        if (!schoolMap.has(key)) {
          schoolMap.set(key, {
            id: app.job?.school?.id || app.job?.schoolId || key,
            name: cleanName,
            code: app.job?.school?.code || 'SCH',
            departments: []
          });
        }
        const dName = app.job?.departmentRef?.name || (app.job?.department !== sName ? app.job?.department : null);
        if (dName) {
          const entry = schoolMap.get(key);
          if (entry && !entry.departments.includes(dName)) {
            entry.departments.push(dName);
          }
        }
      }
    });

    return Array.from(schoolMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [applications]);

  // Derive departments for selected school
  const departmentsForSchool = useMemo(() => {
    if (!filterSchool) return [];
    const target = filterSchool.toLowerCase();
    const sch = allSchools.find(s => s.name.toLowerCase() === target || s.name.toLowerCase().includes(target) || target.includes(s.name.toLowerCase()));
    return sch ? sch.departments : [];
  }, [filterSchool, allSchools]);

  // Applications filtered by school/department – display only candidates shortlisted/selected for document verification
  // Deduplicates candidates so no duplicate or irrelevant candidate appears
  const filteredApplicationsForModal = useMemo(() => {
    if (!filterSchool) return [];

    const allowedStatuses = [
      'SHORTLISTED',
      'INTERVIEW_SCHEDULED',
      'SELECTED',
      'DOCUMENT_REQUESTED',
      'DOCUMENT_VERIFIED'
    ];

    const seenCandidateIds = new Set();
    const result = [];

    const targetSchool = filterSchool.toLowerCase();
    const targetDept = filterDepartment ? filterDepartment.toLowerCase() : '';

    for (const app of applications) {
      // Exclude irrelevant statuses (draft, rejected, withdrawn, closed)
      if (!app || app.status === 'DRAFT' || app.status === 'REJECTED' || app.status === 'WITHDRAWN' || app.status === 'CLOSED') {
        continue;
      }

      // Candidate must be shortlisted or selected for document verification
      const isShortlistedOrSelected =
        allowedStatuses.includes(app.status) ||
        (app.screeningRemarks && /shortlist|document|verify|interview/i.test(app.screeningRemarks));

      if (!isShortlistedOrSelected) {
        continue;
      }

      // School filter match
      const appSchoolName = (app.job?.school?.name || '').toLowerCase();
      const appJobDept = (app.job?.department || '').toLowerCase();
      const matchesSchool = appSchoolName.includes(targetSchool) || targetSchool.includes(appSchoolName) ||
        appJobDept.includes(targetSchool) || targetSchool.includes(appJobDept);

      if (!matchesSchool) continue;

      // Department filter match
      if (targetDept) {
        const appDeptRef = (app.job?.departmentRef?.name || '').toLowerCase();
        const matchesDept = appDeptRef.includes(targetDept) || targetDept.includes(appDeptRef) ||
          appJobDept.includes(targetDept) || targetDept.includes(appJobDept);
        if (!matchesDept) continue;
      }

      // Prevent duplicate candidates
      const candidateId = app.applicantId || app.applicant?.id;
      if (candidateId) {
        if (seenCandidateIds.has(candidateId)) continue;
        seenCandidateIds.add(candidateId);
      }

      result.push(app);
    }

    return result;
  }, [applications, filterSchool, filterDepartment]);
  const [checkedDocs, setCheckedDocs] = useState([
    'Original Resume / CV',
    '10th Marksheet & Certificate',
    '12th Marksheet & Certificate',
    'Graduation Degree & Marksheet',
    'PAN Card',
    'Aadhar Card'
  ]);
  const [customDocInput, setCustomDocInput] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [message, setMessage] = useState('');

  const getCandidateDisplay = (app) => {
    let name = app?.applicant?.name;
    if (!name || name === 'Applicant') {
      if (app?.personalInfo) {
        try {
          const p = typeof app.personalInfo === 'string' ? JSON.parse(app.personalInfo) : app.personalInfo;
          const full = `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
          if (full) name = full;
        } catch {}
      }
    }
    if (!name && app?.applicant?.user?.email) {
      name = app.applicant.user.email;
    }
    const appNum = app?.applicationNumber || 'Application';
    const pos = app?.job?.position || 'Applied Position';
    return `${name || 'Candidate'} — ${appNum} (${pos})`;
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      setLoading(true);
      setError('');

      const [reqsRes, appsRes] = await Promise.all([
        apiRequest('/documents').catch(err => {
          console.warn('Notice: Could not fetch existing document requests:', err.message);
          return [];
        }),
        apiRequest('/applications?limit=200').catch(err => {
          console.warn('Notice: Could not fetch applications:', err.message);
          return [];
        })
      ]);

      const requestsList = Array.isArray(reqsRes) ? reqsRes : [];
      const appsList = Array.isArray(appsRes?.data) ? appsRes.data : (Array.isArray(appsRes) ? appsRes : []);

      setRequests(requestsList);
      setApplications(appsList);
    } catch (err) {
      setError(err.message || 'Failed to load document verification data.');
    } finally {
      setLoading(false);
    }
  }

  // Add Custom Document to Mandatory List
  const handleAddCustomDoc = () => {
    const trimmed = customDocInput.trim();
    if (trimmed && !checkedDocs.includes(trimmed)) {
      setCheckedDocs(prev => [...prev, trimmed]);
      setCustomDocInput('');
    }
  };

  const handleRemoveDoc = (docName) => {
    setCheckedDocs(prev => prev.filter(d => d !== docName));
  };

  const handleResetStandardDocs = () => {
    setCheckedDocs([
      'Original Resume / CV',
      '10th Marksheet & Certificate',
      '12th Marksheet & Certificate',
      'Graduation Degree & Marksheet',
      'PAN Card',
      'Aadhar Card'
    ]);
  };

  // Submit New Document Request
  const handleSendRequestSubmit = async (e) => {
    e.preventDefault();

    let candidateId = selectedApplicantId;
    if (!candidateId && selectedApplicationId) {
      const selected = applications.find(a => a.id === selectedApplicationId);
      if (selected) {
        candidateId = selected.applicantId || selected.applicant?.id;
        setSelectedApplicantId(candidateId);
      }
    }

    if (!candidateId || checkedDocs.length === 0 || !deadline) {
      setError('Please select a candidate, deadline date, and at least one document.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const documentsPayload = checkedDocs.map(name => ({
        name,
        type: name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
        isMandatory: true
      }));

      const res = await apiRequest('/documents', {
        method: 'POST',
        body: JSON.stringify({
          candidateId,
          applicationId: selectedApplicationId || null,
          documents: documentsPayload,
          deadline,
          priority,
          message
        })
      });

      setSuccess(res.message || 'Document upload request emailed to candidate successfully.');
      setShowRequestModal(false);
      // Reset form
      setSelectedApplicantId('');
      setSelectedApplicationId('');
      setFilterSchool('');
      setFilterDepartment('');
      setMessage('');
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to send document request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Verify Item
  const handleVerifyItem = async (requestId, itemId) => {
    try {
      setError('');
      await apiRequest(`/documents/${requestId}/items/${itemId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'VERIFIED' })
      });
      setSuccess('Document verified successfully.');
      fetchInitialData();
      if (selectedRequestDetails && selectedRequestDetails.id === requestId) {
        const refreshed = await apiRequest(`/documents/${requestId}`);
        setSelectedRequestDetails(refreshed);
      }
    } catch (err) {
      setError(err.message || 'Failed to verify document.');
    }
  };

  // Reject Item Submit
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingItem || !rejectionReason.trim()) {
      setError('Please enter a rejection reason.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/documents/${rejectingItem.requestId}/items/${rejectingItem.itemId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason
        })
      });
      setSuccess('Document marked as rejected and notification sent to candidate.');
      setShowRejectModal(false);
      setRejectingItem(null);
      setRejectionReason('');
      fetchInitialData();
      if (selectedRequestDetails && selectedRequestDetails.id === rejectingItem.requestId) {
        const refreshed = await apiRequest(`/documents/${rejectingItem.requestId}`);
        setSelectedRequestDetails(refreshed);
      }
    } catch (err) {
      setError(err.message || 'Failed to reject document.');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk Approve All Documents for a Request
  const handleApproveAll = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve all uploaded documents for this candidate?')) return;
    try {
      setError('');
      await apiRequest(`/documents/${requestId}/approve-all`, {
        method: 'POST'
      });
      setSuccess('All documents verified and confirmation sent to candidate.');
      fetchInitialData();
      if (selectedRequestDetails && selectedRequestDetails.id === requestId) {
        const refreshed = await apiRequest(`/documents/${requestId}`);
        setSelectedRequestDetails(refreshed);
      }
    } catch (err) {
      setError(err.message || 'Failed to approve all documents.');
    }
  };

  // Download All as ZIP
  const handleDownloadZip = (requestId) => {
    const token = localStorage.getItem('token');
    const url = `${API_URL}/documents/${requestId}/download-zip`;
    // Trigger download via link with auth token in query if needed or standard fetch
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to download ZIP');
        return res.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Candidate_Documents_${requestId}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => {
        setError(err.message || 'Failed to download documents ZIP.');
      });
  };

  // Filtered requests
  const filteredRequests = requests.filter(req => {
    if (statusFilter !== 'ALL' && req.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = req.candidate?.name?.toLowerCase().includes(q);
      const matchEmail = req.candidate?.user?.email?.toLowerCase().includes(q);
      const matchApp = req.application?.applicationNumber?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchApp) return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ backgroundColor: '#721B28', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
              Feature 2
            </span>
            <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>Post-Application HR Review Workflow</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Document Verification
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.92rem' }}>
            Request original academic & professional documents from applicants after initial review, review uploads, verify individually, or download complete ZIP archives.
          </p>
        </div>

        <button
          onClick={() => {
            // Default 7 days from today
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            setDeadline(nextWeek.toISOString().slice(0, 10));
            if (applications.length === 0) {
              apiRequest('/applications?limit=200')
                .then(res => {
                  const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
                  setApplications(list);
                })
                .catch(() => {});
            }
            setShowRequestModal(true);
          }}
          style={{
            backgroundColor: '#721B28',
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
            boxShadow: '0 4px 12px rgba(114, 27, 40, 0.2)'
          }}
        >
          <IconPlus size={16} />
          Request Documents from Candidate
        </button>
      </div>

      {/* Status Alerts */}
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

      {/* Filters & Search */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Requests' },
            { key: 'SUBMITTED', label: 'Under Review' },
            { key: 'PARTIALLY_UPLOADED', label: 'Partially Uploaded' },
            { key: 'PENDING', label: 'Pending Upload' },
            { key: 'VERIFIED', label: 'Verified ✓' },
            { key: 'REJECTED', label: 'Rejected / Action Needed' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                backgroundColor: statusFilter === tab.key ? '#0F172A' : '#F1F5F9',
                color: statusFilter === tab.key ? '#ffffff' : '#475569',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
            <IconSearch size={15} />
          </span>
          <input
            type="text"
            placeholder="Search candidate name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
          />
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ fontWeight: 600 }}>Loading document verification requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '1.5px dashed #CBD5E1', borderRadius: '12px', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#721B28' }}>
            <IconFolder size={26} />
          </div>
          <h3 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '1.15rem', fontWeight: 800 }}>No document requests</h3>
          <p style={{ color: '#64748B', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 20px auto' }}>
            No document requests match this filter. Review applications and send document upload requests to candidates.
          </p>
          <button
            onClick={() => setShowRequestModal(true)}
            style={{ backgroundColor: '#721B28', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}
          >
            Request Documents from Candidate
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredRequests.map((req) => {
            const items = req.items || [];
            const uploadedCount = items.filter(i => i.documents && i.documents.length > 0).length;
            const verifiedCount = items.filter(i => i.status === 'VERIFIED').length;
            const rejectedCount = items.filter(i => i.status === 'REJECTED').length;
            const deadlineDate = new Date(req.deadline).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div
                key={req.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: req.priority === 'URGENT' ? '1.5px solid #FCA5A5' : '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '22px 26px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
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
                        backgroundColor: req.status === 'VERIFIED' ? '#DEF7EC' : req.status === 'REJECTED' ? '#FDE8E8' : req.status === 'SUBMITTED' ? '#E0E7FF' : '#FEF3C7',
                        color: req.status === 'VERIFIED' ? '#03543F' : req.status === 'REJECTED' ? '#9B1C1C' : req.status === 'SUBMITTED' ? '#3730A3' : '#92400E',
                        textTransform: 'uppercase'
                      }}>
                        {req.status === 'SUBMITTED' ? 'UNDER REVIEW' : req.status}
                      </span>
                      {req.priority === 'URGENT' && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, backgroundColor: '#FEE2E2', color: '#DC2626', padding: '3px 8px', borderRadius: '4px' }}>
                          ⚠️ URGENT
                        </span>
                      )}
                      <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                        {req.application?.applicationNumber || 'Application'}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                      {req.candidate?.name || 'Candidate Name'}
                    </h3>
                    <div style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 600 }}>
                      {req.candidate?.user?.email} · Applied for: <strong>{req.application?.job?.position || 'Faculty Position'}</strong>
                    </div>
                  </div>

                  {/* Deadline & Upload Summary */}
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 16px', borderRadius: '8px', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                      Uploads: <span style={{ color: '#2563EB', fontWeight: 800 }}>{uploadedCount}</span> / {items.length}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                      Deadline: <strong style={{ color: '#DC2626' }}>{deadlineDate}</strong>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                      {verifiedCount} Verified · {rejectedCount} Rejected
                    </div>
                  </div>
                </div>

                {req.message && (
                  <div style={{ fontSize: '0.82rem', color: '#475569', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px', borderLeft: '3px solid #721B28' }}>
                    <strong>Message to Candidate:</strong> {req.message}
                  </div>
                )}

                {/* Document Items Grid */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px', marginTop: '14px' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Requested Documents Checklist:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '8px' }}>
                    {items.map((item) => {
                      const latestDoc = item.documents && item.documents[0];
                      const isVerified = item.status === 'VERIFIED';
                      const isRejected = item.status === 'REJECTED';
                      const isUploaded = Boolean(latestDoc);

                      return (
                        <div
                          key={item.id}
                          style={{
                            backgroundColor: '#F8FAFC',
                            border: isVerified ? '1px solid #A7F3D0' : isRejected ? '1px solid #FECACA' : '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '10px 12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                              {item.documentName}
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isVerified ? '#DEF7EC' : isRejected ? '#FDE8E8' : isUploaded ? '#E0E7FF' : '#FEF3C7',
                              color: isVerified ? '#03543F' : isRejected ? '#9B1C1C' : isUploaded ? '#3730A3' : '#92400E'
                            }}>
                              {item.status}
                            </span>
                          </div>

                          {latestDoc ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #E2E8F0' }}>
                              <a
                                href={`${API_URL}/documents/file/${latestDoc.id}?inline=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <span>📄 View Document</span>
                                <IconExternalLink size={12} />
                              </a>

                              <div style={{ display: 'flex', gap: '4px' }}>
                                {!isVerified && (
                                  <button
                                    onClick={() => handleVerifyItem(req.id, item.id)}
                                    title="Approve / Verify this document"
                                    style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Verify ✓
                                  </button>
                                )}
                                {!isRejected && (
                                  <button
                                    onClick={() => {
                                      setRejectingItem({ requestId: req.id, itemId: item.id, name: item.documentName });
                                      setRejectionReason('');
                                      setShowRejectModal(true);
                                    }}
                                    title="Reject with reason (candidate will be notified to re-upload)"
                                    style={{ backgroundColor: '#DC2626', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Reject ✗
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', marginTop: '4px' }}>
                              Awaiting upload from candidate
                            </div>
                          )}

                          {isRejected && latestDoc?.rejectionReason && (
                            <div style={{ fontSize: '0.74rem', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '4px 6px', borderRadius: '4px', marginTop: '4px' }}>
                              <strong>Reason:</strong> {latestDoc.rejectionReason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #F1F5F9', marginTop: '16px', paddingTop: '12px' }}>
                  {uploadedCount > 0 && (
                    <button
                      onClick={() => handleDownloadZip(req.id)}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>📦 Download All as ZIP</span>
                    </button>
                  )}

                  {req.status !== 'VERIFIED' && uploadedCount > 0 && (
                    <button
                      onClick={() => handleApproveAll(req.id)}
                      style={{
                        backgroundColor: '#059669',
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Approve All Documents ✓
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. REQUEST DOCUMENTS MODAL */}
      {/* ============================================================== */}
      {showRequestModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '750px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>Request Original Documents from Candidate</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.85rem' }}>
                  Select the required documents checklist and set a submission deadline. An email instruction will be sent to the candidate.
                </p>
              </div>
              <button onClick={() => setShowRequestModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.4rem', cursor: 'pointer', color: '#94A3B8' }}>&times;</button>
            </div>

            <form onSubmit={handleSendRequestSubmit}>
              {/* ── Step 1: School Filter ── */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Step 1: Filter by School *
                </label>
                <select
                  value={filterSchool}
                  onChange={(e) => {
                    setFilterSchool(e.target.value);
                    setFilterDepartment('');
                    setSelectedApplicationId('');
                    setSelectedApplicantId('');
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                >
                  <option value="">-- Select School --</option>
                  {allSchools.map(sch => (
                    <option key={sch.id} value={sch.name}>{sch.name} ({sch.code})</option>
                  ))}
                </select>
              </div>

              {/* ── Step 2: Department Filter ── */}
              {filterSchool && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Step 2: Filter by Department (Optional)
                  </label>
                  <select
                    value={filterDepartment}
                    onChange={(e) => {
                      setFilterDepartment(e.target.value);
                      setSelectedApplicationId('');
                      setSelectedApplicantId('');
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  >
                    <option value="">-- All Departments in this School --</option>
                    {departmentsForSchool.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Step 3: Select Candidate ── */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Step 3: Select Candidate / Application *
                </label>
                {!filterSchool ? (
                  <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '8px', fontSize: '0.84rem', color: '#64748B' }}>
                    ← Please select a School first to see eligible candidates.
                  </div>
                ) : filteredApplicationsForModal.length === 0 ? (
                  <div style={{ padding: '10px 14px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '0.84rem', color: '#92400E' }}>
                    No shortlisted candidates found for the selected school/department. Only candidates with status SHORTLISTED, INTERVIEW_SCHEDULED, UNDER_REVIEW, or SUBMITTED are shown.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedApplicationId}
                    onChange={(e) => {
                      const appId = e.target.value;
                      setSelectedApplicationId(appId);
                      const selected = applications.find(a => a.id === appId);
                      if (selected) {
                        setSelectedApplicantId(selected.applicantId || selected.applicant?.id || '');
                      } else {
                        setSelectedApplicantId('');
                      }
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  >
                    <option value="">-- Choose Candidate ({filteredApplicationsForModal.length} eligible) --</option>
                    {filteredApplicationsForModal.map(app => (
                      <option key={app.id} value={app.id}>
                        {getCandidateDisplay(app)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Deadline & Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Upload Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="URGENT">Urgent (Highlighted in Email & Portal)</option>
                  </select>
                </div>
              </div>

              {/* Mandatory Documents List (No Tick Boxes) */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                      Required Verification Documents ({checkedDocs.length}) *
                    </label>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                      All listed documents are mandatory for the candidate to upload.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetStandardDocs}
                    style={{ border: 'none', background: 'none', color: '#721B28', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Reset to Default Standard
                  </button>
                </div>

                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1.5px solid #CBD5E1', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#FAFAFA' }}>
                  {checkedDocs.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                      No documents in list. Use the box below to add mandatory documents.
                    </div>
                  ) : (
                    checkedDocs.map((doc, idx) => (
                      <div
                        key={doc}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', width: '20px' }}>{idx + 1}.</span>
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0F172A' }}>{doc}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#FEF2F2',
                            color: '#991B1B',
                            border: '1px solid #FECACA',
                            textTransform: 'uppercase'
                          }}>
                            Mandatory
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(doc)}
                            title="Remove this document from request"
                            style={{
                              border: 'none',
                              background: '#F1F5F9',
                              color: '#64748B',
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.9rem',
                              lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Custom Document */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <input
                    type="text"
                    placeholder="Add document requirement (e.g. NOC Certificate)..."
                    value={customDocInput}
                    onChange={(e) => setCustomDocInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomDoc(); } }}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomDoc}
                    style={{ backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#0F172A', padding: '8px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Mandatory Doc
                  </button>
                </div>
              </div>

              {/* Additional Message */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Additional Instructions / Message to Candidate
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Please ensure all degree marksheets include both front and back sides with university stamp."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
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
                    backgroundColor: '#721B28',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Sending Request...' : 'Send Document Request via Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. REJECT ITEM MODAL (Mandatory Rejection Reason) */}
      {/* ============================================================== */}
      {showRejectModal && rejectingItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 45px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#DC2626' }}>
              Reject Document: {rejectingItem.name}
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: '0.85rem' }}>
              Please provide the reason for rejection. This reason will be emailed to the candidate so they can re-upload a compliant copy.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Rejection Reason *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Scanned copy is blurred / Stamp and signature are not visible. Please upload a high-resolution scan."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  style={{ padding: '8px 16px', border: '1px solid #CBD5E1', backgroundColor: '#ffffff', borderRadius: '6px', fontSize: '0.84rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 20px', border: 'none', backgroundColor: '#DC2626', color: '#ffffff', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Rejecting...' : 'Reject & Notify Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDocumentVerification;
