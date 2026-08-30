// ============================================================
// Roles & post-login routing helpers
// ============================================================

export const STAFF_ROLES = ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN', 'COMMITTEE_MEMBER'];
export const ADMIN_ROLES = ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN'];

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

/** Where a user should land after authenticating. */
export function homePathForRole(role) {
  if (role === 'COMMITTEE_MEMBER') return '/committee/dashboard';
  if (ADMIN_ROLES.includes(role)) return '/admin/dashboard';
  return '/applicant/dashboard';
}

// ============================================================
// Canonical application-status vocabulary (mirrors the backend).
// The API always uses these MACHINE values; the UI shows the labels.
// ============================================================

export const APPLICATION_STATUS = {
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

// Machine value -> human label
export const STATUS_LABEL = {
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

/**
 * Return a human label for a status. Tolerates legacy human-readable values
 * that may already be labels (returns them unchanged).
 */
export function statusLabel(value) {
  if (!value) return '—';
  return STATUS_LABEL[value] || value;
}

// Options for the HR status-change dropdown (excludes DRAFT / WITHDRAWN).
export const HR_STATUS_OPTIONS = [
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.SHORTLISTED,
  APPLICATION_STATUS.INTERVIEW_SCHEDULED,
  APPLICATION_STATUS.SELECTED,
  APPLICATION_STATUS.WAITLISTED,
  APPLICATION_STATUS.REJECTED,
  APPLICATION_STATUS.CLOSED
].map((value) => ({ value, label: STATUS_LABEL[value] }));

// Tabs for the screening list.
export const STATUS_TABS = [
  { key: 'ALL', label: 'All Applications' },
  { key: APPLICATION_STATUS.SUBMITTED, label: 'Submitted' },
  { key: APPLICATION_STATUS.UNDER_REVIEW, label: 'Under Review' },
  { key: APPLICATION_STATUS.SHORTLISTED, label: 'Shortlisted' },
  { key: APPLICATION_STATUS.INTERVIEW_SCHEDULED, label: 'Interview' },
  { key: APPLICATION_STATUS.SELECTED, label: 'Selected' },
  { key: APPLICATION_STATUS.REJECTED, label: 'Rejected' }
];

/**
 * Map a status to the CSS badge class used across the applicant/track pages.
 */
export function statusBadgeClass(status) {
  switch (status) {
    case APPLICATION_STATUS.SUBMITTED: return 'status-submitted';
    case APPLICATION_STATUS.UNDER_REVIEW: return 'status-under-review';
    case APPLICATION_STATUS.SHORTLISTED: return 'status-shortlisted';
    case APPLICATION_STATUS.INTERVIEW_SCHEDULED: return 'status-interview';
    case APPLICATION_STATUS.SELECTED: return 'status-selected';
    case APPLICATION_STATUS.WAITLISTED: return 'status-waitlisted';
    case APPLICATION_STATUS.REJECTED: return 'status-not-selected';
    case APPLICATION_STATUS.CLOSED: return 'status-closed';
    case APPLICATION_STATUS.WITHDRAWN: return 'status-not-selected';
    default: return 'status-submitted';
  }
}

/**
 * Progression step (1-5) for the tracker timeline.
 */
export function statusStageStep(status) {
  switch (status) {
    case APPLICATION_STATUS.SUBMITTED: return 1;
    case APPLICATION_STATUS.UNDER_REVIEW: return 2;
    case APPLICATION_STATUS.SHORTLISTED: return 3;
    case APPLICATION_STATUS.INTERVIEW_SCHEDULED: return 4;
    case APPLICATION_STATUS.SELECTED:
    case APPLICATION_STATUS.REJECTED:
    case APPLICATION_STATUS.CLOSED:
    case APPLICATION_STATUS.WAITLISTED:
      return 5;
    default: return 1;
  }
}

/**
 * Badge colour set for a status (works for machine values and legacy labels).
 */
export function statusBadgeStyle(status) {
  switch (status) {
    case APPLICATION_STATUS.SELECTED:
    case 'Selected':
    case APPLICATION_STATUS.SHORTLISTED:
    case 'Shortlisted':
      return { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' };
    case APPLICATION_STATUS.INTERVIEW_SCHEDULED:
    case 'Interview Scheduled':
      return { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE' };
    case APPLICATION_STATUS.UNDER_REVIEW:
    case 'Under Review':
    case APPLICATION_STATUS.WAITLISTED:
    case 'Waitlisted':
      return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
    case APPLICATION_STATUS.REJECTED:
    case 'Not Selected':
    case APPLICATION_STATUS.CLOSED:
    case 'Application Closed':
    case APPLICATION_STATUS.WITHDRAWN:
    case 'Withdrawn':
      return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
    default:
      return { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };
  }
}
