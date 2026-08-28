const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');
const evaluationController = require('../controllers/evaluationController');
const { authenticate, requireAdmin, requireCommitteeMember } = require('../middleware/authMiddleware');

// Interview Management Endpoints
router.get('/calendar', authenticate, interviewController.getInterviewCalendar);
router.get('/', authenticate, interviewController.getAllInterviews);
router.post('/', authenticate, requireAdmin, interviewController.createInterview);

router.get('/:id', authenticate, interviewController.getInterviewById);
router.put('/:id', authenticate, requireAdmin, interviewController.updateInterview);
router.delete('/:id', authenticate, requireAdmin, interviewController.deleteInterview);
router.post('/:id/panel', authenticate, requireAdmin, interviewController.assignPanelMembers);

// Interview Evaluations
router.post('/:id/evaluation', authenticate, requireCommitteeMember, evaluationController.submitEvaluation);
router.get('/:id/evaluation', authenticate, requireCommitteeMember, evaluationController.getEvaluationsByInterview);
router.put('/evaluations/:id', authenticate, requireCommitteeMember, evaluationController.updateEvaluation);

module.exports = router;
