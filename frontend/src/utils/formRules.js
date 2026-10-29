// ============================================================
// Rules that make the application form dynamic.
// Pure functions only (no React), so the same logic drives the screen, the validation and the tests.
// The server re-validates everything (backend/src/utils/research.js, applicationController.js).
// ============================================================

const THIS_YEAR = () => new Date().getFullYear();

// ── Academic qualifications ─────────────────────────────────

const STREAMS = ['Science', 'Commerce', 'Arts / Humanities', 'Vocational', 'Other'];

/**
 * Which fields each qualification level really has.
 *   nameFixed      the degree name is implied by the level (SSC / HSC) and is not typed
 *   instituteLabel "Board" for school levels, "University" for degrees
 *   specialization null = field does not exist for this level; otherwise { label, options?, required }
 *   mode           show full-time / part-time / distance
 */
export const QUALIFICATION_LEVELS = {
  SSC: {
    label: 'SSC (10th)',
    nameFixed: 'SSC (10th)',
    instituteLabel: 'Board',
    institutePlaceholder: 'e.g. Maharashtra State Board / CBSE / ICSE',
    specialization: null,
    resultLabel: 'Percentage / CGPA',
    mode: false,
    minYear: 1960
  },
  HSC: {
    label: 'HSC (12th)',
    nameFixed: 'HSC (12th)',
    instituteLabel: 'Board',
    institutePlaceholder: 'e.g. Maharashtra State Board / CBSE / ISC',
    specialization: { label: 'Stream', options: STREAMS, required: true },
    resultLabel: 'Percentage / CGPA',
    mode: false,
    minYear: 1960
  },
  Diploma: {
    label: 'Diploma',
    nameLabel: 'Diploma',
    namePlaceholder: 'e.g. Diploma in Mechanical Engineering',
    instituteLabel: 'Institute / Board',
    institutePlaceholder: 'Institute or technical board',
    specialization: { label: 'Branch', placeholder: 'e.g. Mechanical', required: false },
    resultLabel: 'Percentage / CGPA',
    mode: true,
    minYear: 1960
  },
  "Bachelor's": {
    label: "Bachelor's degree",
    nameLabel: 'Degree',
    namePlaceholder: 'e.g. B.Tech / B.Com / B.Sc',
    instituteLabel: 'University',
    institutePlaceholder: 'University name',
    specialization: { label: 'Specialization', placeholder: 'e.g. Computer Science', required: false },
    resultLabel: 'CGPA / Percentage',
    mode: true,
    minYear: 1960
  },
  "Master's": {
    label: "Master's degree",
    nameLabel: 'Degree',
    namePlaceholder: 'e.g. M.Tech / MBA / M.Sc',
    instituteLabel: 'University',
    institutePlaceholder: 'University name',
    specialization: { label: 'Specialization', placeholder: 'e.g. Data Science', required: false },
    resultLabel: 'CGPA / Percentage',
    mode: true,
    minYear: 1960
  },
  Other: {
    label: 'Other',
    nameLabel: 'Qualification',
    namePlaceholder: 'e.g. Post-graduate certificate',
    instituteLabel: 'Institution / Board',
    institutePlaceholder: 'Institution name',
    specialization: { label: 'Subject', placeholder: 'Subject / field', required: false },
    resultLabel: 'CGPA / Percentage',
    mode: true,
    minYear: 1960
  }
};

// Ph.D. is captured in its own step (with the thesis and supervisor details), not as a qualification row.
export const QUALIFICATION_LEVEL_KEYS = Object.keys(QUALIFICATION_LEVELS);

export function qualificationRule(level) {
  return QUALIFICATION_LEVELS[level] || QUALIFICATION_LEVELS.Other;
}

export function blankQualification(level = '') {
  return normaliseQualification({
    qualificationDegree: level,
    degreeName: '',
    instituteName: '',
    specialization: '',
    passingYear: '',
    cgpa: '',
    studyMode: ''
  });
}

/**
 * Resets the fields that do not exist for the row's level, so nothing hidden is submitted
 * (e.g. a Ph.D./Bachelor's specialization left behind after switching a row to SSC).
 */
