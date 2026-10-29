import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';
import {
  DOCUMENT_REQUEST_STATUSES,
  candidateSummary,
  suggestChecklist,
  suggestMessage,
  defaultDeadline
} from '../utils/documentChecklist';

const field = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem', boxSizing: 'border-box' };
const label = { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' };

/**
 * "Request Documents" panel.
 *  - `application`: open it for one candidate (from the review page); everything is prefilled from their record.
 *  - without `application`: starts with a candidate picker over `applications`, then shows the same prefilled panel.
 */
function DocumentRequestPanel({ application = null, applications = [], onClose, onSent }) {
  const [pickedId, setPickedId] = useState(application?.id || '');
  const [search, setSearch] = useState('');
  const [fullApp, setFullApp] = useState(application || null);
  const [loadingApp, setLoadingApp] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);

  const [items, setItems] = useState([]);
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [priority, setPriority] = useState('NORMAL');
  const [message, setMessage] = useState('');
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Standard list and existing requests (to warn about duplicates).
  useEffect(() => {
    apiRequest('/documents/catalog').then((list) => setCatalog(Array.isArray(list) ? list : [])).catch(() => setCatalog([]));
    apiRequest('/documents')
      .then((list) => setOpenRequests(Array.isArray(list) ? list.filter((r) => r.status !== 'VERIFIED') : []))
      .catch(() => setOpenRequests([]));
  }, []);

  // Full record of the chosen candidate (the list view does not carry qualifications or experience).
  useEffect(() => {
    if (!pickedId) { setFullApp(null); return; }
    if (application && application.id === pickedId) { setFullApp(application); return; }
    let active = true;
    setLoadingApp(true);
    apiRequest(`/applications/${pickedId}`)
      .then((data) => { if (active) setFullApp(data); })
      .catch((err) => { if (active) setError(err.message || 'Could not load the candidate.'); })
      .finally(() => { if (active) setLoadingApp(false); });
    return () => { active = false; };
  }, [pickedId, application]);

  const summary = useMemo(() => (fullApp ? candidateSummary(fullApp) : null), [fullApp]);

  // Prefill the checklist and message whenever the candidate (or the catalog) changes.
  useEffect(() => {
    if (!fullApp || catalog.length === 0) return;
    setItems(suggestChecklist(fullApp, catalog));
    setMessage(suggestMessage(candidateSummary(fullApp)));
    setDeadline(defaultDeadline());
    setPriority('NORMAL');
  }, [fullApp, catalog]);

  const existing = fullApp ? openRequests.find((r) => r.applicationId === fullApp.id) : null;
  const eligible = useMemo(
    () => applications.filter((a) => DOCUMENT_REQUEST_STATUSES.includes(a.status)),
    [applications]
  );
  const filteredEligible = eligible.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const s = candidateSummary(a);
    return [s.name, s.email, s.applicationNumber, s.position].some((v) => String(v || '').toLowerCase().includes(q));
  });

  const unusedCatalog = catalog.filter((entry) => !items.some((i) => i.type === entry.type));

  const addFromCatalog = (type) => {
    const entry = catalog.find((c) => c.type === type);
    if (entry) setItems((prev) => [...prev, { name: entry.name, type: entry.type, isMandatory: Boolean(entry.isMandatory) }]);
  };
  const addCustom = () => {
    const name = customName.trim();
    if (!name || items.some((i) => i.name.toLowerCase() === name.toLowerCase())) return;
    setItems((prev) => [...prev, { name, type: 'CUSTOM', isMandatory: true }]);
    setCustomName('');
  };
  const setMandatory = (index, isMandatory) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, isMandatory } : it)));
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!summary?.applicantId) { setError('Please choose a candidate.'); return; }
    if (items.length === 0) { setError('Add at least one document to request.'); return; }
    if (!deadline || deadline < new Date().toISOString().slice(0, 10)) { setError('Choose a deadline that is today or later.'); return; }

    setSubmitting(true);
    try {
      const res = await apiRequest('/documents', {
        method: 'POST',
        body: JSON.stringify({
          candidateId: summary.applicantId,
          applicationId: fullApp.id,
          documents: items.map((it) => ({ name: it.name, type: it.type, isMandatory: it.isMandatory })),
          deadline,
          priority,
          message
        })
      });
      setResult(res);
      if (onSent) onSent(res);
    } catch (err) {
      setError(err.message || 'The request could not be sent.');
    } finally {
      setSubmitting(false);
    }
  };

  const mandatoryCount = items.filter((i) => i.isMandatory).length;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', overflowY: 'auto' }} role="dialog" aria-modal="true" aria-label="Request documents">
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', maxWidth: '760px', width: '100%', margin: 'auto', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '18px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Request Original Documents</h3>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.84rem' }}>
              Prefilled from the candidate's application. Adjust anything before sending.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: '#94A3B8', lineHeight: 1, padding: 0 }}>&times;</button>
        </div>

        {result ? (
          <div>
            <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: result.emailStatus === 'SENT' ? '#ECFDF5' : '#FFFBEB', border: `1px solid ${result.emailStatus === 'SENT' ? '#A7F3D0' : '#FCD34D'}`, color: result.emailStatus === 'SENT' ? '#065F46' : '#92400E', fontSize: '0.9rem', fontWeight: 600 }}>
              {result.message}
              {result.emailStatus !== 'SENT' && result.emailError && <div style={{ marginTop: 4, fontWeight: 500 }}>{result.emailError}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button type="button" onClick={onClose} style={{ padding: '10px 24px', border: 'none', backgroundColor: '#721B28', color: '#fff', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            {/* Candidate: fixed when opened from an application, otherwise picked from the eligible list */}
            {!application && (
              <div style={{ marginBottom: '16px' }}>
                <label style={label} htmlFor="drp-candidate">Candidate *</label>
                <input
                  type="text"
                  placeholder="Search by name, e-mail, application number or post…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ ...field, marginBottom: '8px' }}
                />
                <select id="drp-candidate" required value={pickedId} onChange={(e) => { setError(''); setPickedId(e.target.value); }} style={field}>
                  <option value="">{eligible.length === 0 ? 'No shortlisted, interview-stage, waitlisted or selected candidates yet' : `-- Choose a candidate (${filteredEligible.length}) --`}</option>
                  {filteredEligible.map((a) => {
                    const s = candidateSummary(a);
                    return <option key={a.id} value={a.id}>{`${s.name || s.email || 'Candidate'} — ${s.applicationNumber} (${s.position || 'position not set'}) · ${s.statusText}`}</option>;
                  })}
                </select>
              </div>
            )}

            {loadingApp && <p style={{ color: '#64748B', fontSize: '0.86rem' }}>Loading candidate details…</p>}

            {summary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px 18px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', fontSize: '0.84rem' }}>
                {[
                  ['Candidate', summary.name || '—'],
                  ['E-mail', summary.email || '—'],
                  ['Mobile', summary.mobile || '—'],
                  ['Application', summary.applicationNumber || '—'],
                  ['Post', summary.position || '—'],
                  ['School / Department', summary.department || '—'],
                  ['Current status', summary.statusText || '—']
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', wordBreak: 'break-word' }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {!summary?.email && summary && (
              <div style={{ padding: '10px 14px', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E', borderRadius: '8px', fontSize: '0.84rem', marginBottom: '14px' }}>
                No e-mail address is on file for this candidate, so they will only see the request on their portal.
              </div>
            )}
            {existing && (
              <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '8px', fontSize: '0.84rem', marginBottom: '14px' }}>
                A document request for this application is already open ({existing.status === 'SUBMITTED' ? 'under review' : existing.status.toLowerCase().replace('_', ' ')}). Sending another creates a second checklist for the candidate.
              </div>
            )}

            {summary && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                  <div>
                    <label style={label} htmlFor="drp-deadline">Upload deadline *</label>
                    <input id="drp-deadline" type="date" required min={new Date().toISOString().slice(0, 10)} value={deadline} onChange={(e) => setDeadline(e.target.value)} style={field} />
                  </div>
                  <div>
                    <label style={label} htmlFor="drp-priority">Priority</label>
                    <select id="drp-priority" value={priority} onChange={(e) => setPriority(e.target.value)} style={field}>
                      <option value="NORMAL">Normal</option>
                      <option value="URGENT">Urgent (highlighted in the e-mail and portal)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>
                      Documents to request ({items.length}) · {mandatoryCount} mandatory, {items.length - mandatoryCount} optional
                    </span>
                    <button type="button" onClick={() => setItems(suggestChecklist(fullApp, catalog))} style={{ border: 'none', background: 'none', color: '#721B28', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0, letterSpacing: 'normal', textTransform: 'none' }}>
                      Reset to suggested list
                    </button>
                  </div>

                  <div style={{ border: '1.5px solid #CBD5E1', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#FAFAFA', maxHeight: '300px', overflowY: 'auto' }}>
                    {items.length === 0 && <div style={{ padding: '14px', textAlign: 'center', color: '#94A3B8', fontSize: '0.84rem' }}>No documents yet. Add some below.</div>}
                    {items.map((item, index) => (
                      <div key={`${item.type}-${item.name}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#fff', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#0F172A', flex: '1 1 220px' }}>{index + 1}. {item.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div role="group" aria-label={`${item.name}: mandatory or optional`} style={{ display: 'inline-flex', border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'hidden' }}>
                            {[[true, 'Mandatory'], [false, 'Optional']].map(([value, text]) => (
                              <button
                                key={text}
                                type="button"
                                aria-pressed={item.isMandatory === value}
                                onClick={() => setMandatory(index, value)}
                                style={{ border: 'none', borderRadius: 0, padding: '4px 10px', fontSize: '0.72rem', letterSpacing: '0.03em', fontWeight: 800, cursor: 'pointer', backgroundColor: item.isMandatory === value ? (value ? '#721B28' : '#475569') : '#fff', color: item.isMandatory === value ? '#fff' : '#64748B' }}
                              >
                                {text}
                              </button>
                            ))}
                          </div>
                          <button type="button" onClick={() => removeItem(index)} title="Remove from request" aria-label={`Remove ${item.name}`} style={{ border: 'none', background: '#F1F5F9', color: '#64748B', width: '24px', height: '24px', minWidth: '24px', padding: 0, borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {unusedCatalog.length > 0 && (
                      <select value="" onChange={(e) => addFromCatalog(e.target.value)} aria-label="Add a standard document" style={{ ...field, flex: '1 1 220px', width: 'auto', padding: '8px 10px', fontSize: '0.82rem' }}>
                        <option value="">+ Add a standard document…</option>
                        {unusedCatalog.map((entry) => <option key={entry.type} value={entry.type}>{entry.name}</option>)}
                      </select>
                    )}
                    <input
                      type="text"
                      placeholder="Or type another document (e.g. NOC Certificate)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                      style={{ ...field, flex: '1 1 220px', width: 'auto', padding: '8px 10px', fontSize: '0.82rem' }}
                    />
                    <button type="button" onClick={addCustom} style={{ backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#0F172A', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Add</button>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={label} htmlFor="drp-message">Message to the candidate</label>
                  <textarea id="drp-message" rows={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} style={{ ...field, resize: 'vertical' }} />
                </div>
              </>
            )}

            {error && <div role="alert" style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '8px', fontSize: '0.86rem', fontWeight: 600, marginBottom: '14px' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
              <button type="button" onClick={onClose} style={{ padding: '10px 18px', border: '1px solid #CBD5E1', backgroundColor: '#fff', borderRadius: '8px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={submitting || !summary || loadingApp} style={{ padding: '10px 24px', border: 'none', backgroundColor: '#721B28', color: '#fff', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 700, cursor: submitting || !summary ? 'not-allowed' : 'pointer', opacity: submitting || !summary ? 0.6 : 1 }}>
                {submitting ? 'Sending…' : 'Send Document Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default DocumentRequestPanel;
