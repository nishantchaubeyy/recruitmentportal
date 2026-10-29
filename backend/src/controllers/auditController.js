const prisma = require('../services/prisma');
const { logAuditAction, verifyChain, META } = require('../services/auditService');

const SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'];
const OUTCOMES = ['SUCCESS', 'FAILURE', 'DENIED'];

const text = (value, max = 120) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Turns the query string into a prisma `where`. Unknown values simply match nothing. */
function buildWhere(query) {
  const where = {};
  const category = text(query.category, 40);
  const action = text(query.action, 80);
  const severity = text(query.severity, 20).toUpperCase();
  const outcome = text(query.outcome, 20).toUpperCase();
  if (category) where.category = category;
  if (action) where.action = action;
  if (SEVERITIES.includes(severity)) where.severity = severity;
  if (OUTCOMES.includes(outcome)) where.outcome = outcome;
  if (text(query.actorId)) where.userId = text(query.actorId);
  if (text(query.entity, 60)) where.entity = text(query.entity, 60);
  if (text(query.entityId)) where.entityId = text(query.entityId);

  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
    where.createdAt = {};
    if (from && !Number.isNaN(from.getTime())) where.createdAt.gte = from;
    if (to && !Number.isNaN(to.getTime())) {
      // A date-only "to" means the whole of that day.
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) to.setUTCHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }

  const q = text(query.q, 100);
  if (q) {
    where.OR = ['summary', 'action', 'actorEmail', 'entityId', 'ipAddress', 'requestId', 'path'].map((field) => ({
      [field]: { contains: q, mode: 'insensitive' }
    }));
  }
  return where;
}

/** GET /admin/audit-logs */
async function getAuditLogs(req, res) {
  const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const where = buildWhere(req.query);

  try {
    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { seq: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      })
    ]);

    // Reading the log is itself recorded, once per search (not once per page turned).
    if (pageNum === 1) {
      logAuditAction({
        action: 'AUDIT_LOG_VIEWED', targetType: 'AuditLog', targetId: '',
        summary: 'Opened the audit log', details: { filters: Object.fromEntries(Object.entries(req.query).filter(([k]) => !['page', 'limit'].includes(k))) }, req
      });
    }

    return res.json({
      data: rows.map((row) => ({
        ...row,
        // Kept for older screens that expected a nested user.
        user: row.userId ? { id: row.userId, email: row.actorEmail, role: row.actorRole } : null
      })),
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.max(Math.ceil(total / limitNum), 1) }
    });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
}

/** GET /admin/audit-logs/summary - the counters shown above the table. */
async function getAuditSummary(req, res) {
  const since = (hours) => new Date(Date.now() - hours * 3600 * 1000);
  const day = { createdAt: { gte: since(24) } };
  try {
    const [events24h, failedLogins24h, denied24h, critical7d, activeActors24h, byCategory] = await Promise.all([
      prisma.auditLog.count({ where: day }),
      prisma.auditLog.count({ where: { ...day, action: 'USER_LOGIN_FAILED' } }),
      prisma.auditLog.count({ where: { ...day, outcome: 'DENIED' } }),
      prisma.auditLog.count({ where: { createdAt: { gte: since(24 * 7) }, severity: 'CRITICAL' } }),
      prisma.auditLog.findMany({ where: { ...day, userId: { not: null } }, distinct: ['userId'], select: { userId: true } }),
      prisma.auditLog.groupBy({ by: ['category'], where: { createdAt: { gte: since(24 * 7) } }, _count: { _all: true } })
    ]);
    return res.json({
      events24h,
      failedLogins24h,
      denied24h,
      critical7d,
      activeActors24h: activeActors24h.length,
      byCategory: Object.fromEntries(byCategory.map((row) => [row.category, row._count._all]))
    });
  } catch (error) {
    console.error('Audit summary error:', error);
    return res.status(500).json({ error: 'Failed to build the audit summary.' });
  }
}

/** GET /admin/audit-logs/facets - values for the filter drop-downs. */
async function getAuditFacets(req, res) {
  try {
    const actions = await prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } });
    // Every action the system can write, plus anything found in the table (e.g. from older versions).
    const merged = [...new Set([...Object.keys(META), ...actions.map((a) => a.action)])].sort();
    return res.json({
      actions: merged.map((action) => ({ action, category: META[action]?.[0] || 'SYSTEM' })),
      categories: [...new Set(Object.values(META).map((m) => m[0]))].sort(),
      severities: SEVERITIES,
      outcomes: OUTCOMES
    });
  } catch (error) {
    console.error('Audit facets error:', error);
    return res.status(500).json({ error: 'Failed to load the audit filters.' });
  }
}

/** GET /admin/audit-logs/verify - recomputes the whole hash chain. */
async function verifyAuditLog(req, res) {
  try {
    const result = await verifyChain();
    await logAuditAction({
      action: 'AUDIT_INTEGRITY_CHECKED', targetType: 'AuditLog', targetId: '',
      outcome: result.ok ? 'SUCCESS' : 'FAILURE', severity: result.ok ? 'INFO' : 'CRITICAL',
      summary: result.ok ? `Integrity check passed (${result.checked} records)` : `INTEGRITY CHECK FAILED at record ${result.brokenAtSeq}`,
      details: result, req
    });
    return res.json(result);
  } catch (error) {
    console.error('Audit verify error:', error);
    return res.status(500).json({ error: 'The integrity check could not be completed.' });
  }
}

/**
 * POST /admin/events/export - exports are built in the browser, so the browser reports them here
 * and the server records who exported what.
 */
async function recordExport(req, res) {
  const source = ['applications', 'document-requests', 'audit-log'].includes(req.body?.source) ? req.body.source : null;
  if (!source) return res.status(400).json({ error: 'Unknown export source.' });
  if (source === 'audit-log' && !['SUPER_ADMIN', 'HR_ADMIN', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to perform this action.' });
  }
  const rows = Math.max(0, Math.min(parseInt(req.body?.rows, 10) || 0, 1000000));
  await logAuditAction({
    action: source === 'audit-log' ? 'AUDIT_LOG_EXPORTED' : 'DATA_EXPORTED',
    targetType: 'Export', targetId: source,
    summary: `Exported ${rows} row${rows === 1 ? '' : 's'} of ${source.replace('-', ' ')} to CSV`,
    details: { source, rows, filters: req.body?.filters || null }, req
  });
  return res.json({ recorded: true });
}

module.exports = { getAuditLogs, getAuditSummary, getAuditFacets, verifyAuditLog, recordExport };
