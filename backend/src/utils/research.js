/**
 * Helpers for the "research" section of an application (Ph.D. details, publications, eligibility tests).
 * Shared by the PDF dossier, the confirmation e-mail and server-side validation.
 */

const PHD_DETAIL_STATUSES = ['Awarded', 'Thesis Submitted', 'Pursuing'];

/** NET / SET / SLET / GATE are stored as { cleared: 'Yes'|'No', year } (older drafts used 'Yes' or booleans). */
function examResult(value) {
  if (value && typeof value === 'object') {
    const cleared = value.cleared === 'Yes' || value.cleared === true;
    return { cleared, year: value.year || '' };
  }
  return { cleared: value === 'Yes' || value === true, year: '' };
}

function examText(value) {
  const { cleared, year } = examResult(value);
  if (!cleared) return 'Not cleared';
  return year ? `Cleared (${year})` : 'Cleared';
}

function formatDay(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Ordered [label, value] pairs describing the Ph.D., only for fields that apply to the status.
 */
function phdRows(research = {}) {
  const status = research.phdStatus;
  const rows = [['Ph.D. Status', status && status !== 'Select' ? status : 'Not provided']];
  if (!PHD_DETAIL_STATUSES.includes(status)) return rows;

  const place = [research.phdCity, research.phdCountry].filter(Boolean).join(', ');
  rows.push(
    ['Ph.D. Subject / Field', research.phdSpecialization || research.phdSubject],
    ['University / Institute', research.phdUniversity],
    ['Department / Centre', research.phdDepartment],
    ['Research Area', research.phdSpecialization || research.phdSubject],
    ['Location', place],
    ['Mode of Study', research.phdMode],
    ['UGC-recognised University', research.phdUgcRecognised],
    ['Fellowship', research.phdFellowship && research.phdFellowship !== 'None' ? research.phdFellowship : ''],
    ['Year of Registration', research.phdRegistrationYear],
    [status === 'Pursuing' ? 'Working Thesis Title' : 'Thesis Title', research.phdThesisTitle],
    ['Supervisor / Guide', [research.phdSupervisor, research.phdSupervisorDesignation].filter(Boolean).join(' — ')]
  );
  if (status === 'Pursuing') rows.push(['Expected Completion', research.phdExpectedYear]);
  if (status !== 'Pursuing') rows.push(['Thesis Submitted On', formatDay(research.phdSubmissionDate)]);
  if (status === 'Awarded') {
    rows.push(
      ['Viva-Voce Date', formatDay(research.phdVivaDate)],
      ['Year of Award', research.phdYear],
      ['Degree / Certificate No.', research.phdCertificateNo]
    );
  }
  return rows.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
}

/**
 * Returns an error message when the Ph.D. section is incomplete, otherwise null.
 * `requireStatus` is true for teaching vacancies (the status must be chosen).
 */
function validateResearch(research, { requireStatus = false } = {}) {
  const r = research || {};
  const status = r.phdStatus;
  const thisYear = new Date().getFullYear();
  const isYear = (v) => /^(19|20)\d{2}$/.test(String(v ?? '').trim());

  if (!status || status === 'Select') {
    return requireStatus ? 'Please select your Ph.D. status.' : null;
  }
  if (!PHD_DETAIL_STATUSES.includes(status)) return null;

  const required = {
    phdUniversity: 'university / institute',
    phdDepartment: 'department / centre',
    phdSpecialization: 'research area',
    phdCity: 'city',
    phdCountry: 'country',
    phdRegistrationYear: 'year of registration',
    phdThesisTitle: 'thesis title',
    phdSupervisor: 'supervisor name'
  };
  if (status === 'Thesis Submitted') required.phdSubmissionDate = 'thesis submission date';
  if (status === 'Awarded') required.phdYear = 'year of award';

  const missing = Object.entries(required).filter(([key]) => !String(r[key] ?? '').trim()).map(([, label]) => label);
  if (missing.length) return `Ph.D. details are incomplete: ${missing.join(', ')}.`;

  if (!isYear(r.phdRegistrationYear) || Number(r.phdRegistrationYear) > thisYear) {
    return 'The Ph.D. registration year is not valid.';
  }
  if (status === 'Awarded') {
    if (!isYear(r.phdYear) || Number(r.phdYear) > thisYear) return 'The Ph.D. award year is not valid.';
    if (Number(r.phdYear) < Number(r.phdRegistrationYear)) return 'The Ph.D. award year cannot be earlier than the registration year.';
  }
  return null;
}

module.exports = { PHD_DETAIL_STATUSES, examResult, examText, phdRows, validateResearch, formatDay };
