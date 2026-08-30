const prisma = require('../services/prisma');
const { logAuditAction } = require('../services/auditService');

/**
 * Submit an Interview Evaluation (Committee Member / HR Evaluator).
 */
async function submitEvaluation(req, res) {
  const { id: interviewId } = req.params;
  const evaluatorId = req.user.id;
  const {
    communication,
    technicalScore,
    experienceScore,
    domainScore,
    recommendation,
    remarks
  } = req.body;

  const cScore = parseInt(communication || 0);
  const tScore = parseInt(technicalScore || 0);
  const eScore = parseInt(experienceScore || 0);
  const dScore = parseInt(domainScore || 0);
  const totalScore = (cScore + tScore + eScore + dScore) / 4;

  if (!['RECOMMEND', 'RECOMMEND_WITH_RESERVATION', 'DO_NOT_RECOMMEND'].includes(recommendation)) {
    return res.status(400).json({ error: 'Valid recommendation (RECOMMEND, RECOMMEND_WITH_RESERVATION, DO_NOT_RECOMMEND) is required.' });
  }

  try {
    const evaluation = await prisma.evaluation.upsert({
      where: {
        interviewId_evaluatorId: {
          interviewId,
          evaluatorId
        }
      },
      update: {
        communication: cScore,
        technicalScore: tScore,
        experienceScore: eScore,
        domainScore: dScore,
        totalScore,
        recommendation,
        remarks: remarks || ''
      },
      create: {
        interviewId,
        evaluatorId,
        communication: cScore,
        technicalScore: tScore,
        experienceScore: eScore,
        domainScore: dScore,
        totalScore,
        recommendation,
        remarks: remarks || ''
      }
    });

    await logAuditAction({
      action: 'EVALUATION_SUBMITTED',
      userId: evaluatorId,
      targetType: 'Evaluation',
      targetId: evaluation.id,
      details: { interviewId, recommendation, totalScore },
      req
    });

    return res.status(201).json({ message: 'Evaluation submitted successfully.', evaluation });
  } catch (error) {
    console.error('Submit evaluation error:', error);
    return res.status(500).json({ error: 'Failed to submit evaluation.' });
  }
}

/**
 * Get Evaluation forms for an interview (HR / Admin / Committee).
 */
async function getEvaluationsByInterview(req, res) {
  const { id: interviewId } = req.params;

  try {
    const evaluations = await prisma.evaluation.findMany({
      where: { interviewId },
      include: {
        evaluator: {
          select: { id: true, email: true, role: true }
        }
      }
    });

    return res.json(evaluations);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve evaluations.' });
  }
}

/**
 * Update an evaluation.
 */
async function updateEvaluation(req, res) {
  const { id } = req.params;
  const data = req.body;

  try {
    const evaluation = await prisma.evaluation.findUnique({ where: { id } });
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found.' });
    }

    if (evaluation.evaluatorId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const editable = ['communication', 'technicalScore', 'experienceScore', 'domainScore', 'recommendation', 'remarks'];
    const updateData = {};
    for (const key of editable) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    ['communication', 'technicalScore', 'experienceScore', 'domainScore'].forEach((k) => {
      if (updateData[k] !== undefined) updateData[k] = parseInt(updateData[k]) || 0;
    });
    if (['communication', 'technicalScore', 'experienceScore', 'domainScore'].some((k) => updateData[k] !== undefined)) {
      const merged = { ...evaluation, ...updateData };
      updateData.totalScore =
        (merged.communication + merged.technicalScore + merged.experienceScore + merged.domainScore) / 4;
    }

    const updated = await prisma.evaluation.update({
      where: { id },
      data: updateData
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
