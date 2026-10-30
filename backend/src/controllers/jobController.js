const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const prisma = require('../services/prisma');
const { matchAndNotifyInterestedApplicants } = require('../services/interestMatchingService');
const storageService = require('../services/storageService');
const { logAuditAction } = require('../services/auditService');
const { cleanString, parseDate, searchTerm } = require('../utils/validate');

const JOB_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'];

/** Only same-site poster uploads, base64 data URIs, or https image links may be stored as a poster/banner URL. */
function validMediaUrl(value) {
  if (value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  if (value.startsWith('data:image/')) return true;
  if (storageService.posterKeyFromUrl(value)) return true;
  return /^https?:\/\/[^\s]+$/i.test(value);
}

async function saveBase64Poster(dataUri, prefix = 'poster') {
  if (typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) return dataUri;
  const match = dataUri.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!match) return dataUri;
  const rawExt = match[1].toLowerCase() === 'jpeg' ? '.jpg' : `.${match[1].toLowerCase()}`;
  const ext = ['.jpg', '.jpeg', '.png', '.webp'].includes(rawExt) ? rawExt : '.png';
  const buffer = Buffer.from(match[2], 'base64');
  const fileName = `${prefix}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const filePath = path.join(storageService.POSTER_ROOT, fileName);
  await fs.promises.mkdir(storageService.POSTER_ROOT, { recursive: true });
  await fs.promises.writeFile(filePath, buffer, { mode: 0o640 });
  return `/uploads/posters/${fileName}`;
}

function stripInternal(job) {
  const { createdBy, ...rest } = job;
  return rest;
}

/**
 * Validate and normalise vacancy fields shared by create and update.
 * Returns { error } or { data } containing only whitelisted, typed values.
 */
async function normaliseJobInput(input, { partial }) {
  const data = {};
  const need = (cond, msg) => (cond ? null : msg);

  const strings = {
    position: 200, department: 200, employmentType: 50, qualification: 2000, experience: 1000,
    skills: 2000, description: 10000, salaryScale: 200, location: 200,
    requiredDocuments: 2000, eligibilityCriteria: 4000,
    customCategory: 200, customLabel: 200
  };
  for (const [key, max] of Object.entries(strings)) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string') return { error: `"${key}" must be text.` };
    data[key] = cleanString(input[key], max);
  }

  // `schoolName` is only a form helper (used by createJob to build the department text); it is not a column,
  // so it is validated here but never put into `data` (Prisma rejects unknown fields).
  if (input.schoolName !== undefined && typeof input.schoolName !== 'string') return { error: '"schoolName" must be text.' };

  if (input.type !== undefined) {
    if (!['TEACHING', 'NON_TEACHING', 'CUSTOM'].includes(input.type)) return { error: 'Vacancy type must be TEACHING, NON_TEACHING, or CUSTOM.' };
    data.type = input.type;
  }
  if (input.status !== undefined) {
    if (!JOB_STATUSES.includes(input.status)) return { error: 'Invalid vacancy status.' };
    data.status = input.status;
  }
  if (input.numPositions !== undefined) {
    const n = parseInt(input.numPositions, 10);
    if (!Number.isInteger(n) || n < 1 || n > 500) return { error: 'Number of positions must be between 1 and 500.' };
    data.numPositions = n;
  }
  for (const key of ['openingDate', 'deadline']) {
    if (input[key] === undefined || input[key] === null || input[key] === '') continue;
    const d = parseDate(input[key]);
    if (!d) return { error: `"${key}" is not a valid date.` };
    data[key] = d;
  }
  for (const key of ['schoolId', 'departmentId', 'positionId']) {
    if (input[key] !== undefined) data[key] = input[key] ? String(input[key]) : null;
  }
  for (const key of ['bannerUrl', 'posterUrl', 'imageUrl']) {
    if (input[key] === undefined) continue;
    if (typeof input[key] === 'string' && input[key].startsWith('data:image/')) {
      try {
        input[key] = await saveBase64Poster(input[key], key);
      } catch (err) {
        console.warn(`[Job] Could not save ${key} data URI:`, err.message);
      }
    }
    if (!validMediaUrl(input[key])) return { error: `"${key}" must be an uploaded poster or an https image URL.` };
    data[key] = input[key] || null;
  }

  if (!partial) {
    const missing = need(data.position && data.type && data.qualification && data.experience && data.description && data.deadline,
      'Position, vacancy type, qualification, experience, description, and deadline are required.');
    if (missing) return { error: missing };
  }
  if (data.openingDate && data.deadline && data.deadline < data.openingDate) {
    return { error: 'The deadline must be on or after the opening date.' };
  }
  return { data };
}

/**
 * Generate unique Vacancy Reference Number (e.g. VAC-2026-001)
 */
async function generateVacancyNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `VAC-${currentYear}-`;
  
  const last = await prisma.job.findFirst({
    where: { vacancyNumber: { startsWith: prefix } },
    orderBy: { vacancyNumber: 'desc' },
    select: { vacancyNumber: true }
  });
  const lastSeq = last ? parseInt(last.vacancyNumber.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastSeq + 1).padStart(3, '0')}`;
}