export function normaliseQualification(q) {
  const rule = QUALIFICATION_LEVELS[q.qualificationDegree];
  if (!rule) return { ...q };
  const next = { ...q };
  next.degreeName = rule.nameFixed || (next.degreeName === 'SSC (10th)' || next.degreeName === 'HSC (12th)' || next.degreeName === 'SSC' || next.degreeName === 'HSC' ? '' : next.degreeName);
  if (!rule.specialization) next.specialization = '';
  else if (rule.specialization.options && !rule.specialization.options.includes(next.specialization)) next.specialization = '';
  next.studyMode = rule.mode ? (next.studyMode || 'Full-Time') : '';
  return next;
}

/** Applies a single field edit with the per-field cleaning rules (digits only for the year, etc.). */
export function applyQualificationEdit(q, field, value) {
  if (field === 'qualificationDegree') return normaliseQualification({ ...q, qualificationDegree: value });
  if (field === 'passingYear') return { ...q, passingYear: String(value).replace(/\D/g, '').slice(0, 4) };
  if (field === 'cgpa') {
    let clean = String(value).replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 1) clean = `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
    if (parseFloat(clean) > 100) clean = '100';
    return { ...q, cgpa: clean };
  }
  return { ...q, [field]: value };
}

/** True when a row has been touched at all (an untouched blank row is simply ignored). */
export function qualificationStarted(q) {
  const typedName = Boolean(q.degreeName) && !qualificationRule(q.qualificationDegree).nameFixed;
  return Boolean(q.instituteName || typedName || q.specialization || q.passingYear || q.cgpa);
}

/** Error message for one qualification row, or null. `n` is the 1-based row number for the message. */
export function validateQualification(q, n) {
  const rule = QUALIFICATION_LEVELS[q.qualificationDegree];
  if (!rule) return `Qualification #${n}: please choose the level (SSC, HSC, Diploma, ...).`;
  const where = `${rule.label} (row ${n})`;
  const missing = [];
  if (!rule.nameFixed && !String(q.degreeName || '').trim()) missing.push(rule.nameLabel.toLowerCase());
  if (!String(q.instituteName || '').trim()) missing.push(rule.instituteLabel.toLowerCase());
  if (rule.specialization?.required && !String(q.specialization || '').trim()) missing.push(rule.specialization.label.toLowerCase());
  if (!String(q.passingYear || '').trim()) missing.push('year of passing');
  if (!String(q.cgpa || '').trim()) missing.push(rule.resultLabel.toLowerCase());
  if (missing.length) return `${where}: please fill in ${missing.join(', ')}.`;

  if (!/^\d{4}$/.test(String(q.passingYear))) return `${where}: the year of passing must be a 4-digit year such as 2020.`;
  const year = Number(q.passingYear);
  if (year < rule.minYear || year > THIS_YEAR() + 2) return `${where}: the year of passing must be between ${rule.minYear} and ${THIS_YEAR() + 2}.`;
  const score = Number(q.cgpa);
  if (!Number.isFinite(score) || score < 0 || score > 100) return `${where}: ${rule.resultLabel.toLowerCase()} must be a number between 0 and 100.`;
  return null;
}

/** Validates the whole qualification list; at least one completed row is required. */
export function validateQualifications(rows) {
  const started = rows.map((q, i) => ({ q, i })).filter(({ q }) => qualificationStarted(q));
  if (started.length === 0) return 'Please add at least one academic qualification.';
  for (const { q, i } of started) {
    const message = validateQualification(q, i + 1);
    if (message) return message;
  }
  // The same level twice is almost always a mistake, except for the free-form ones.
  const seen = new Set();
  for (const { q } of started) {
    if (['SSC', 'HSC'].includes(q.qualificationDegree)) {
      if (seen.has(q.qualificationDegree)) return `${qualificationRule(q.qualificationDegree).label} has been entered twice.`;
      seen.add(q.qualificationDegree);
    }
  }
  return null;
}

/** Rows that are blank are dropped before saving/submitting. */
export function cleanQualifications(rows) {
  return rows.filter(qualificationStarted).map(normaliseQualification);
}

// ── Ph.D. ───────────────────────────────────────────────────

