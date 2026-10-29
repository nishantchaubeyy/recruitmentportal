import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { downloadCsv } from '../utils/csv';
import { IconSearch } from '../components/icons/AdminIcons';

const PAGE_SIZE = 25;
const EXPORT_LIMIT = 5000;

const SEVERITY_STYLE = {
  INFO: { bg: '#EFF6FF', fg: '#1D4ED8', label: 'Info' },
  WARNING: { bg: '#FFFBEB', fg: '#B45309', label: 'Warning' },
  CRITICAL: { bg: '#FEF2F2', fg: '#B91C1C', label: 'Critical' }
};
const OUTCOME_STYLE = {
  SUCCESS: { fg: '#047857', label: 'Success' },
  FAILURE: { fg: '#B91C1C', label: 'Failed' },
  DENIED: { fg: '#B45309', label: 'Denied' }
};
const CATEGORY_LABEL = {
  AUTH: 'Sign-in', SECURITY: 'Security', USER: 'Users', APPLICATION: 'Applications', DOCUMENT: 'Documents',
  INTERVIEW: 'Interviews', VACANCY: 'Vacancies', DATA: 'Data protection', EXPORT: 'Exports', COMMUNICATION: 'Messages', SYSTEM: 'System'
};

const humanize = (action) => String(action || '').toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const when = (value) => new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

const pretty = (json) => {
  if (!json) return null;
  try { return JSON.stringify(JSON.parse(json), null, 2); } catch { return json; }
};