/**
 * Helper to calculate server-side whether applications are currently open
 */
function isVacancyOpen(job) {
  const now = new Date();
  const isPublished = job.status === 'PUBLISHED';
  const openingValid = !job.openingDate || new Date(job.openingDate) <= now;

  let deadlineValid = true;
  if (job.deadline) {
    const d = new Date(job.deadline);
    // If deadline time is midnight (date-only), consider active until end of that day
    if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
      d.setHours(23, 59, 59, 999);
    }
    deadlineValid = d >= now;
  }

  return isPublished && openingValid && deadlineValid;
}

/**
 * GET /api/public/vacancies
 * Public Vacancy API: Returns ONLY currently open vacancies.
 * Filters: category (TEACHING/NON_TEACHING), school, department, search.
 */
async function getPublicVacancies(req, res) {
  const { category, type, school, department, search } = req.query;
  const targetCategory = category || type;

  // Filter out any vacancy where the deadline is in the past.
  // Compare against start of today (00:00:00) so vacancies remain active through the deadline day.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const where = {
    status: 'PUBLISHED',
    deadline: { gte: startOfToday },
    openingDate: { lte: new Date() },
    AND: []
  };

  if (targetCategory && (targetCategory === 'TEACHING' || targetCategory === 'NON_TEACHING' || targetCategory === 'CUSTOM')) {
    where.type = targetCategory;
  }

  const schoolTerm = searchTerm(school);
  if (schoolTerm) {
    where.AND.push({
      OR: [
        { department: { contains: schoolTerm, mode: 'insensitive' } },
        { school: { name: { contains: schoolTerm, mode: 'insensitive' } } }
      ]
    });
  }

  const deptTerm = searchTerm(department);
  if (deptTerm) {
    where.AND.push({ department: { contains: deptTerm, mode: 'insensitive' } });
  }

  const term = searchTerm(search);
  if (term) {
    where.AND.push({
      OR: [
        { position: { contains: term, mode: 'insensitive' } },
        { department: { contains: term, mode: 'insensitive' } },
        { skills: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } }
      ]
    });
  }

  try {
    const jobs = await prisma.job.findMany({
      where,
      include: {
        school: { select: { id: true, name: true, type: true, posterUrl: true } },
        departmentRef: { select: { id: true, name: true } },
        positionRef: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedJobs = jobs.map((j) => ({
      ...stripInternal(j),
      isApplicationOpen: true
    }));

    return res.json(formattedJobs);
  } catch (error) {
    console.error('Fetch public vacancies error:', error);
    return res.status(500).json({ error: 'Failed to retrieve open vacancies.' });
  }
}

/**
 * GET /api/public/vacancies/:id
 */
async function getPublicVacancyById(req, res) {
  const { id } = req.params;

  try {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true, type: true } },
        departmentRef: { select: { id: true, name: true } },
        positionRef: { select: { id: true, title: true } }
      }
    });

    // Only published or closed vacancies are visible publicly.
    if (!job || !['PUBLISHED', 'CLOSED'].includes(job.status)) {
      return res.status(404).json({ error: 'Vacancy opening not found.' });
    }

    const isOpen = isVacancyOpen(job);

    return res.json({
      ...stripInternal(job),
      isApplicationOpen: isOpen
    });
  } catch (error) {
    console.error('Fetch public vacancy details error:', error);
    return res.status(500).json({ error: 'Failed to retrieve vacancy details.' });
  }
}

