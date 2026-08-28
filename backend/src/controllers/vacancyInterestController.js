const prisma = require('../services/prisma');
const { matchAndNotifyInterestedApplicants } = require('../services/interestMatchingService');

/**
 * Public Endpoint: Submit Vacancy Interest / Notification Request
 * POST /api/public/vacancy-interest
 */
async function createVacancyInterest(req, res) {
  const {
    name,
    email,
    mobile,
    schoolId,
    departmentId,
    interestedPosition,
    category,
    message
  } = req.body;

  if (!name || !email || !mobile || !interestedPosition || !category) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_INPUT',
      message: 'Name, email, mobile number, interested position, and category are required.'
    });
  }

  if (category !== 'TEACHING' && category !== 'NON_TEACHING') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_CATEGORY',
      message: 'Category must be TEACHING or NON_TEACHING.'
    });
  }

  try {
    const interest = await prisma.vacancyInterest.create({
      data: {
        name,
        email,
        mobile,
        schoolId: schoolId || null,
        departmentId: departmentId || null,
        interestedPosition,
        category,
        message: message || '',
        status: 'PENDING'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for registering your interest! We will notify you as soon as a relevant vacancy opens.',
      data: interest
    });
  } catch (error) {
    console.error('Create vacancy interest error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to record expression of interest.'
    });
  }
}

/**
 * Admin Endpoint: Get list of registered interested applicants
 * GET /api/admin/vacancy-interests
 */
async function getVacancyInterests(req, res) {
  const { schoolId, category, status, search, position } = req.query;

  const where = {};

  if (schoolId) where.schoolId = schoolId;
  if (category && (category === 'TEACHING' || category === 'NON_TEACHING')) {
    where.category = category;
  }
  if (status) where.status = status;
  if (position) {
    where.interestedPosition = { contains: position };
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { mobile: { contains: search } },
      { interestedPosition: { contains: search } }
    ];
  }

  try {
    const interests = await prisma.vacancyInterest.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group interest counts by position
    const positionCounts = {};
    interests.forEach((item) => {
      const pos = item.interestedPosition;
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });

    return res.json({
      success: true,
      data: interests,
      counts: positionCounts
    });
  } catch (error) {
    console.error('Fetch vacancy interests error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to retrieve vacancy interest requests.'
    });
  }
}

/**
 * Admin Endpoint: Trigger Notification to Interested Applicants for a Vacancy
 * POST /api/admin/vacancies/:id/notify-interested
 */
async function notifyInterestedApplicantsForVacancy(req, res) {
  const { id } = req.params;

  try {
    const result = await matchAndNotifyInterestedApplicants(id);
    return res.json({
      success: true,
      message: result.message,
      count: result.count
    });
  } catch (error) {
    console.error('Notify interested applicants error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'Failed to send notifications to interested candidates.'
    });
  }
}

module.exports = {
  createVacancyInterest,
  getVacancyInterests,
  notifyInterestedApplicantsForVacancy
};