export const PHD_STATUSES = ['Awarded', 'Thesis Submitted', 'Pursuing', 'Not Applicable'];

export const PHD_BLANK = {
  phdUniversity: '', phdDepartment: '', phdSpecialization: '', phdCity: '', phdCountry: 'India',
  phdMode: '', phdUgcRecognised: '', phdFellowship: '', phdRegistrationYear: '', phdThesisTitle: '',
  phdSupervisor: '', phdSupervisorDesignation: '', phdExpectedYear: '', phdSubmissionDate: '',
  phdVivaDate: '', phdYear: '', phdCertificateNo: ''
};

/**
 * Field groups that apply to a Ph.D. status. "Not Applicable" (or nothing chosen) shows none.
 * `required` mirrors validateResearch() on the server.
 */
export function phdFieldsFor(status) {
  if (!['Awarded', 'Thesis Submitted', 'Pursuing'].includes(status)) return { visible: [], required: [] };
  const base = ['phdUniversity', 'phdDepartment', 'phdSpecialization', 'phdCity', 'phdCountry', 'phdMode',
    'phdUgcRecognised', 'phdFellowship', 'phdRegistrationYear', 'phdThesisTitle', 'phdSupervisor', 'phdSupervisorDesignation'];
  const required = ['phdUniversity', 'phdDepartment', 'phdSpecialization', 'phdCity', 'phdCountry',
    'phdRegistrationYear', 'phdThesisTitle', 'phdSupervisor'];
  const visible = [...base];
  if (status === 'Pursuing') visible.push('phdExpectedYear');
  if (status === 'Thesis Submitted') {
    visible.push('phdSubmissionDate');
    required.push('phdSubmissionDate');
  }
  if (status === 'Awarded') {
    visible.push('phdSubmissionDate', 'phdVivaDate', 'phdYear', 'phdCertificateNo');
    required.push('phdYear');
  }
  return { visible, required };
}

export const PHD_LABELS = {
  phdUniversity: 'University / Institute',
  phdDepartment: 'Department / Centre',
  phdSpecialization: 'Research Area / Subject',
  phdCity: 'City',
  phdCountry: 'Country',
  phdMode: 'Mode of Study',
  phdUgcRecognised: 'UGC-recognised University',
  phdFellowship: 'Fellowship',
  phdRegistrationYear: 'Year of Registration',
  phdThesisTitle: 'Thesis Title',
  phdSupervisor: 'Supervisor / Guide',
  phdSupervisorDesignation: 'Supervisor Designation',
  phdExpectedYear: 'Expected Year of Completion',
  phdSubmissionDate: 'Thesis Submission Date',
  phdVivaDate: 'Viva-Voce Date',
  phdYear: 'Year of Award',
  phdCertificateNo: 'Degree / Certificate No.'
};

/** The Ph.D. object to store: only the fields that apply to the chosen status, nothing stale. */
export function buildPhd(status, values) {
  const out = { phdStatus: status || '' };
  const { visible } = phdFieldsFor(status);
  visible.forEach((key) => { out[key] = String(values[key] ?? '').trim(); });
  if (visible.includes('phdSpecialization')) out.phdSubject = out.phdSpecialization;
  return out;
}

export function validatePhd(status, values, { requireStatus = false } = {}) {
  if (!status) return requireStatus ? 'Please select your Ph.D. status (choose "Not Applicable" if you do not have one).' : null;
  const { required, visible } = phdFieldsFor(status);
  if (visible.length === 0) return null; // "Not Applicable": nothing to validate
  const missing = required.filter((key) => !String(values[key] ?? '').trim()).map((key) => PHD_LABELS[key].toLowerCase());
  if (missing.length) return `Ph.D. details are incomplete: ${missing.join(', ')}.`;

  const isYear = (v) => /^(19|20)\d{2}$/.test(String(v).trim());
  if (!isYear(values.phdRegistrationYear) || Number(values.phdRegistrationYear) > THIS_YEAR()) {
    return 'The Ph.D. year of registration is not a valid year.';
  }
  if (status === 'Awarded') {
    if (!isYear(values.phdYear) || Number(values.phdYear) > THIS_YEAR()) return 'The Ph.D. year of award is not a valid year.';
    if (Number(values.phdYear) < Number(values.phdRegistrationYear)) return 'The Ph.D. cannot be awarded before it was registered.';
  }
  if (status === 'Pursuing' && values.phdExpectedYear && (!isYear(values.phdExpectedYear) || Number(values.phdExpectedYear) < Number(values.phdRegistrationYear))) {
    return 'The expected year of completion is not valid.';
  }
  return null;
}