/**
 * GET /api/admin/vacancies
 * Admin Vacancy List: returns all vacancies with application & interest counts.
 */
async function getAllJobs(req, res) {
  const { type, department, status, search } = req.query;

  const where = {};

  if (type && (type === 'TEACHING' || type === 'NON_TEACHING')) {
    where.type = type;
  }

  if (JOB_STATUSES.includes(status)) {
    where.status = status;
  }

  const deptTerm = searchTerm(department);
  if (deptTerm) {
    where.department = { contains: deptTerm, mode: 'insensitive' };
  }

  const term = searchTerm(search);
  if (term) {
    where.OR = [
      { vacancyNumber: { contains: term, mode: 'insensitive' } },
      { position: { contains: term, mode: 'insensitive' } },
      { department: { contains: term, mode: 'insensitive' } }
    ];
  }

  try {
    const jobs = await prisma.job.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        departmentRef: { select: { id: true, name: true } },
        positionRef: { select: { id: true, title: true } },
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Attach count of interested applicants for each vacancy position/school
    const formatted = await Promise.all(
      jobs.map(async (job) => {
        const interestCount = await prisma.vacancyInterest.count({
          where: {
            category: job.type,
            OR: [
              ...(job.schoolId ? [{ schoolId: job.schoolId }] : []),
              { interestedPosition: { contains: job.position } }
            ]
          }
        });

        return {
          ...job,
          applicationsCount: job._count.applications,
          interestCount,
          isApplicationOpen: isVacancyOpen(job)
        };
      })
    );

    return res.json(formatted);
  } catch (error) {
    console.error('Fetch admin vacancies error:', error);
    return res.status(500).json({ error: 'Failed to retrieve vacancies.' });
  }
}

/**
 * GET /api/admin/vacancies/:id
 */
async function getJobById(req, res) {
  const { id } = req.params;

  try {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true } },
        departmentRef: { select: { id: true, name: true } },
        positionRef: { select: { id: true, title: true } },
        _count: { select: { applications: true } }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Vacancy not found.' });
    }

    const interestCount = await prisma.vacancyInterest.count({
      where: {
        category: job.type,
        OR: [
          ...(job.schoolId ? [{ schoolId: job.schoolId }] : []),
          { interestedPosition: { contains: job.position } }
        ]
      }
    });

    return res.json({
      ...job,
      applicationsCount: job._count.applications,
      interestCount,
      isApplicationOpen: isVacancyOpen(job)
    });
  } catch (error) {
    console.error('Fetch job by ID error:', error);
    return res.status(500).json({ error: 'Failed to retrieve vacancy details.' });
  }
}

/**
 * POST /api/admin/vacancies
 * Create a new Vacancy (Admin only).
 */
