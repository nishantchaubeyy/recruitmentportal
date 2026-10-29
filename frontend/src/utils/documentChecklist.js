// Prefill logic for "Request Documents": what to ask a given candidate for, based on their own application.
import { statusLabel } from './status';

// Documents can be requested from candidates at these stages (the server enforces the same list).
export const DOCUMENT_REQUEST_STATUSES = ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'WAITLISTED', 'SELECTED'];

const parse = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

/** Everything the panel shows about the candidate, taken from the application record. */
export function candidateSummary(app) {
  const personal = parse(app?.personalInfo, {});
  const contact = parse(app?.contactDetails, {});
  const fullName = [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ').trim();
  return {
    applicantId: app?.applicantId || app?.applicant?.id || '',
    name: fullName || app?.applicant?.name || '',
    email: app?.applicant?.user?.email || contact.email || personal.email || '',
    mobile: app?.applicant?.mobile || contact.mobile || '',
    applicationNumber: app?.applicationNumber || '',
    position: app?.job?.position || '',
    department: app?.job?.school?.name || app?.job?.department || '',
    status: app?.status || '',
    statusText: statusLabel(app?.status)
  };
}

function experienceRows(app) {
  const raw = parse(app?.experience, []);
  const rows = Array.isArray(raw) ? raw : (raw?.isFresher ? [] : (Array.isArray(raw?.records) ? raw.records : []));
  return rows.filter((row) => row && (row.organization || row.designation));
}

/**
 * Suggested checklist for this candidate: [{ name, type, isMandatory }].
 * `catalog` is the server's standard list ([{ name, type, isMandatory }]).
 */
export function suggestChecklist(app, catalog) {
  const byType = new Map((catalog || []).map((entry) => [entry.type, entry]));
  const qualifications = parse(app?.qualifications, []);
  const levels = new Set((Array.isArray(qualifications) ? qualifications : []).map((q) => q.qualificationDegree));
  const degreeNameOf = (level) => (Array.isArray(qualifications) ? qualifications.find((q) => q.qualificationDegree === level)?.degreeName : '') || '';
  const phdStatus = parse(app?.researchDetails, {}).phdStatus;
  const experience = experienceRows(app);
  const hasCurrentJob = experience.some((row) => row.isCurrent);
  const hasPastJob = experience.some((row) => !row.isCurrent);
  const hasResume = (app?.documents || []).some((doc) => doc.documentType === 'resume');
  const selected = app?.status === 'SELECTED';

  const wanted = [];
  const add = (type, suffix = '') => {
    const entry = byType.get(type);
    if (!entry || wanted.some((w) => w.type === type)) return;
    wanted.push({ name: suffix ? `${entry.name} (${suffix})` : entry.name, type, isMandatory: Boolean(entry.isMandatory) });
  };

  if (!hasResume) add('RESUME');
  if (levels.has('SSC')) add('10TH_MARKSHEET');
  if (levels.has('HSC')) add('12TH_MARKSHEET');
  if (levels.has("Bachelor's")) add('GRADUATION', degreeNameOf("Bachelor's"));
  if (levels.has("Master's")) add('POST_GRADUATION', degreeNameOf("Master's"));
  if (['Awarded', 'Thesis Submitted', 'Pursuing'].includes(phdStatus)) add('PHD_CERTIFICATE');
  if (experience.length > 0) add('EXPERIENCE_LETTER');
  if (hasPastJob) add('RELIEVING_LETTER');
  if (hasCurrentJob) add('SALARY_SLIP');
  add('PAN_CARD');
  add('AADHAR_CARD');
  add('PHOTO');
  if (selected) {
    // Joining formalities only make sense once the candidate has been selected.
    add('BANK_PROOF');
    add('ADDRESS_PROOF');
  }
  return wanted;
}

/** Default message to the candidate, written for the stage the application is at. */
export function suggestMessage(summary) {
  const name = summary.name || 'Candidate';
  const post = summary.position ? ` for the post of ${summary.position}` : '';
  const unit = summary.department ? ` in ${summary.department}` : '';
  const opening = summary.status === 'SELECTED'
    ? `Congratulations on being selected${post}${unit}.`
    : `Thank you for applying${post}${unit}. Your application has progressed to the next stage.`;
  return `Dear ${name},\n${opening} To complete verification, please upload clear scans of the original documents listed below before the deadline. Documents marked optional can be skipped if they do not apply to you.`;
}

export function defaultDeadline(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
