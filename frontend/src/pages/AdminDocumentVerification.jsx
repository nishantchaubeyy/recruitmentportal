import React, { useState, useEffect } from 'react';
import { apiRequest, openFile, downloadFile } from '../utils/api';
import { fetchApplicationsByStatus } from '../utils/applicationsApi';
import { DOCUMENT_REQUEST_STATUSES } from '../utils/documentChecklist';
import { downloadCsv, csvDate } from '../utils/csv';
import DocumentRequestPanel from '../components/DocumentRequestPanel';
import {
  IconFolder,
  IconSearch,
  IconPlus,
  IconExternalLink
} from '../components/icons/AdminIcons';

const REQUEST_STATUS_TABS = [
  { key: 'ALL', label: 'All Requests' },
  { key: 'SUBMITTED', label: 'Under Review' },
  { key: 'PARTIALLY_UPLOADED', label: 'Partially Uploaded' },
  { key: 'PENDING', label: 'Pending Upload' },
  { key: 'VERIFIED', label: 'Verified ✓' },
  { key: 'REJECTED', label: 'Rejected / Action Needed' }
];

const REQUEST_STATUS_TEXT = {
  PENDING: 'Pending upload',
  PARTIALLY_UPLOADED: 'Partially uploaded',
  SUBMITTED: 'Under review',
  VERIFIED: 'Verified',
  REJECTED: 'Action needed'
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function AdminDocumentVerification() {
  const [requests, setRequests] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [showRequestPanel, setShowRequestPanel] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [zipping, setZipping] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      const list = await apiRequest('/documents');
      setRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load document requests.');
    } finally {
      setLoading(false);
    }
  }

  // The candidate picker needs every shortlisted-or-later application, not just the first page.
  async function openRequestPanel() {
    setError('');
    setShowRequestPanel(true);
    try {
      setApplications(await fetchApplicationsByStatus(DOCUMENT_REQUEST_STATUSES));
    } catch (err) {
      setError(err.message || 'Could not load candidates.');
    }
  }

  async function reloadRequestsQuietly() {
    try {
      const list = await apiRequest('/documents');
      setRequests(Array.isArray(list) ? list : []);
    } catch { /* the list refreshes on the next action */ }
  }

  const handleVerifyItem = async (requestId, itemId) => {
    try {
      setError('');
      await apiRequest(`/documents/${requestId}/items/${itemId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'VERIFIED' })
      });
      setSuccess('Document verified.');
      reloadRequestsQuietly();
    } catch (err) {
      setError(err.message || 'Failed to verify document.');
    }
  };

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
        body: JSON.stringify({ status: 'REJECTED', rejectionReason })
      });
      setSuccess('Document rejected. The candidate can now upload a replacement.');
      setShowRejectModal(false);
      setRejectingItem(null);
      setRejectionReason('');
      reloadRequestsQuietly();
    } catch (err) {
      setError(err.message || 'Failed to reject document.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAll = async (requestId) => {
    if (!window.confirm('Approve every uploaded document in this request?')) return;
    try {
      setError('');
      await apiRequest(`/documents/${requestId}/approve-all`, { method: 'POST' });
      setSuccess('All uploaded documents verified.');
      reloadRequestsQuietly();
    } catch (err) {
      setError(err.message || 'Failed to approve all documents.');
    }
  };

  // Files are fetched with the login header; a plain link would be refused ("access token required").
  const handleViewFile = (docId) => {
    setError('');
    openFile(`/documents/file/${docId}?inline=true`).catch((err) => setError(err.message));
  };

  const handleDownloadZip = async (request) => {
    setError('');
    setZipping(request.id);
    try {
      await downloadFile(`/documents/${request.id}/download-zip`, `Documents_${request.id}.zip`);
    } catch (err) {
      setError(err.message || 'Failed to download the ZIP.');
    } finally {
      setZipping('');
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [req.candidate?.name, req.candidate?.user?.email, req.application?.applicationNumber, req.application?.job?.position]
      .some((v) => String(v || '').toLowerCase().includes(q));
  });

  // One row per requested document, for what is currently shown.
  const handleExportCsv = () => {
    const rows = filteredRequests.flatMap((req) =>
      (req.items || []).map((item) => ({ req, item, doc: item.documents?.[0] }))
    );
    downloadCsv(`document-requests-${new Date().toISOString().slice(0, 10)}.csv`, [
      { header: 'Candidate', value: ({ req }) => req.candidate?.name },
      { header: 'E-mail', value: ({ req }) => req.candidate?.user?.email },
      { header: 'Application No.', value: ({ req }) => req.application?.applicationNumber },
      { header: 'Post', value: ({ req }) => req.application?.job?.position },
      { header: 'Request Status', value: ({ req }) => REQUEST_STATUS_TEXT[req.status] || req.status },
      { header: 'Priority', value: ({ req }) => req.priority },
      { header: 'Requested On', value: ({ req }) => csvDate(req.createdAt) },
      { header: 'Deadline', value: ({ req }) => csvDate(req.deadline) },
      { header: 'Document', value: ({ item }) => item.documentName },
      { header: 'Mandatory', value: ({ item }) => (item.isMandatory ? 'Mandatory' : 'Optional') },
      { header: 'Document Status', value: ({ item }) => item.status },
      { header: 'Uploaded File', value: ({ doc }) => doc?.fileName },
      { header: 'Uploaded On', value: ({ doc }) => csvDate(doc?.uploadDate) },
      { header: 'Rejection Reason', value: ({ doc }) => doc?.rejectionReason }
    ], rows);
    apiRequest('/admin/events/export', { method: 'POST', body: JSON.stringify({ source: 'document-requests', rows: rows.length, filters: { status: statusFilter, search: searchQuery || undefined } }) }).catch(() => {});
  };

  const statusBadge = (status) => ({
    backgroundColor: status === 'VERIFIED' ? '#DEF7EC' : status === 'REJECTED' ? '#FDE8E8' : status === 'SUBMITTED' ? '#E0E7FF' : '#FEF3C7',
    color: status === 'VERIFIED' ? '#03543F' : status === 'REJECTED' ? '#9B1C1C' : status === 'SUBMITTED' ? '#3730A3' : '#92400E'
  });

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Document Verification
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.92rem', maxWidth: '640px' }}>
            Request original documents from shortlisted and selected candidates, review what they upload, verify each document, or download everything as a ZIP.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredRequests.length === 0}
            title={filteredRequests.length === 0 ? 'Nothing to export' : 'Download the requests shown below as a CSV file'}
            style={{ backgroundColor: '#fff', color: '#0F172A', border: '1px solid #CBD5E1', padding: '11px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: filteredRequests.length === 0 ? 'not-allowed' : 'pointer', opacity: filteredRequests.length === 0 ? 0.55 : 1 }}
          >
            ⬇ Export CSV
          </button>
          <button
            type="button"
            onClick={openRequestPanel}
            style={{ backgroundColor: '#721B28', color: '#fff', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(114, 27, 40, 0.2)' }}
          >
            <IconPlus size={16} />
            Request Documents
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ padding: '12px 18px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', marginBottom: '20px', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 18px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '8px', marginBottom: '20px', fontSize: '0.88rem' }}>
          {success}
        </div>
      )}

      <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {REQUEST_STATUS_TABS.map((tab) => {
            const count = tab.key === 'ALL' ? requests.length : requests.filter((r) => r.status === tab.key).length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{ backgroundColor: statusFilter === tab.key ? '#0F172A' : '#F1F5F9', color: statusFilter === tab.key ? '#fff' : '#475569', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {tab.label} <span style={{ opacity: 0.7 }}>({count})</span>
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
            <IconSearch size={15} />
          </span>
          <input
            type="text"
            placeholder="Search name, e-mail, application no. or post…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ fontWeight: 600 }}>Loading document requests…</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div style={{ backgroundColor: '#fff', border: '1.5px dashed #CBD5E1', borderRadius: '12px', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#721B28' }}>
            <IconFolder size={26} />
          </div>
          <h3 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '1.15rem', fontWeight: 800 }}>No document requests</h3>
          <p style={{ color: '#64748B', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 20px auto' }}>
            {requests.length === 0
              ? 'No documents have been requested yet. Open a shortlisted or selected candidate to request their documents.'
              : 'No requests match this filter.'}
          </p>
          <button type="button" onClick={openRequestPanel} style={{ backgroundColor: '#721B28', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>
            Request Documents
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredRequests.map((req) => {
            const items = req.items || [];
            const uploadedCount = items.filter((i) => i.documents && i.documents.length > 0).length;
            const verifiedCount = items.filter((i) => i.status === 'VERIFIED').length;
            const rejectedCount = items.filter((i) => i.status === 'REJECTED').length;
            const mandatoryCount = items.filter((i) => i.isMandatory).length;

            return (
              <div key={req.id} style={{ backgroundColor: '#fff', border: req.priority === 'URGENT' ? '1.5px solid #FCA5A5' : '1px solid #E2E8F0', borderRadius: '12px', padding: '22px 26px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', ...statusBadge(req.status) }}>
                        {REQUEST_STATUS_TEXT[req.status] || req.status}
                      </span>
                      {req.priority === 'URGENT' && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, backgroundColor: '#FEE2E2', color: '#DC2626', padding: '3px 8px', borderRadius: '4px' }}>⚠️ URGENT</span>
                      )}
                      {req.application?.applicationNumber && (
                        <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>{req.application.applicationNumber}</span>
                      )}
                    </div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                      {req.candidate?.name || req.candidate?.user?.email || 'Candidate'}
                    </h3>
                    <div style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 600 }}>
                      {req.candidate?.user?.email}
                      {req.application?.job?.position && <> · Applied for: <strong>{req.application.job.position}</strong></>}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 16px', borderRadius: '8px', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                      Uploads: <span style={{ color: '#2563EB', fontWeight: 800 }}>{uploadedCount}</span> / {items.length}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                      Deadline: <strong style={{ color: '#DC2626' }}>{formatDate(req.deadline)}</strong>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                      {verifiedCount} verified · {rejectedCount} rejected · {mandatoryCount} mandatory
                    </div>
                  </div>
                </div>

                {req.message && (
                  <div style={{ fontSize: '0.82rem', color: '#475569', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px', borderLeft: '3px solid #721B28', whiteSpace: 'pre-line' }}>
                    <strong>Message to candidate:</strong> {req.message}
                  </div>
                )}

                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px', marginTop: '14px' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Requested documents
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '8px' }}>
                    {items.map((item) => {
                      const latestDoc = item.documents && item.documents[0];
                      const isVerified = item.status === 'VERIFIED';
                      const isRejected = item.status === 'REJECTED';
                      const isUploaded = Boolean(latestDoc);

                      return (
                        <div key={item.id} style={{ backgroundColor: '#F8FAFC', border: isVerified ? '1px solid #A7F3D0' : isRejected ? '1px solid #FECACA' : '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                              {item.documentName}{' '}
                              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: item.isMandatory ? '#DC2626' : '#64748B' }}>
                                {item.isMandatory ? 'MANDATORY' : 'OPTIONAL'}
                              </span>
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', backgroundColor: isVerified ? '#DEF7EC' : isRejected ? '#FDE8E8' : isUploaded ? '#E0E7FF' : '#FEF3C7', color: isVerified ? '#03543F' : isRejected ? '#9B1C1C' : isUploaded ? '#3730A3' : '#92400E' }}>
                              {item.status}
                            </span>
                          </div>

                          {latestDoc ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #E2E8F0', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => handleViewFile(latestDoc.id)}
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.78rem', color: '#2563EB', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <span>📄 View {latestDoc.fileName}</span>
                                <IconExternalLink size={12} />
                              </button>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {!isVerified && (
                                  <button type="button" onClick={() => handleVerifyItem(req.id, item.id)} title="Verify this document" style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                    Verify ✓
                                  </button>
                                )}
                                {!isRejected && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingItem({ requestId: req.id, itemId: item.id, name: item.documentName });
                                      setRejectionReason('');
                                      setShowRejectModal(true);
                                    }}
                                    title="Reject with a reason; the candidate will be asked to re-upload"
                                    style={{ backgroundColor: '#DC2626', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Reject ✗
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', marginTop: '4px' }}>
                              {item.isMandatory ? 'Awaiting upload from candidate' : 'Optional — not uploaded'}
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #F1F5F9', marginTop: '16px', paddingTop: '12px', flexWrap: 'wrap' }}>
                  {uploadedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleDownloadZip(req)}
                      disabled={zipping === req.id}
                      style={{ backgroundColor: '#fff', border: '1px solid #CBD5E1', color: '#334155', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: zipping === req.id ? 'wait' : 'pointer' }}
                    >
                      {zipping === req.id ? 'Preparing ZIP…' : '📦 Download All as ZIP'}
                    </button>
                  )}
                  {req.status !== 'VERIFIED' && uploadedCount > 0 && (
                    <button type="button" onClick={() => handleApproveAll(req.id)} style={{ backgroundColor: '#059669', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                      Approve All Documents ✓
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showRequestPanel && (
        <DocumentRequestPanel
          applications={applications}
          onClose={() => setShowRequestPanel(false)}
          onSent={() => { setSuccess(''); reloadRequestsQuietly(); }}
        />
      )}

      {showRejectModal && rejectingItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 45px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#DC2626' }}>Reject Document: {rejectingItem.name}</h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: '0.85rem' }}>
              The reason is e-mailed to the candidate so they can upload a corrected copy.
            </p>
            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label htmlFor="reject-reason" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Rejection reason *</label>
                <textarea id="reject-reason" rows="3" required value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowRejectModal(false)} style={{ padding: '8px 16px', border: '1px solid #CBD5E1', backgroundColor: '#fff', borderRadius: '6px', fontSize: '0.84rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '8px 20px', border: 'none', backgroundColor: '#DC2626', color: '#fff', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                  {submitting ? 'Rejecting…' : 'Reject & Notify Candidate'}
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
