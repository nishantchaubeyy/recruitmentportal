import React, { useState, useEffect } from 'react';
import { apiRequest, API_URL } from '../utils/api';
import {
  IconFolder,
  IconCheckCircle,
  IconExternalLink
} from '../components/icons/AdminIcons';

function ApplicantDocuments() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingItem, setUploadingItem] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchMyDocumentRequests();
  }, []);

  async function fetchMyDocumentRequests() {
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest('/documents/my');
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load document requests.');
    } finally {
      setLoading(false);
    }
  }

  // Handle File Upload for a specific Item
  const handleFileUpload = async (requestId, itemId, file) => {
    if (!file) return;

    // Client-side validation: Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError(`File "${file.name}" exceeds the 5MB size limit. Please upload a smaller file.`);
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('Invalid format. Only PDF, JPG, JPEG, and PNG files are accepted.');
      return;
    }

    setError('');
    setSuccess('');
    setUploadingItem(itemId);
    setUploadProgress(30);

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');

    try {
      setUploadProgress(70);
      const response = await fetch(`${API_URL}/documents/${requestId}/items/${itemId}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload document.');
      }

      setUploadProgress(100);
      setSuccess(`Document "${file.name}" uploaded successfully.`);
      fetchMyDocumentRequests();
    } catch (err) {
      setError(err.message || 'Document upload failed.');
    } finally {
      setUploadingItem(null);
      setUploadProgress(0);
    }
  };

  // Submit All Documents for HR Verification
  const handleSubmitAll = async (requestId) => {
    setError('');
    setSuccess('');
    try {
      const res = await apiRequest(`/documents/${requestId}/submit`, {
        method: 'POST'
      });
      setSuccess(res.message || 'All documents successfully submitted for HR verification.');
      fetchMyDocumentRequests();
    } catch (err) {
      setError(err.message || 'Failed to submit documents.');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '980px', padding: '30px 24px' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: '#8B1235', margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.3px', fontFamily: "'Playfair Display', Georgia, serif" }}>
          My Documents
        </h2>
        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
          Upload original documents requested by HR for your job application. Please ensure all documents are clear, legible, and within 5MB.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '10px', marginBottom: '20px', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '10px', marginBottom: '20px', fontSize: '0.88rem' }}>
          {success}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ fontWeight: 600 }}>Loading document requirements...</p>
        </div>
      ) : requests.length === 0 ? (
        <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: '14px', padding: '50px 24px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#8B1235' }}>
            <IconFolder size={28} />
          </div>
          <h3 style={{ margin: '0 0 6px 0', color: '#8B1235', fontSize: '1.15rem', fontWeight: 800 }}>No Documents Requested</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '460px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
            HR has not requested any additional original documents for your application at this stage. You will receive an email notification if documents are required.
          </p>
          <a
            href="#/applicant/dashboard"
            onClick={(e) => { e.preventDefault(); window.location.href = window.location.pathname.replace(/\/documents.*$/, '/dashboard'); }}
            style={{
              display: 'inline-block',
              backgroundColor: '#8B1235',
              color: '#ffffff',
              padding: '9px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.86rem'
            }}
          >
            &larr; Return to Dashboard
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {requests.map((req) => {
            const items = req.items || [];
            const uploadedCount = items.filter(i => i.documents && i.documents.length > 0).length;
            const mandatoryMissing = items.filter(i => i.isMandatory && (!i.documents || i.documents.length === 0)).length;
            const allMandatoryUploaded = mandatoryMissing === 0;
            const isVerified = req.status === 'VERIFIED';
            const isSubmitted = req.status === 'SUBMITTED';

            const deadlineDate = new Date(req.deadline).toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });

            return (
              <div
                key={req.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: req.priority === 'URGENT' ? '2px solid #F87171' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '26px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.04)'
                }}
              >
                {/* Request Header Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: isVerified ? '#DEF7EC' : req.status === 'REJECTED' ? '#FDE8E8' : isSubmitted ? '#E0E7FF' : '#FEF3C7',
                        color: isVerified ? '#03543F' : req.status === 'REJECTED' ? '#9B1C1C' : isSubmitted ? '#3730A3' : '#92400E',
                        textTransform: 'uppercase'
                      }}>
                        {req.status === 'SUBMITTED' ? 'UNDER HR REVIEW' : req.status}
                      </span>
                      {req.priority === 'URGENT' && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, backgroundColor: '#FEE2E2', color: '#DC2626', padding: '3px 8px', borderRadius: '4px' }}>
                          ⚠️ URGENT
                        </span>
                      )}
                      <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700 }}>
                        {req.application?.applicationNumber || 'Application'}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                      Original Document Verification Request
                    </h3>
                    <div style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 600 }}>
                      Position: <strong>{req.application?.job?.position || 'Applied Faculty Position'}</strong>
                    </div>
                  </div>

                  {/* Deadline Box */}
                  <div style={{ backgroundColor: '#FDF2F8', border: '1px solid #FECDD3', padding: '10px 16px', borderRadius: '10px', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.76rem', color: '#8B1235', fontWeight: 800, textTransform: 'uppercase' }}>
                      Submission Deadline
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                      📅 {deadlineDate}
                    </div>
                  </div>
                </div>

                {req.message && (
                  <div style={{ backgroundColor: '#FFFBEB', borderLeft: '4px solid #F59E0B', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.86rem', color: '#78350F' }}>
                    <strong>Message from HR:</strong> {req.message}
                  </div>
                )}

                {/* Progress Bar */}
                <div style={{ marginBottom: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    <span>Uploaded: {uploadedCount} of {items.length} documents</span>
                    <span>{Math.round((uploadedCount / items.length) * 100)}% Complete</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(uploadedCount / items.length) * 100}%`, height: '100%', backgroundColor: isVerified ? '#059669' : '#8B1235', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                {/* Instructions Alert */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', fontSize: '0.82rem', color: '#475569' }}>
                  <strong style={{ color: '#0F172A' }}>Upload Guidelines:</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', lineHeight: 1.5 }}>
                    <li>Accepted file formats: <strong>PDF, JPG, JPEG, PNG</strong></li>
                    <li>Maximum file size per document: <strong>5 MB</strong></li>
                    <li>Ensure all scans are clear, straight, and high-resolution with visible signatures.</li>
                  </ul>
                </div>

                {/* Document Items List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  {items.map((item) => {
                    const latestDoc = item.documents && item.documents[0];
                    const isUploaded = Boolean(latestDoc);
                    const isItemVerified = item.status === 'VERIFIED';
                    const isItemRejected = item.status === 'REJECTED';
                    const isItemUploading = uploadingItem === item.id;

                    return (
                      <div
                        key={item.id}
                        style={{
                          border: isItemVerified ? '1.5px solid #A7F3D0' : isItemRejected ? '1.5px solid #FECACA' : '1px solid #E2E8F0',
                          backgroundColor: isItemVerified ? '#F0FDF4' : isItemRejected ? '#FEF2F2' : '#ffffff',
                          borderRadius: '12px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '14px'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0F172A' }}>
                              {item.documentName}
                            </span>
                            {item.isMandatory && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2px 6px', borderRadius: '4px' }}>
                                Mandatory
                              </span>
                            )}
                          </div>

                          {/* Rejection Alert Box */}
                          {isItemRejected && latestDoc?.rejectionReason && (
                            <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', color: '#991B1B', marginTop: '6px' }}>
                              <strong>HR Rejection Reason:</strong> {latestDoc.rejectionReason} — <em>Please re-upload a compliant copy.</em>
                            </div>
                          )}

                          {latestDoc && (
                            <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span>Uploaded: {latestDoc.fileName} ({(latestDoc.fileSize / 1024).toFixed(0)} KB)</span>
                              <a
                                href={`${API_URL}/documents/file/${latestDoc.id}?inline=true&token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                View File <IconExternalLink size={11} />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Status & Upload Action */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: isItemVerified ? '#DEF7EC' : isItemRejected ? '#FDE8E8' : isUploaded ? '#E0E7FF' : '#FEF3C7',
                            color: isItemVerified ? '#03543F' : isItemRejected ? '#9B1C1C' : isUploaded ? '#3730A3' : '#92400E'
                          }}>
                            {item.status}
                          </span>

                          {/* Upload / Re-upload Button */}
                          {!isItemVerified && (
                            <label
                              style={{
                                backgroundColor: isItemRejected ? '#DC2626' : '#8B1235',
                                color: '#FFE600',
                                border: 'none',
                                padding: '9px 18px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                cursor: isItemUploading ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 6px rgba(139, 18, 53, 0.3)',
                                transition: 'all 0.2s'
                              }}
                            >
                              <span style={{ color: '#FFE600', fontWeight: 800, letterSpacing: '0.02em' }}>
                                {isItemUploading ? 'Uploading...' : isItemRejected ? 'Re-upload ⟳' : isUploaded ? 'Replace File ↑' : 'Upload File ↑'}
                              </span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                disabled={isItemUploading}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileUpload(req.id, item.id, e.target.files[0]);
                                  }
                                }}
                                style={{ display: 'none' }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Final Submit All Documents Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '18px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                    {mandatoryMissing > 0 ? (
                      <span style={{ color: '#DC2626', fontWeight: 600 }}>
                        ⚠️ {mandatoryMissing} mandatory document{mandatoryMissing !== 1 ? 's' : ''} remaining to upload.
                      </span>
                    ) : (
                      <span style={{ color: '#059669', fontWeight: 700 }}>
                        ✓ All mandatory documents uploaded. Click Submit to finalize.
                      </span>
                    )}
                  </div>

                  {!isVerified && (
                    <button
                      onClick={() => handleSubmitAll(req.id)}
                      disabled={!allMandatoryUploaded || isSubmitted}
                      style={{
                        backgroundColor: allMandatoryUploaded && !isSubmitted ? '#8B1235' : '#CBD5E1',
                        color: '#ffffff',
                        border: 'none',
                        padding: '12px 28px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: allMandatoryUploaded && !isSubmitted ? 'pointer' : 'not-allowed',
                        boxShadow: allMandatoryUploaded && !isSubmitted ? '0 4px 12px rgba(139, 18, 53, 0.25)' : 'none'
                      }}
                    >
                      {isSubmitted ? 'Submitted for HR Verification ✓' : 'Submit All Documents for Verification &rarr;'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ApplicantDocuments;
