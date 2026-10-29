import React, { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';

const COUNT_LABELS = [
  ['applications', 'application'],
  ['applicationDocuments', 'uploaded application file'],
  ['documentRequests', 'document request'],
  ['requestedDocuments', 'requested-document upload'],
  ['interviews', 'interview record'],
  ['notifications', 'notification'],
  ['emailRecords', 'e-mail log entry'],
  ['interestRegistrations', 'vacancy-interest registration']
];

const field = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' };
const label = { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' };

/** Permanently deletes a candidate. Nothing is sent until the reason, the candidate's e-mail and the admin's password are given. */
function DeleteCandidateModal({ applicantId, onClose, onDeleted }) {
  const [preview, setPreview] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [reason, setReason] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest(`/admin/candidates/${applicantId}/deletion-preview`)
      .then((data) => { if (active) setPreview(data); })
      .catch((err) => { if (active) setLoadError(err.message || 'Could not load the candidate.'); });
    return () => { active = false; };
  }, [applicantId]);

  const email = preview?.candidate?.email || '';
  const ready = preview && reason.trim().length >= 10 && confirmEmail.trim().toLowerCase() === email.toLowerCase() && password;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiRequest(`/admin/candidates/${applicantId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: reason.trim(), confirmEmail: confirmEmail.trim(), password })
      });
      onDeleted(res);
    } catch (err) {
      setError(err.message || 'The candidate could not be deleted.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', overflowY: 'auto' }} role="dialog" aria-modal="true" aria-label="Delete candidate">
      <div style={{ backgroundColor: '#fff', borderRadius: '14px', maxWidth: '560px', width: '100%', margin: 'auto', padding: '26px', boxSizing: 'border-box', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', border: '2px solid #FCA5A5' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: '#B91C1C' }}>Delete candidate and all their data</h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.86rem', color: '#475569' }}>
          This is permanent and cannot be undone. The deletion, your name and your reason are recorded in the audit log.
        </p>

        {loadError && <div role="alert" style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '8px', fontSize: '0.86rem', marginBottom: '14px' }}>{loadError}</div>}
        {!preview && !loadError && <p style={{ color: '#64748B', fontSize: '0.88rem' }}>Checking what will be removed…</p>}

        {preview && (
          <form onSubmit={submit}>
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', fontSize: '0.84rem', color: '#7F1D1D' }}>
              <div style={{ fontWeight: 800, marginBottom: '6px' }}>{preview.candidate.name} · {preview.candidate.email}</div>
              <div style={{ marginBottom: '8px' }}>The following will be permanently removed:</div>
              <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
                {COUNT_LABELS.filter(([key]) => preview.counts[key] > 0).map(([key, name]) => (
                  <li key={key}>{preview.counts[key]} {name}{preview.counts[key] === 1 ? '' : 's'}</li>
                ))}
                <li>the login account and the uploaded files on the server</li>
              </ul>
              {preview.applications.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '0.8rem' }}>
                  Applications: {preview.applications.map((a) => `${a.number} (${a.position || 'post not set'})`).join(', ')}
                </div>
              )}
              {preview.warnings.map((w) => <div key={w} style={{ marginTop: '8px', fontWeight: 700 }}>⚠ {w}</div>)}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="del-reason" style={label}>Reason for deletion * <span style={{ fontWeight: 500, color: '#64748B' }}>(kept in the audit log)</span></label>
              <textarea id="del-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Candidate requested erasure of their data, ticket #…" style={{ ...field, resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="del-email" style={label}>Type the candidate's e-mail address to confirm *</label>
              <input id="del-email" type="text" autoComplete="off" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={email} style={field} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="del-password" style={label}>Your password *</label>
              <input id="del-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={field} />
            </div>

            {error && <div role="alert" style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '8px', fontSize: '0.86rem', fontWeight: 600, marginBottom: '14px' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={onClose} disabled={busy} style={{ padding: '10px 18px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#0F172A', borderRadius: '8px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', letterSpacing: 'normal', textTransform: 'none' }}>Cancel</button>
              <button
                type="submit"
                disabled={!ready || busy}
                style={{ padding: '10px 20px', border: 'none', backgroundColor: '#B91C1C', color: '#fff', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 800, cursor: ready && !busy ? 'pointer' : 'not-allowed', opacity: ready && !busy ? 1 : 0.5, letterSpacing: 'normal', textTransform: 'none' }}
              >
                {busy ? 'Deleting…' : 'Permanently delete'}
              </button>
            </div>
          </form>
        )}

        {loadError && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#0F172A', borderRadius: '8px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', letterSpacing: 'normal', textTransform: 'none' }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeleteCandidateModal;
