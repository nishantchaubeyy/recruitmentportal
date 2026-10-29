/**
 * Server-side check of the academic qualifications list. The form hides fields that do not apply to a level
 * (e.g. SSC has a board but no stream), so what is required depends on the level.
 */

const SCHOOL_LEVELS = ['SSC', 'HSC'];
const KNOWN_LEVELS = ['SSC', 'HSC', 'Diploma', "Bachelor's", "Master's", 'Other'];

function validateQualifications(list) {
  if (!Array.isArray(list)) return 'Academic qualifications are missing.';
  const thisYear = new Date().getFullYear();
  const rows = list.filter((q) => q && typeof q === 'object');
  if (rows.length === 0) return 'Please add at least one academic qualification.';

  const seenSchool = new Set();
  for (let i = 0; i < rows.length; i += 1) {
    const q = rows[i];
    const level = String(q.qualificationDegree || '').trim();
    const where = `Qualification ${i + 1}`;
    if (!level) return `${where}: the level is missing.`;
    // Older drafts may contain "Ph.D." rows; those are tolerated but not required to be complete.
    if (!KNOWN_LEVELS.includes(level)) continue;

    const isSchool = SCHOOL_LEVELS.includes(level);
    if (!isSchool && !String(q.degreeName || '').trim()) return `${where} (${level}): the degree name is missing.`;
    if (!String(q.instituteName || '').trim()) return `${where} (${level}): the ${isSchool ? 'board' : 'institution'} is missing.`;
    if (level === 'HSC' && !String(q.specialization || '').trim()) return `${where} (HSC): the stream is missing.`;

    const year = String(q.passingYear ?? '').trim();
    if (!/^\d{4}$/.test(year) || Number(year) < 1950 || Number(year) > thisYear + 2) {
      return `${where} (${level}): the year of passing is not valid.`;
    }
    const score = Number(q.cgpa ?? q.percentage);
    if (!Number.isFinite(score) || score < 0 || score > 100) return `${where} (${level}): the result must be between 0 and 100.`;

    if (isSchool) {
      if (seenSchool.has(level)) return `${level} has been entered twice.`;
      seenSchool.add(level);
    }
  }
  return null;
}

module.exports = { validateQualifications };
