const prisma = require('../services/prisma');
const { matchAndNotifyInterestedApplicants } = require('../services/interestMatchingService');
const storageService = require('../services/storageService');

/**
 * Generate unique Vacancy Reference Number (e.g. VAC-2026-001)
 */
async function generateVacancyNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `VAC-${currentYear}-`;
  
  const count = await prisma.job.count({
    where: {
      vacancyNumber: { startsWith: prefix }
    }
  });

  const nextNum = (count + 1).toString().padStart(3, '0');
  return `${prefix}${nextNum}`;
}

/**
 * Helper to calculate server-side whether applications are currently open
 */
function isVacancyOpen(job) {
  const now = new Date();
  const isPublished = job.status === 'PUBLISHED';
  const openingValid = !job.openingDate || new Date(job.openingDate) <= now;
  const deadlineValid = !job.deadline || new Date(job.deadline) >= now;

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

  const now = new Date();

  const where = {
    status: 'PUBLISHED',
    openingDate: { lte: now },
    deadline: { gte: now }
  };

  if (targetCategory && (targetCategory === 'TEACHING' || targetCategory === 'NON_TEACHING')) {
    where.type = targetCategory;
  }

  if (school) {
    where.OR = [
      { department: { contains: school } },
      { school: { name: { contains: school } } }
    ];
  }

  if (department) {
    where.department = { contains: department };
  }

  if (search) {
    where.OR = [
      { position: { contains: search } },
      { department: { contains: search } },
      { skills: { contains: search } },
      { description: { contains: search } }
    ];
  }

  try {
    const jobs = await prisma.job.findMany({
      where,
      include: {
        school: { select: { id: true, name: true, type: true } },
        departmentRef: { select: { id: true, name: true } },
        positionRef: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedJobs = jobs.map((j) => ({
      ...j,
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

    // Do not expose unpublished (draft/archived) vacancies on the public endpoint.
    if (!job || job.status === 'DRAFT' || job.status === 'ARCHIVED') {
      return res.status(404).json({ error: 'Vacancy opening not found.' });
    }

    const isOpen = isVacancyOpen(job);

    return res.json({
      ...job,
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

  if (status) {
    where.status = status;
  }

  if (department) {
    where.department = { contains: department };
  }

  if (search) {
    where.OR = [
      { vacancyNumber: { contains: search } },
      { position: { contains: search } },
      { department: { contains: search } }
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
  const {
    vacancyNumber,
    position,
    type,
    schoolId,
    departmentId,
    positionId,
    department,
    employmentType,
    numPositions,
    qualification,
    experience,
    skills,
    description,
    salaryScale,
    location,
    openingDate,
    deadline,
    requiredDocuments,
    eligibilityCriteria,
    status
  } = req.body;

  if (!position || !type || !qualification || !experience || !description || !deadline) {
    return res.status(400).json({ error: 'Position, vacancy type, qualification, experience, description, and deadline are required.' });
  }

  if (type !== 'TEACHING' && type !== 'NON_TEACHING') {
    return res.status(400).json({ error: 'Vacancy type must be TEACHING or NON_TEACHING.' });
  }

  try {
    const finalVacancyNum = vacancyNumber || (await generateVacancyNumber());

    // Resolve text department string if school/department IDs are provided
    let deptName = department || '';
    if (!deptName && schoolId) {
      const sch = await prisma.school.findUnique({ where: { id: schoolId } });
      if (sch) deptName = sch.name;
    }

    const newJob = await prisma.job.create({
      data: {
        vacancyNumber: finalVacancyNum,
        position,
        type,
        schoolId: schoolId || null,
        departmentId: departmentId || null,
        positionId: positionId || null,
        department: deptName || 'DYPIU Campus',
        employmentType: employmentType || 'Full Time',
        numPositions: numPositions ? parseInt(numPositions) : 1,
        qualification,
        experience,
        skills: skills || '',
        description,
        salaryScale: salaryScale || '',
        location: location || 'Pune',
        openingDate: openingDate ? new Date(openingDate) : new Date(),
        deadline: new Date(deadline),
        requiredDocuments: requiredDocuments || 'CV/Resume, Educational Certificates',
        eligibilityCriteria: eligibilityCriteria || '',
        bannerUrl: req.body.bannerUrl || null,
        posterUrl: req.body.posterUrl || null,
        imageUrl: req.body.imageUrl || null,
        status: status || 'DRAFT',
        createdBy: req.user ? req.user.id : null
      }
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
  const data = req.body;

  try {
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Vacancy opening not found.' });
    }

    // Whitelist updatable fields
    const editable = [
      'position', 'type', 'schoolId', 'departmentId', 'positionId', 'department',
      'employmentType', 'numPositions', 'qualification', 'experience', 'skills',
      'description', 'salaryScale', 'location', 'openingDate', 'deadline',
      'requiredDocuments', 'eligibilityCriteria', 'bannerUrl', 'posterUrl', 'imageUrl', 'status'
    ];

    const updateData = {};
    for (const key of editable) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    if (updateData.numPositions !== undefined) updateData.numPositions = parseInt(updateData.numPositions) || 1;
    if (updateData.deadline) updateData.deadline = new Date(updateData.deadline);
    if (updateData.openingDate) updateData.openingDate = new Date(updateData.openingDate);
    if (updateData.type && !['TEACHING', 'NON_TEACHING'].includes(updateData.type)) {
      return res.status(400).json({ error: 'Vacancy type must be TEACHING or NON_TEACHING.' });
    }
    if (updateData.status && !['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'].includes(updateData.status)) {
      return res.status(400).json({ error: 'Invalid vacancy status.' });
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData
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

  if (!status || !['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (DRAFT, PUBLISHED, CLOSED, ARCHIVED) is required.' });
  }

  try {
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Vacancy opening not found.' });
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: { status }
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

    // If there was an existing local poster file, clean it up
    if (school.posterUrl && school.posterUrl.startsWith('/uploads/')) {
      const oldKey = school.posterUrl.replace('/uploads/', '');
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
    return res.status(500).json({ error: error.message || 'Failed to upload recruitment poster.' });
  }
}

async function deleteSchoolPoster(req, res) {
  const { id } = req.params;

  try {
    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) {
      return res.status(404).json({ error: 'School/Faculty not found.' });
    }

    // Clean up local file if stored locally
    if (school.posterUrl && school.posterUrl.startsWith('/uploads/')) {
      const oldKey = school.posterUrl.replace('/uploads/', '');
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
  const { name, code, type, description, bannerUrl, posterUrl } = req.body;

  try {
    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) {
      return res.status(404).json({ error: 'School/Faculty not found.' });
    }

    const updated = await prisma.school.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code !== undefined && { code }),
        ...(type && { type }),
        ...(description !== undefined && { description }),
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

module.exports = {
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
  getDepartmentPositions
};

