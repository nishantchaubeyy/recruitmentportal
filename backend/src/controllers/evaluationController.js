const prisma = require('../services/prisma');
const { logAuditAction } = require('../services/auditService');
const { isAdminRole } = require('../utils/access');
const { cleanString } = require('../utils/validate');

const RECOMMENDATIONS = ['RECOMMEND', 'RECOMMEND_WITH_RESERVATION', 'DO_NOT_RECOMMEND'];
const SCORE_FIELDS = ['communication', 'technicalScore', 'experienceScore', 'domainScore'];
const MAX_SCORE = 10;

/** Parse a 0-10 integer score; returns null when invalid. */
function parseScore(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= MAX_SCORE ? n : null;
}

function averageOf(scores) {
  return Math.round((SCORE_FIELDS.reduce((sum, key) => sum + scores[key], 0) / SCORE_FIELDS.length) * 100) / 100;
}

/**
 * POST /interviews/:id/evaluation - one score sheet per panel member.
 */
async function submitEvaluation(req, res) {
  const { id: interviewId } = req.params;
  const body = req.body || {};

  const scores = {};
  for (const field of SCORE_FIELDS) {
    const parsed = parseScore(body[field]);
    if (parsed === null) {
      return res.status(400).json({ error: `"${field}" must be a whole number between 0 and ${MAX_SCORE}.` });
    }
    scores[field] = parsed;
  }
  if (!RECOMMENDATIONS.includes(body.recommendation)) {
    return res.status(400).json({ error: `Recommendation must be one of: ${RECOMMENDATIONS.join(', ')}.` });
  }

  try {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { id: true, status: true, panelMembers: { where: { userId: req.user.id }, select: { id: true } } }
    });

    // Only members of the interview panel may score it - hide existence from everyone else.
    if (!interview || interview.panelMembers.length === 0) {
      return res.status(404).json({ error: 'Interview not found.' });
    }
    if (interview.status === 'CANCELLED') {
      return res.status(409).json({ error: 'This interview was cancelled and cannot be evaluated.' });
    }

    const data = {
      ...scores,
      totalScore: averageOf(scores),
      recommendation: body.recommendation,
      remarks: cleanString(body.remarks, 3000)
    };

    const evaluation = await prisma.evaluation.upsert({
      where: { interviewId_evaluatorId: { interviewId, evaluatorId: req.user.id } },
      update: data,
      create: { interviewId, evaluatorId: req.user.id, ...data }
    });

    await logAuditAction({
      action: 'EVALUATION_SUBMITTED',
      userId: req.user.id,
      targetType: 'Evaluation',
      targetId: evaluation.id,
      details: { interviewId, recommendation: data.recommendation, totalScore: data.totalScore },
      req
    });

    return res.status(201).json({ message: 'Evaluation submitted successfully.', evaluation });
  } catch (error) {
    console.error('Submit evaluation error:', error);
    return res.status(500).json({ error: 'Failed to submit evaluation.' });
  }
}

/**
 * GET /interviews/:id/evaluation - HR sees every sheet; evaluators only their own
 * (independent scoring keeps panelists from anchoring on each other).
 */
async function getEvaluationsByInterview(req, res) {
  const { id: interviewId } = req.params;

  try {
    const where = { interviewId };
    if (!isAdminRole(req.user.role)) {
      const onPanel = await prisma.interviewPanel.findFirst({ where: { interviewId, userId: req.user.id }, select: { id: true } });
      if (!onPanel) return res.status(404).json({ error: 'Interview not found.' });
      where.evaluatorId = req.user.id;
    }

    const evaluations = await prisma.evaluation.findMany({
      where,
      include: { evaluator: { select: { id: true, email: true, role: true } } }
    });
    return res.json(evaluations);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve evaluations.' });
  }
}

/**
 * PUT /interviews/evaluations/:id - an evaluator edits only their own sheet.
 */
async function updateEvaluation(req, res) {
  const body = req.body || {};

  try {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: req.params.id },
      include: { interview: { select: { status: true } } }
    });
    if (!evaluation || evaluation.evaluatorId !== req.user.id) {
      return res.status(404).json({ error: 'Evaluation not found.' });
    }
    if (evaluation.interview.status === 'CANCELLED') {
      return res.status(409).json({ error: 'This interview was cancelled.' });
    }

    const data = {};
    for (const field of SCORE_FIELDS) {
      if (body[field] === undefined) continue;
      const parsed = parseScore(body[field]);
      if (parsed === null) return res.status(400).json({ error: `"${field}" must be a whole number between 0 and ${MAX_SCORE}.` });
      data[field] = parsed;
    }
    if (body.recommendation !== undefined) {
      if (!RECOMMENDATIONS.includes(body.recommendation)) return res.status(400).json({ error: 'Invalid recommendation.' });
      data.recommendation = body.recommendation;
    }
    if (body.remarks !== undefined) data.remarks = cleanString(body.remarks, 3000);

    if (SCORE_FIELDS.some((f) => data[f] !== undefined)) {
      data.totalScore = averageOf({ ...evaluation, ...data });
    }

    const updated = await prisma.evaluation.update({ where: { id: evaluation.id }, data });

    await logAuditAction({
      action: 'EVALUATION_UPDATED',
      userId: req.user.id,
      targetType: 'Evaluation',
      targetId: evaluation.id,
      details: { fields: Object.keys(data) },
      req
    });

    return res.json({ message: 'Evaluation updated.', evaluation: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update evaluation.' });
  }
}

module.exports = {
  submitEvaluation,
  getEvaluationsByInterview,
  updateEvaluation
};
