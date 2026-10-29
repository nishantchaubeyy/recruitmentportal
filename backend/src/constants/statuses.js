/**
 * Canonical status vocabularies shared across the backend.
 *
 * The database and API always use these MACHINE enum values.
 * The frontend maps them to human-readable labels for display only.
 * Never store or compare human-readable labels server-side.
 */

const APPLICATION_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  SHORTLISTED: 'SHORTLISTED',
  INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
  SELECTED: 'SELECTED',
  WAITLISTED: 'WAITLISTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
  CLOSED: 'CLOSED'
};

const APPLICATION_STATUS_VALUES = Object.values(APPLICATION_STATUS);

// Statuses an HR user is allowed to set via the status-update endpoint.
const HR_SETTABLE_STATUSES = [
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.SHORTLISTED,
  APPLICATION_STATUS.INTERVIEW_SCHEDULED,
  APPLICATION_STATUS.SELECTED,
  APPLICATION_STATUS.WAITLISTED,
  APPLICATION_STATUS.REJECTED,
  APPLICATION_STATUS.CLOSED
];

// Buckets used by reporting.
const REPORT_BUCKETS = {
  shortlisted: [
    APPLICATION_STATUS.SHORTLISTED,
    APPLICATION_STATUS.INTERVIEW_SCHEDULED,
    APPLICATION_STATUS.SELECTED
  ],
  rejected: [APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.CLOSED],
  underReview: [
    APPLICATION_STATUS.SUBMITTED,
    APPLICATION_STATUS.UNDER_REVIEW,
    APPLICATION_STATUS.WAITLISTED
  ]
};

// Legal workflow transitions. Terminal states (WITHDRAWN) cannot be changed by staff.
const STATUS_TRANSITIONS = {
  [APPLICATION_STATUS.SUBMITTED]: ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'CLOSED'],
  [APPLICATION_STATUS.UNDER_REVIEW]: ['SHORTLISTED', 'WAITLISTED', 'REJECTED', 'CLOSED'],
  [APPLICATION_STATUS.SHORTLISTED]: ['UNDER_REVIEW', 'INTERVIEW_SCHEDULED', 'WAITLISTED', 'REJECTED', 'CLOSED'],
  [APPLICATION_STATUS.INTERVIEW_SCHEDULED]: ['SHORTLISTED', 'SELECTED', 'WAITLISTED', 'REJECTED', 'CLOSED'],
  [APPLICATION_STATUS.WAITLISTED]: ['UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'CLOSED'],
  [APPLICATION_STATUS.SELECTED]: ['REJECTED', 'CLOSED'],
  [APPLICATION_STATUS.REJECTED]: ['UNDER_REVIEW'],
  [APPLICATION_STATUS.CLOSED]: ['UNDER_REVIEW']
};

// Final hiring decisions are reserved for senior HR roles.
const DECISION_STATUSES = [APPLICATION_STATUS.SELECTED];

// Statuses an applicant may withdraw from.
const WITHDRAWABLE_STATUSES = [
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.SHORTLISTED,
  APPLICATION_STATUS.INTERVIEW_SCHEDULED,
  APPLICATION_STATUS.WAITLISTED
];

// Human-readable values written by older versions of the portal.
const LEGACY_STATUS_ALIASES = {
  SUBMITTED: ['SUBMITTED', 'Application Submitted'],
  UNDER_REVIEW: ['UNDER_REVIEW', 'Under Review'],
  SHORTLISTED: ['SHORTLISTED', 'Shortlisted'],
  INTERVIEW_SCHEDULED: ['INTERVIEW_SCHEDULED', 'INTERVIEW', 'Interview Scheduled'],
  SELECTED: ['SELECTED', 'Selected'],
  REJECTED: ['REJECTED', 'Not Selected']
};

// Wording shown to candidates (e-mails, notifications) - never the raw enum value.
const STATUS_LABELS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Application Submitted',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW_SCHEDULED: 'Interview Scheduled',
  SELECTED: 'Selected',
  WAITLISTED: 'Waitlisted',
  REJECTED: 'Not Selected',
  WITHDRAWN: 'Withdrawn',
  CLOSED: 'Application Closed'
};

// What the candidate should expect next.
const STATUS_NEXT_STEP = {
  SUBMITTED: 'We have received your application. The recruitment cell will begin screening shortly.',
  UNDER_REVIEW: 'Your application is being reviewed by the recruitment cell. No action is needed from you right now.',
  SHORTLISTED: 'Congratulations - you have been shortlisted. Please keep an eye on your e-mail and dashboard for interview and document-verification instructions.',
  INTERVIEW_SCHEDULED: 'Your interview has been scheduled. Open your dashboard for the date, time and meeting details.',
  SELECTED: 'Congratulations - you have been selected. The recruitment cell will contact you with the next steps and joining formalities.',
  WAITLISTED: 'You are on the waiting list. We will contact you if a position becomes available.',
  REJECTED: 'Thank you for your interest in D Y Patil International University. We regret that we are unable to take your application forward at this time.',
  WITHDRAWN: 'Your application has been withdrawn.',
  CLOSED: 'This application has been closed. Please contact the recruitment cell if you have questions.'
};

const JOB_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED'
};

const JOB_STATUS_VALUES = Object.values(JOB_STATUS);

module.exports = {
  APPLICATION_STATUS,
  APPLICATION_STATUS_VALUES,
  HR_SETTABLE_STATUSES,
  STATUS_TRANSITIONS,
  STATUS_LABELS,
  STATUS_NEXT_STEP,
  DECISION_STATUSES,
  WITHDRAWABLE_STATUSES,
  LEGACY_STATUS_ALIASES,
  REPORT_BUCKETS,
  JOB_STATUS,
  JOB_STATUS_VALUES
};
