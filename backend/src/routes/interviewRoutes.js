const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');
const evaluationController = require('../controllers/evaluationController');
const { authenticate, requireAdmin, requireCommitteeMember, requireApplicant, authorize } = require('../middleware/authMiddleware');

// Candidate Portal View (My Interviews)
router.get('/my', authenticate, requireApplicant, interviewController.getMyInterviews);

// Interview Management Endpoints
router.get('/calendar', authenticate, interviewController.getInterviewCalendar);
router.get('/', authenticate, requireAdmin, interviewController.getAllInterviews);
router.post('/', authenticate, requireAdmin, interviewController.createInterview);
router.post('/panel-schedule', authenticate, requireAdmin, interviewController.scheduleInterviewWithPanel);

router.get('/:id', authenticate, authorize('COMMITTEE_MEMBER', 'SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN'), interviewController.getInterviewById);
router.put('/:id', authenticate, requireAdmin, interviewController.updateInterview);
router.delete('/:id', authenticate, requireAdmin, interviewController.deleteInterview);

// Zoom Actions: Reschedule, Cancel, Resend Email
router.post('/:id/reschedule', authenticate, requireAdmin, interviewController.rescheduleInterview);
router.post('/:id/cancel', authenticate, requireAdmin, interviewController.cancelInterview);
router.post('/:id/resend-email', authenticate, requireAdmin, interviewController.resendInterviewEmail);

router.post('/:id/panel', authenticate, requireAdmin, interviewController.assignPanelMembers);

// Interview Evaluations
router.post('/:id/evaluation', authenticate, requireCommitteeMember, evaluationController.submitEvaluation);
router.get('/:id/evaluation', authenticate, requireCommitteeMember, evaluationController.getEvaluationsByInterview);
router.put('/evaluations/:id', authenticate, requireCommitteeMember, evaluationController.updateEvaluation);

module.exports = router;