async function createJob(req, res) {
  const parsed = await normaliseJobInput(req.body || {}, { partial: false });
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const input = parsed.data;

  try {
    // Resolve text department string if school/department IDs are provided
    let deptName = input.department || '';
    if (input.schoolId) {
      const school = await prisma.school.findUnique({ where: { id: input.schoolId } });
      if (!school) return res.status(400).json({ error: 'Selected school/faculty does not exist.' });
      if (!deptName) deptName = school.name;
    }

    const requestedNumber = cleanString(req.body.vacancyNumber, 40);
    let newJob = null;

    for (let attempt = 0; attempt < 5 && !newJob; attempt += 1) {
      try {
        newJob = await prisma.job.create({
          data: {
            vacancyNumber: requestedNumber || (await generateVacancyNumber()),
            position: input.position,
            type: input.type,
            customCategory: input.customCategory || input.customLabel || null,
            customLabel: input.customLabel || input.customCategory || null,
            schoolId: input.type === 'CUSTOM' ? null : (input.schoolId || null),
            departmentId: input.type === 'CUSTOM' ? null : (input.departmentId || null),
            positionId: input.type === 'CUSTOM' ? null : (input.positionId || null),
            department: input.type === 'CUSTOM' ? (input.department || input.schoolName || 'DYPIU Campus') : (deptName || 'DYPIU Campus'),
            employmentType: input.employmentType || 'Full Time',
            numPositions: input.numPositions || 1,
            qualification: input.qualification,
            experience: input.experience,
            skills: input.skills || '',
            description: input.description,
            salaryScale: input.salaryScale || '',
            location: input.location || 'Pune',
            openingDate: input.openingDate || new Date(),
            deadline: input.deadline,
            requiredDocuments: input.requiredDocuments || 'CV/Resume, Educational Certificates',
            eligibilityCriteria: input.eligibilityCriteria || '',
            bannerUrl: input.bannerUrl || null,
            posterUrl: input.posterUrl || null,
            imageUrl: input.imageUrl || null,
            status: input.status || 'DRAFT',
            createdBy: req.user.id
          }
        });
      } catch (err) {
        if (err.code === 'P2002' && !requestedNumber) continue; // generated number collided: retry
        if (err.code === 'P2002') return res.status(409).json({ error: 'A vacancy with this reference number already exists.' });
        throw err;
      }
    }
    if (!newJob) return res.status(503).json({ error: 'Could not allocate a vacancy number. Please try again.' });

    await logAuditAction({
      action: 'VACANCY_CREATED',
      userId: req.user.id,
      targetType: 'Job',
      targetId: newJob.id,
      details: { vacancyNumber: newJob.vacancyNumber, status: newJob.status },
      req
    });

    // If directly published on creation, trigger interest notification matching
    if (newJob.status === 'PUBLISHED') {
      matchAndNotifyInterestedApplicants(newJob.id).catch((err) => {
        console.warn('Auto notification trigger on creation failed:', err.message);
      });
    }

    return res.status(201).json({
      message: 'Vacancy created successfully.',
      job: newJob
    });
  } catch (error) {
    console.error('Create vacancy error:', error);
    return res.status(500).json({ error: 'Failed to create vacancy opening.' });
  }
}

/**
 * PUT /api/admin/vacancies/:id
 * Edit an existing Vacancy (Admin only).
 */
async function updateJob(req, res) {
  const { id } = req.params;

  try {
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Vacancy opening not found.' });
    }

    const parsed = await normaliseJobInput(req.body || {}, { partial: true });
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const updateData = parsed.data;

    const opening = updateData.openingDate || existing.openingDate;
    const deadline = updateData.deadline || existing.deadline;
    if (deadline && opening && deadline < opening) {
      return res.status(400).json({ error: 'The deadline must be on or after the opening date.' });
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData
    });

    await logAuditAction({
      action: 'VACANCY_UPDATED',
      userId: req.user.id,
      targetType: 'Job',
      targetId: id,
      oldValue: { status: existing.status, deadline: existing.deadline },
      details: { fields: Object.keys(updateData) },
      req
    });

    if (existing.status !== 'PUBLISHED' && updatedJob.status === 'PUBLISHED') {
      matchAndNotifyInterestedApplicants(updatedJob.id).catch((err) => {
        console.warn('Notification trigger on publish failed:', err.message);
      });
    }

    return res.json({ message: 'Vacancy opening updated successfully.', job: updatedJob });
  } catch (error) {
    console.error('Update job error:', error);
    return res.status(500).json({ error: 'Failed to update vacancy opening.' });
  }
}

