const express = require('express');
const router = express.Router();
const committeeController = require('../controllers/committeeController');
const { authenticate, requireCommitteeMember } = require('../middleware/authMiddleware');

// Committee Member specific routes
router.get('/assignments', authenticate, requireCommitteeMember, committeeController.getCommitteeAssignments);
router.get('/candidates', authenticate, requireCommitteeMember, committeeController.getCommitteeAssignments);
router.get('/candidates/:id', authenticate, requireCommitteeMember, committeeController.getCommitteeCandidateById);

module.exports = router;