// ── Research outputs and eligibility tests ──────────────────

/** Eligibility tests (NET/SET/SLET/GATE) and publications matter for teaching posts only. */
export function showsResearchOutputs(jobType) {
  return jobType !== 'NON_TEACHING';
}

export function validateCount(value, label) {
  if (value === '' || value === undefined || value === null) return null;
  if (!/^\d{1,4}$/.test(String(value))) return `${label} must be a whole number (0 or more).`;
  return null;
}

/** Exam block { cleared: 'Yes'|'No', year } - the year only exists (and is required) when cleared. */
export function normaliseExam(exam) {
  if (!exam || exam.cleared !== 'Yes') return { cleared: 'No', year: '' };
  return { cleared: 'Yes', year: String(exam.year || '').trim() };
}

export function validateExam(name, exam) {
  if (!exam || exam.cleared !== 'Yes') return null;
  if (!/^(19|20)\d{2}$/.test(String(exam.year || '').trim()) || Number(exam.year) > THIS_YEAR()) {
    return `Please enter the year in which you cleared ${name}.`;
  }
  return null;
}

// ── Personal / contact ──────────────────────────────────────

export function ageOn(dob, today = new Date()) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
}

export function validatePersonal({ postAppliedFor, title, firstName, lastName, dob, gender, maritalStatus }) {
  if (!postAppliedFor) return 'Please select the post you are applying for.';
  if (!title) return 'Please select your title.';
  if (!String(firstName || '').trim() || !String(lastName || '').trim()) return 'First name and last name are required.';
  if (!dob) return 'Please enter a complete date of birth.';
  const age = ageOn(dob);
  if (age === null) return 'The date of birth is not a valid date.';
  if (age < 18) return 'Applicants must be at least 18 years old.';
  if (age > 80) return 'Please check the date of birth.';
  if (!gender) return 'Please select your gender.';
  if (!maritalStatus) return 'Please select your marital status.';
  return null;
}

export function validateContact({ mobile, alternateMobile, pinCode, city, state }) {
  if (!/^[6-9]\d{9}$/.test(String(mobile || ''))) return 'Enter a valid 10-digit Indian mobile number (it starts with 6, 7, 8 or 9).';
  if (alternateMobile && !/^[6-9]\d{9}$/.test(String(alternateMobile))) return 'The alternate mobile number must be a valid 10-digit number.';
  if (!String(city || '').trim()) return 'Please enter your city.';
  if (!state) return 'Please select your state.';
  if (pinCode && !/^\d{6}$/.test(String(pinCode))) return 'The PIN code must be exactly 6 digits.';
  return null;
}

// ── Experience ──────────────────────────────────────────────

export function validateExperience(rows) {
  const started = rows.filter((r) => r.organization || r.designation || r.fromDate || r.toDate);
  if (started.length === 0) return 'Add at least one work experience, or tick "Fresher".';
  for (let i = 0; i < started.length; i += 1) {
    const r = started[i];
    if (!String(r.organization || '').trim() || !String(r.designation || '').trim()) {
      return `Experience #${i + 1}: organisation and designation are required.`;
    }
    if (!r.fromDate) return `Experience #${i + 1}: please enter the start date.`;
    if (!r.isCurrent && !r.toDate) return `Experience #${i + 1}: please enter the end date, or tick "currently working here".`;
    if (!r.isCurrent && r.toDate && new Date(r.toDate) < new Date(r.fromDate)) {
      return `Experience #${i + 1}: the end date is before the start date.`;
    }
    if (new Date(r.fromDate) > new Date()) return `Experience #${i + 1}: the start date is in the future.`;
  }
  return null;
}