/**
 * PATCH /api/admin/vacancies/:id/status
 * Update status: DRAFT, PUBLISHED, CLOSED, ARCHIVED (Admin only).
 */
async function updateJobStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!JOB_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Valid status (DRAFT, PUBLISHED, CLOSED, ARCHIVED) is required.' });
  }

  try {
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Vacancy opening not found.' });
    }

    // A vacancy cannot be published after its deadline without extending it first.
    if (status === 'PUBLISHED' && existing.deadline && new Date(existing.deadline) < new Date()) {
      return res.status(400).json({ error: 'The deadline has passed. Extend the deadline before publishing this vacancy.' });
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: { status }
    });

    await logAuditAction({
      action: 'VACANCY_STATUS_CHANGED',
      userId: req.user.id,
      targetType: 'Job',
      targetId: id,
      oldValue: { status: existing.status },
      details: { status },
      req
    });

    if (existing.status !== 'PUBLISHED' && status === 'PUBLISHED') {
      matchAndNotifyInterestedApplicants(updatedJob.id).catch((err) => {
        console.warn('Notification trigger on status publish failed:', err.message);
      });
    }

    return res.json({ message: `Vacancy status changed to ${status}.`, job: updatedJob });
  } catch (error) {
    console.error('Update job status error:', error);
    return res.status(500).json({ error: 'Failed to update vacancy status.' });
  }
}

/**
 * Dynamic Dropdowns & School Management APIs
 */
