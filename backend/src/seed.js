require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seeding...');

  // 1. Create Default Admin User (override via env for production).
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@dypiu.edu').toLowerCase();
  const defaultAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123';
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_ADMIN_PASSWORD) {
    console.warn('[Seed] WARNING: Using the default admin password in production. Set SEED_ADMIN_PASSWORD and change it immediately.');
  }

  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!adminUser) {
    console.log(`[Seed] Creating default Admin user: ${adminEmail}`);
    const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);

    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        admin: {
          create: {
            name: 'HR Administrator'
          }
        }
      }
    });
    console.log(`[Seed] Admin created successfully. Credentials: ${adminEmail} / ${defaultAdminPassword}`);
  } else {
    console.log(`[Seed] Admin user ${adminEmail} already exists.`);
  }

  // 1b. Create a demo Applicant account (applying now requires login).
  const demoApplicantEmail = (process.env.SEED_APPLICANT_EMAIL || 'demo@applicant.com').toLowerCase();
  const demoApplicantPassword = process.env.SEED_APPLICANT_PASSWORD || 'Demo@1234';
  const existingApplicant = await prisma.user.findUnique({ where: { email: demoApplicantEmail } });
  if (!existingApplicant) {
    const hashed = await bcrypt.hash(demoApplicantPassword, 10);
    await prisma.user.create({
      data: {
        email: demoApplicantEmail,
        password: hashed,
        role: 'APPLICANT',
        applicant: { create: { name: 'Demo Applicant', mobile: '9000000000' } }
      }
    });
    console.log(`[Seed] Demo applicant created. Credentials: ${demoApplicantEmail} / ${demoApplicantPassword}`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 2. APPROVED UNIVERSITY STRUCTURE - Replace old data with new official
  //    Faculty → School → Department → Program hierarchy
  // ─────────────────────────────────────────────────────────────────────
  const { APPROVED_UNIVERSITY_STRUCTURE } = require('./constants/universityStructure');

  console.log('[Seed] Seeding approved university structure...');

  // Delete obsolete schools not in the approved list
  const approvedSchoolNames = [];
  for (const fac of APPROVED_UNIVERSITY_STRUCTURE) {
    for (const sch of fac.schools) {
      approvedSchoolNames.push(sch.name);
    }
  }

  // Mark obsolete schools by renaming them (safe - keeps job references intact)
  const allExistingSchools = await prisma.school.findMany();
  for (const existing of allExistingSchools) {
    if (!approvedSchoolNames.includes(existing.name)) {
      console.log(`[Seed] Renaming obsolete school: ${existing.name}`);
      await prisma.school.update({
        where: { id: existing.id },
        data: { name: `[ARCHIVED] ${existing.name}`, code: `ARCH-${existing.code || existing.id.slice(0, 6)}` }
      });
    }
  }

  // Create/update approved schools, departments, and programs
  const schoolsMap = {};
  const departmentsMap = {};

  for (const fac of APPROVED_UNIVERSITY_STRUCTURE) {
    for (const schData of fac.schools) {
      // Upsert school
      let school = await prisma.school.findUnique({ where: { name: schData.name } });
      if (!school) {
        school = await prisma.school.create({
          data: {
            name: schData.name,
            code: schData.code,
            type: schData.type,
            faculty: fac.faculty,
            description: schData.description
          }
        });
        console.log(`[Seed] Created school: ${school.name}`);
      } else {
        // Update faculty & description
        await prisma.school.update({
          where: { id: school.id },
          data: { faculty: fac.faculty, description: schData.description, code: schData.code }
        });
      }
      schoolsMap[schData.name] = school;

      // Upsert departments
      for (const deptData of schData.departments) {
        let dept = await prisma.department.findFirst({
          where: { name: deptData.name, schoolId: school.id }
        });
        if (!dept) {
          dept = await prisma.department.create({
            data: { name: deptData.name, schoolId: school.id }
          });
          console.log(`[Seed]   + Department: ${dept.name}`);
        }
        const deptKey = `${deptData.name}-${schData.name}`;
        departmentsMap[deptKey] = dept;

        // Upsert programs
        for (const progName of (deptData.programs || [])) {
          const existingProg = await prisma.program.findFirst({
            where: { name: progName, departmentId: dept.id }
          });
          if (!existingProg) {
            await prisma.program.create({
              data: { name: progName, departmentId: dept.id }
            });
            console.log(`[Seed]     ~ Program: ${progName}`);
          }
        }

        // Upsert positions
        for (const posTitle of (deptData.positions || [])) {
          const cat = schData.type === 'NON_TEACHING' ? 'NON_TEACHING' : 'TEACHING';
          const existing = await prisma.position.findFirst({
            where: { title: posTitle, departmentId: dept.id }
          });
          if (!existing) {
            await prisma.position.create({
              data: { title: posTitle, category: cat, departmentId: dept.id }
            });
          }
        }
      }
    }
  }

  // Build positionsMap for sample vacancies
  const positionsMap = {};
  const allPositions = await prisma.position.findMany({ include: { department: { include: { school: true } } } });
  for (const p of allPositions) {
    const key = `${p.title}-${p.department.name}-${p.department.school?.name}`;
    positionsMap[key] = p;
  }

  // Resolve school/dept refs for sample vacancies using new approved names
  const socSchool = schoolsMap['School of Computer Science Engineering & Applications'];
  const cseDept = departmentsMap['Department of Computer Science & Engineering-School of Computer Science Engineering & Applications'];
  const asstProfCsePos = positionsMap['Assistant Professor-Department of Computer Science & Engineering-School of Computer Science Engineering & Applications'];

  const somSchool = schoolsMap['School of Commerce & Management'];
  const mgmtDept = departmentsMap['Department of Business Management-School of Commerce & Management'];
  const asstProfMgmtPos = positionsMap['Assistant Professor-Department of Business Management-School of Commerce & Management'];

  const soaSchool = schoolsMap['School of Design'];
  const designDept = departmentsMap['Department of Design-School of Design'];
  const asstProfDesignPos = positionsMap['Assistant Professor-Department of Design-School of Design'];

  const bmpSchool = schoolsMap['Branding, Media & Promotion'];
  const mediaDept = departmentsMap['Media Studio & Communications-Branding, Media & Promotion'];
  const graphicDesignerPos = positionsMap['Graphic Designer-Media Studio & Communications-Branding, Media & Promotion'];

  const adminSchool = schoolsMap['University Administration & Operations'];
  const adminDept = departmentsMap['University Administrative Services-University Administration & Operations'];
  const hrExecPos = positionsMap['HR Executive-University Administrative Services-University Administration & Operations'];

  const sampleVacancies = [
    {
      vacancyNumber: 'VAC-2026-001',
      position: 'Assistant Professor – Computer Science & Engineering',
      type: 'TEACHING',
      department: 'School of Computer Science Engineering & Applications',
      schoolId: socSchool?.id,
      departmentId: cseDept?.id,
      positionId: asstProfCsePos?.id,
      employmentType: 'Full Time',
      numPositions: 3,
      qualification: 'Ph.D. in Computer Science & Engineering or M.Tech with First Class.',
      experience: '2 to 5 years teaching or industry research experience.',
      skills: 'Python, Machine Learning, Web Technologies, Database Systems',
      description: 'Responsible for conducting lectures, mentoring undergraduate projects, curriculum updating, and active research publication.',
      salaryScale: 'As per 7th Pay Commission Scale',
      location: 'Pune',
      openingDate: new Date('2026-08-01T00:00:00.000Z'),
      deadline: new Date('2026-09-30T23:59:59.000Z'),
      requiredDocuments: 'CV, Educational Marksheets, Degree Certificates, Ph.D. Award Letter',
      eligibilityCriteria: 'Ph.D. mandatory or M.Tech with NET/SET qualification.',
      status: 'PUBLISHED',
      createdBy: adminUser.id
    },
    {
      vacancyNumber: 'VAC-2026-002',
      position: 'Assistant Professor – Business Management',
      type: 'TEACHING',
      department: 'School of Commerce & Management',
      schoolId: somSchool?.id,
      departmentId: mgmtDept?.id,
      positionId: asstProfMgmtPos?.id,
      employmentType: 'Full Time',
      numPositions: 2,
      qualification: 'MBA/PGDM with First Class and Ph.D. in Management.',
      experience: '3+ years of academic teaching in reputed management institutions.',
      skills: 'Marketing Analytics, Financial Modeling, Strategic Management',
      description: 'Engage MBA students through case-based teaching methods, supervise industry internships, and facilitate placement mentorship.',
      salaryScale: 'As per 7th Pay Commission scale',
      location: 'Pune',
      openingDate: new Date('2026-08-01T00:00:00.000Z'),
      deadline: new Date('2026-09-25T23:59:59.000Z'),
      requiredDocuments: 'Resume, MBA Passing Certificate, Ph.D. Degree, Experience Letters',
      eligibilityCriteria: 'Minimum 2 Scopus indexed publication papers.',
      status: 'PUBLISHED',
      createdBy: adminUser.id
    },
    {
      vacancyNumber: 'VAC-2026-003',
      position: 'Assistant Professor – Design',
      type: 'TEACHING',
      department: 'School of Design',
      schoolId: soaSchool?.id,
      departmentId: designDept?.id,
      positionId: asstProfDesignPos?.id,
      employmentType: 'Full Time',
      numPositions: 1,
      qualification: 'M.Des / Master in Design or equivalent from NID/IIT/reputed institute.',
      experience: '2+ years teaching or professional studio experience.',
      skills: 'UI/UX Design, Adobe Creative Suite, Figma, Product Prototyping',
      description: 'Guide studio design projects, conduct workshops on digital prototyping, and evaluate student design portfolios.',
      salaryScale: 'Commensurate with experience & industry portfolio',
      location: 'Pune',
      openingDate: new Date('2026-08-10T00:00:00.000Z'),
      deadline: new Date('2026-10-10T23:59:59.000Z'),
      requiredDocuments: 'CV, Portfolio PDF / Link, Degree Certificates',
      eligibilityCriteria: 'Strong digital portfolio demonstrating end-to-end design projects.',
      status: 'PUBLISHED',
      createdBy: adminUser.id
    },
    {
      vacancyNumber: 'VAC-2026-004',
      position: 'Graphic Designer',
      type: 'NON_TEACHING',
      department: 'Branding, Media & Promotion',
      schoolId: bmpSchool?.id,
      departmentId: mediaDept?.id,
      positionId: graphicDesignerPos?.id,
      employmentType: 'Full Time',
      numPositions: 1,
      qualification: 'Degree/Diploma in Graphic Design, Applied Art, or Fine Arts.',
      experience: '2 to 4 years of hands-on branding design experience.',
      skills: 'Photoshop, Illustrator, InDesign, Social Media Creatives, Banner Layouts',
      description: 'Design official university marketing collateral, event posters, social media banners, newsletter templates, and branding assets.',
      salaryScale: 'Rs. 35,000 - 45,000 per month',
      location: 'Pune',
      openingDate: new Date('2026-08-01T00:00:00.000Z'),
      deadline: new Date('2026-09-20T23:59:59.000Z'),
      requiredDocuments: 'Resume, Creative Portfolio (Behance / Drive link), ID Proofs',
      eligibilityCriteria: 'Proven portfolio in print and digital design layout.',
      status: 'PUBLISHED',
      createdBy: adminUser.id
    },
    {
      vacancyNumber: 'VAC-2026-005',
      position: 'HR Executive',
      type: 'NON_TEACHING',
      department: 'University Administration & Operations',
      schoolId: adminSchool?.id,
      departmentId: adminDept?.id,
      positionId: hrExecPos?.id,
      employmentType: 'Full Time',
      numPositions: 1,
      qualification: 'MBA in HR / Post Graduate Diploma in Human Resource Management.',
      experience: '2+ years in recruitment, onboarding, and attendance management.',
      skills: 'Recruitment screening, HRIS, Interpersonal Communication, Leave Audit',
      description: 'Coordinate end-to-end faculty and staff recruitment processing, issue appointment letters, maintain HR personnel files.',
      salaryScale: 'Rs. 30,000 - 40,000 per month',
      location: 'Pune',
      openingDate: new Date('2026-08-05T00:00:00.000Z'),
      deadline: new Date('2026-09-28T23:59:59.000Z'),
      requiredDocuments: 'Resume, PG Degree, Experience Certificate',
      eligibilityCriteria: 'Proficiency in MS Office and university HR procedures.',
      status: 'PUBLISHED',
      createdBy: adminUser.id
    },
    {
      vacancyNumber: 'VAC-2026-006',
      position: 'Senior Architect',
      type: 'NON_TEACHING',
      department: 'Estate & Civil Engineering',
      schoolId: schoolsMap['Estate & Civil Engineering']?.id,
      departmentId: departmentsMap['Civil Infrastructure & Planning-Estate & Civil Engineering']?.id,
      positionId: positionsMap['Senior Architect-Civil Infrastructure & Planning-Estate & Civil Engineering']?.id,
      employmentType: 'Full Time',
      numPositions: 1,
      qualification: 'B.Arch / M.Arch with Council of Architecture registration.',
      experience: '5+ years managing campus infrastructure projects.',
      skills: 'AutoCAD, Revit, Campus Master Planning, Building Approvals',
      description: 'Oversee architectural designs for new campus buildings, monitor contractor execution, and manage space allocation.',
      salaryScale: 'Consolidated Rs. 60,000 - 75,000 per month',
      location: 'Pune',
      openingDate: new Date('2026-08-15T00:00:00.000Z'),
      deadline: new Date('2026-10-01T23:59:59.000Z'),
      requiredDocuments: 'Resume, B.Arch Degree, CoA Registration Certificate',
      eligibilityCriteria: 'COA Registration mandatory.',
      status: 'DRAFT',
      createdBy: adminUser.id
    }
  ];

  console.log('[Seed] Inserting sample vacancies...');
  for (const v of sampleVacancies) {
    const existing = await prisma.job.findUnique({
      where: { vacancyNumber: v.vacancyNumber }
    });

    if (!existing) {
      await prisma.job.create({ data: v });
      console.log(`[Seed] Created vacancy: ${v.vacancyNumber} - ${v.position} (${v.status})`);
    } else {
      console.log(`[Seed] Vacancy ${v.vacancyNumber} already exists. Skipping.`);
    }
  }

  // 6. Seed Sample Vacancy Interest records
  const sampleInterests = [
    {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      mobile: '9876543210',
      schoolId: socSchool?.id,
      interestedPosition: 'Assistant Professor – Computer Science & Engineering',
      category: 'TEACHING',
      message: 'Interested in AI & Data Science teaching roles.',
      status: 'PENDING'
    },
    {
      name: 'Priya Verma',
      email: 'priya.verma@example.com',
      mobile: '9812345678',
      schoolId: bmpSchool?.id,
      interestedPosition: 'Graphic Designer',
      category: 'NON_TEACHING',
      message: 'Looking for digital design positions.',
      status: 'PENDING'
    }
  ];

  for (const item of sampleInterests) {
    const existing = await prisma.vacancyInterest.findFirst({
      where: { email: item.email, interestedPosition: item.interestedPosition }
    });

    if (!existing) {
      await prisma.vacancyInterest.create({ data: item });
      console.log(`[Seed] Created interest record for ${item.name} (${item.interestedPosition})`);
    }
  }

  console.log('[Seed] Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