const fieldStyle = { padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.84rem', backgroundColor: '#fff', boxSizing: 'border-box', minWidth: 0 };
const buttonStyle = { padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', letterSpacing: 'normal', textTransform: 'none' };

function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [summary, setSummary] = useState(null);
  const [facets, setFacets] = useState({ actions: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [integrity, setIntegrity] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [live, setLive] = useState(false);

  const [filters, setFilters] = useState({ q: '', category: '', action: '', severity: '', outcome: '', from: '', to: '' });
  const [debouncedQ, setDebouncedQ] = useState('');
  const pageRef = useRef(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 350);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const activeFilters = useMemo(() => {
    const out = { ...filters, q: debouncedQ };
    return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
  }, [filters, debouncedQ]);

  const load = useCallback(async (page = 1, { quiet = false } = {}) => {
    try {
      if (!quiet) setLoading(true);
      setError('');
      pageRef.current = page;
      const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), ...activeFilters });
      const res = await apiRequest(`/admin/audit-logs?${query.toString()}`);
      setLogs(res?.data || []);
      if (res?.pagination) setPagination(res.pagination);
    } catch (err) {
      setError(err.message || 'Failed to retrieve the audit log.');
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  const loadSummary = useCallback(async () => {
    try { setSummary(await apiRequest('/admin/audit-logs/summary')); } catch { /* counters are optional */ }
  }, []);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => {
    apiRequest('/admin/audit-logs/facets').then(setFacets).catch(() => {});
  }, []);

  // "Live" mode refreshes the current page every 20 seconds while the tab is visible.
  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) { load(pageRef.current, { quiet: true }); loadSummary(); }
    }, 20000);
    return () => clearInterval(timer);
  }, [live, load, loadSummary]);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters({ q: '', category: '', action: '', severity: '', outcome: '', from: '', to: '' });

  const handleVerify = async () => {
    setVerifying(true);
    setIntegrity(null);
    try {
      setIntegrity(await apiRequest('/admin/audit-logs/verify'));
      load(pageRef.current, { quiet: true });
    } catch (err) {
      setError(err.message || 'The integrity check could not be completed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const rows = [];
      for (let page = 1; rows.length < EXPORT_LIMIT; page += 1) {
        const query = new URLSearchParams({ page: String(page), limit: '100', ...activeFilters });
        const res = await apiRequest(`/admin/audit-logs?${query.toString()}`);
        rows.push(...(res?.data || []));
        if (page >= (res?.pagination?.totalPages || 1)) break;
      }
      if (rows.length === 0) { setError('There are no records to export for these filters.'); return; }
      downloadCsv(`audit-log-${new Date().toISOString().slice(0, 10)}.csv`, [
        { header: 'No.', value: (r) => r.seq },
        { header: 'Time (UTC)', value: (r) => new Date(r.createdAt).toISOString() },
        { header: 'Severity', value: (r) => r.severity },
        { header: 'Outcome', value: (r) => r.outcome },
        { header: 'Category', value: (r) => r.category },
        { header: 'Action', value: (r) => r.action },
        { header: 'Summary', value: (r) => r.summary },
        { header: 'Actor', value: (r) => r.actorEmail },
        { header: 'Role', value: (r) => r.actorRole },
        { header: 'Target', value: (r) => r.entity },
        { header: 'Target ID', value: (r) => r.entityId },
        { header: 'IP address', value: (r) => r.ipAddress },
        { header: 'Request ID', value: (r) => r.requestId },
        { header: 'Method', value: (r) => r.method },
        { header: 'Path', value: (r) => r.path },
        { header: 'Details', value: (r) => r.newValue },
        { header: 'Previous value', value: (r) => r.oldValue },
        { header: 'Signature', value: (r) => r.hash }
      ], rows);
      apiRequest('/admin/events/export', { method: 'POST', body: JSON.stringify({ source: 'audit-log', rows: rows.length, filters: activeFilters }) }).catch(() => {});
    } catch (err) {
      setError(err.message || 'The export failed.');
    } finally {
      setExporting(false);
    }
  };

  const cards = summary ? [
    { label: 'Events (24 h)', value: summary.events24h, tone: '#0F172A' },
    { label: 'People active (24 h)', value: summary.activeActors24h, tone: '#0F172A' },
    { label: 'Failed sign-ins (24 h)', value: summary.failedLogins24h, tone: summary.failedLogins24h ? '#B45309' : '#0F172A' },
    { label: 'Access denied (24 h)', value: summary.denied24h, tone: summary.denied24h ? '#B45309' : '#0F172A' },
    { label: 'Critical events (7 d)', value: summary.critical7d, tone: summary.critical7d ? '#B91C1C' : '#0F172A' }
  ] : [];

  const hasFilters = Object.keys(activeFilters).length > 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>Audit Logs</h1>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.9rem', maxWidth: '680px' }}>
            Who did what, when and from where. Records are append-only and signed in a chain, so any change or removal is detected.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} style={{ width: '16px', height: '16px' }} />
            Live
          </label>
          <button type="button" onClick={handleVerify} disabled={verifying} style={{ ...buttonStyle, backgroundColor: '#fff', color: '#0F172A', border: '1px solid #CBD5E1' }}>
            {verifying ? 'Checking…' : '🔒 Verify integrity'}
          </button>
          <button type="button" onClick={handleExport} disabled={exporting} style={{ ...buttonStyle, backgroundColor: '#fff', color: '#0F172A', border: '1px solid #CBD5E1' }}>
            {exporting ? 'Preparing…' : '⬇ Export CSV'}
          </button>
        </div>
      </div>

      {integrity && (
        <div role="status" style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: 600, backgroundColor: integrity.ok ? '#ECFDF5' : integrity.keyMismatch ? '#FFFBEB' : '#FEF2F2', border: `1px solid ${integrity.ok ? '#A7F3D0' : integrity.keyMismatch ? '#FCD34D' : '#FECACA'}`, color: integrity.ok ? '#065F46' : integrity.keyMismatch ? '#92400E' : '#991B1B' }}>
          {integrity.ok ? (
            <>
              ✓ The chain is intact: {integrity.checked.toLocaleString('en-IN')} signed record{integrity.checked === 1 ? '' : 's'} checked, none changed or removed.
              {integrity.unsignedLegacyRecords > 0 && <div style={{ fontWeight: 500, marginTop: 4 }}>{integrity.unsignedLegacyRecords} older record{integrity.unsignedLegacyRecords === 1 ? '' : 's'} pre-date signing and cannot be verified.</div>}
              {integrity.headHash && <div style={{ fontWeight: 500, marginTop: 4, fontFamily: 'monospace', fontSize: '0.74rem', wordBreak: 'break-all' }}>Latest signature: {integrity.headHash}</div>}
            </>
          ) : integrity.keyMismatch ? (
            <>
              ⚠ The signing secret has changed. {integrity.reason}
              <div style={{ fontWeight: 500, marginTop: 4 }}>Verification stopped at record #{integrity.brokenAtSeq}; the {integrity.checked} record(s) before it are intact.</div>
            </>
          ) : (
            <>
              ⚠ The chain is BROKEN at record #{integrity.brokenAtSeq}. {integrity.reason}
              <div style={{ fontWeight: 500, marginTop: 4 }}>{integrity.checked} record(s) before it are intact. Treat this as a security incident and preserve the database.</div>
            </>
          )}
        </div>
      )}

      {cards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          {cards.map((card) => (
            <div key={card.label} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: card.tone, lineHeight: 1.1 }}>{Number(card.value).toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex' }}><IconSearch size={15} /></span>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
            placeholder="Search summary, person, application number, IP address or request id…"
            aria-label="Search the audit log"
            style={{ ...fieldStyle, width: '100%', paddingLeft: '32px' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'center' }}>
          <select aria-label="Category" value={filters.category} onChange={(e) => setFilter('category', e.target.value)} style={fieldStyle}>
            <option value="">All categories</option>
            {facets.categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c] || c}</option>)}
          </select>
          <select aria-label="Action" value={filters.action} onChange={(e) => setFilter('action', e.target.value)} style={fieldStyle}>
            <option value="">All actions</option>
            {facets.actions.filter((a) => !filters.category || a.category === filters.category).map((a) => <option key={a.action} value={a.action}>{humanize(a.action)}</option>)}
          </select>
          <select aria-label="Severity" value={filters.severity} onChange={(e) => setFilter('severity', e.target.value)} style={fieldStyle}>
            <option value="">Any severity</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <select aria-label="Outcome" value={filters.outcome} onChange={(e) => setFilter('outcome', e.target.value)} style={fieldStyle}>
            <option value="">Any outcome</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failed</option>
            <option value="DENIED">Denied</option>
          </select>
          <input type="date" aria-label="From date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter('from', e.target.value)} style={fieldStyle} />
          <input type="date" aria-label="To date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} style={fieldStyle} />
          {hasFilters && (
            <button type="button" onClick={clearFilters} style={{ ...buttonStyle, backgroundColor: '#F1F5F9', color: '#334155', border: 'none' }}>Clear filters</button>
          )}
        </div>
      </div>

      {error && <div role="alert" style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>{error}</div>}

      <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748B' }}>Loading the audit trail…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748B' }}>
            {hasFilters ? 'No records match these filters.' : 'No activity has been recorded yet.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', minWidth: '860px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', textAlign: 'left', color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 12px', width: '150px' }}>When</th>
                  <th style={{ padding: '10px 12px', width: '150px' }}>Who</th>
                  <th style={{ padding: '10px 12px' }}>What happened</th>
                  <th style={{ padding: '10px 12px', width: '120px' }}>Result</th>
                  <th style={{ padding: '10px 12px', width: '120px' }}>From</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const sev = SEVERITY_STYLE[log.severity] || SEVERITY_STYLE.INFO;
                  const outcome = OUTCOME_STYLE[log.outcome] || OUTCOME_STYLE.SUCCESS;
                  const open = expanded === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpanded(open ? null : log.id)}
                        style={{ borderTop: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: open ? '#F8FAFC' : '#fff' }}
                      >
                        <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' }}>{when(log.createdAt)}</td>
                        <td style={{ padding: '10px 12px', wordBreak: 'break-word' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{log.actorEmail || (log.userId ? 'Unknown user' : 'System / not signed in')}</div>
                          {log.actorRole && <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{log.actorRole.replace('_', ' ')}</div>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2px' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', backgroundColor: sev.bg, color: sev.fg }}>{sev.label}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B' }}>{CATEGORY_LABEL[log.category] || log.category}</span>
                          </div>
                          <div style={{ color: '#0F172A', fontWeight: 600 }}>{log.summary || humanize(log.action)}</div>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: outcome.fg }}>{outcome.label}</td>
                        <td style={{ padding: '10px 12px', color: '#64748B', fontSize: '0.78rem' }}>{log.ipAddress || '—'}</td>
                      </tr>
                      {open && (
                        <tr style={{ backgroundColor: '#F8FAFC' }}>
                          <td colSpan={5} style={{ padding: '4px 16px 16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px 24px', fontSize: '0.8rem', marginBottom: '10px' }}>
                              {[
                                ['Record no.', `#${log.seq}`],
                                ['Action', log.action],
                                ['Target', `${log.entity}${log.entityId ? ` · ${log.entityId}` : ''}`],
                                ['Request', `${log.method || ''} ${log.path || ''}`.trim() || '—'],
                                ['Request id', log.requestId || '—'],
                                ['Browser', log.userAgent || '—'],
                                ['Signature', log.hash ? `${log.hash.slice(0, 20)}…` : 'not signed (older record)']
                              ].map(([k, v]) => (
                                <div key={k}>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
                                  <div style={{ color: '#0F172A', wordBreak: 'break-word', fontFamily: ['Request id', 'Signature'].includes(k) ? 'monospace' : 'inherit' }}>{v}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                              {log.oldValue && (
                                <div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '3px' }}>Before</div>
                                  <pre style={{ margin: 0, padding: '10px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.74rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{pretty(log.oldValue)}</pre>
                                </div>
                              )}
                              {log.newValue && (
                                <div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '3px' }}>Details</div>
                                  <pre style={{ margin: 0, padding: '10px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.74rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{pretty(log.newValue)}</pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Page {pagination.page} of {pagination.totalPages} · {Number(pagination.total).toLocaleString('en-IN')} records
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)} style={{ ...buttonStyle, backgroundColor: '#fff', color: '#0F172A', border: '1px solid #CBD5E1', opacity: pagination.page <= 1 ? 0.5 : 1 }}>← Newer</button>
              <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)} style={{ ...buttonStyle, backgroundColor: '#fff', color: '#0F172A', border: '1px solid #CBD5E1', opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}>Older →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAuditLogs;