async function getSchools(req, res) {
  const { type } = req.query;
  const where = {};
  if (type === 'TEACHING' || type === 'NON_TEACHING') {
    where.type = type;
  }

  try {
    const now = new Date();
    const schools = await prisma.school.findMany({
      where,
      include: {
        _count: {
          select: {
            jobs: {
              where: {
                status: 'PUBLISHED',
                deadline: { gte: now }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Provide recruitmentPosterUrl alias alongside posterUrl
    const formatted = schools.map((s) => ({
      ...s,
      recruitmentPosterUrl: s.posterUrl || null
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Failed to retrieve schools:', error);
    return res.status(500).json({ error: 'Failed to retrieve schools.' });
  }
}

async function uploadSchoolPoster(req, res) {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No poster image file provided. Please upload a JPG, JPEG, PNG, or WebP file.' });
  }

  try {
    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) {
      return res.status(404).json({ error: 'School/Faculty not found.' });
    }

    // Save new poster file
    const saved = await storageService.savePosterFile(req.file, school.id);

    // Clean up the previous poster if it is one of our own files
    const oldKey = storageService.posterKeyFromUrl(school.posterUrl);
    if (oldKey) {
      storageService.deleteFile(oldKey).catch((e) => console.warn('Could not delete old poster file:', e.message));
    }

    // Update school record
    const updated = await prisma.school.update({
      where: { id },
      data: {
        posterUrl: saved.webUrl,
        updatedAt: new Date()
      }
    });

    return res.json({
      message: 'Recruitment poster uploaded successfully.',
      school: {
        ...updated,
        recruitmentPosterUrl: updated.posterUrl
      }
    });
  } catch (error) {
    console.error('Upload poster error:', error);
    return res.status(500).json({ error: 'Failed to upload recruitment poster.' });
  }
}

async function deleteSchoolPoster(req, res) {
  const { id } = req.params;

  try {
    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) {
      return res.status(404).json({ error: 'School/Faculty not found.' });
    }

    // Clean up local file if it is one of our own poster files
    const oldKey = storageService.posterKeyFromUrl(school.posterUrl);
    if (oldKey) {
      await storageService.deleteFile(oldKey).catch((e) => console.warn('Could not delete old poster file:', e.message));
    }

    const updated = await prisma.school.update({
      where: { id },
      data: {
        posterUrl: null,
        updatedAt: new Date()
      }
    });

    return res.json({
      message: 'Recruitment poster removed successfully.',
      school: {
        ...updated,
        recruitmentPosterUrl: null
      }
    });
  } catch (error) {
    console.error('Delete poster error:', error);
    return res.status(500).json({ error: 'Failed to remove recruitment poster.' });
  }
}

async function updateSchool(req, res) {
  const { id } = req.params;
  const { name, code, type, description, bannerUrl, posterUrl } = req.body || {};

  if (type !== undefined && !['TEACHING', 'NON_TEACHING'].includes(type)) {
    return res.status(400).json({ error: 'Type must be TEACHING or NON_TEACHING.' });
  }
  if ((name !== undefined && (typeof name !== 'string' || !name.trim())) ||
      (code !== undefined && code !== null && typeof code !== 'string') ||
      (description !== undefined && description !== null && typeof description !== 'string')) {
    return res.status(400).json({ error: 'Invalid school details.' });
  }
  if ((bannerUrl !== undefined && !validMediaUrl(bannerUrl)) || (posterUrl !== undefined && !validMediaUrl(posterUrl))) {
    return res.status(400).json({ error: 'Poster/banner must be an uploaded poster or an https image URL.' });
  }

  try {
    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) {
      return res.status(404).json({ error: 'School/Faculty not found.' });
    }

    const updated = await prisma.school.update({
      where: { id },
      data: {
        ...(name && { name: cleanString(name, 200) }),
        ...(code !== undefined && { code: code === null ? null : cleanString(code, 50) }),
        ...(type && { type }),
        ...(description !== undefined && { description: description === null ? null : cleanString(description, 4000) }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(posterUrl !== undefined && { posterUrl })
      }
    });

    return res.json({
      message: 'School updated successfully.',
      school: {
        ...updated,
        recruitmentPosterUrl: updated.posterUrl
      }
    });
  } catch (error) {
    console.error('Update school error:', error);
    return res.status(500).json({ error: 'Failed to update school.' });
  }
}

async function getSchoolDepartments(req, res) {
  const { id } = req.params;

  try {
    const departments = await prisma.department.findMany({
      where: { schoolId: id },
      orderBy: { name: 'asc' }
    });
    return res.json(departments);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve departments.' });
  }
}

async function getDepartmentPositions(req, res) {
  const { id } = req.params;

  try {
    const positions = await prisma.position.findMany({
      where: { departmentId: id },
      orderBy: { title: 'asc' }
    });
    return res.json(positions);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve positions.' });
  }
}

async function getAcademicStructure(req, res) {
  try {
    const schools = await prisma.school.findMany({
      where: {
        NOT: { name: { startsWith: '[ARCHIVED]' } }
      },
      include: {
        departments: {
          include: {
            positions: {
              select: { id: true, title: true, category: true }
            }
          },
          orderBy: { name: 'asc' }
        },
        jobs: {
          where: { status: { in: ['PUBLISHED', 'CLOSED'] } },
          select: {
            id: true,
            vacancyNumber: true,
            position: true,
            department: true,
            type: true,
            status: true,
            deadline: true,
            numPositions: true
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json({ schools });
  } catch (error) {
    console.error('Fetch academic structure error:', error);
    return res.status(500).json({ error: 'Failed to retrieve academic structure.' });
  }
}

module.exports = {
  // exported for tests
  _normaliseJobInput: normaliseJobInput,
  getPublicVacancies,
  getPublicVacancyById,
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  getSchools,
  uploadSchoolPoster,
  deleteSchoolPoster,
  updateSchool,
  getSchoolDepartments,
  getDepartmentPositions,
  getAcademicStructure
};

