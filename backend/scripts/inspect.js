require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const schools = await prisma.school.findMany({
    where: { NOT: { name: { startsWith: '[ARCHIVED]' } } },
    include: { departments: { include: { programs: true } } },
    orderBy: { type: 'asc' }
  });

  let deptCount = 0, progCount = 0;
  console.log('\n=== APPROVED UNIVERSITY STRUCTURE IN DATABASE ===\n');
  for (const sch of schools) {
    console.log(`[${sch.type}] ${sch.name} (${sch.faculty || 'N/A'}) [Code: ${sch.code}]`);
    for (const dept of sch.departments) {
      deptCount++;
      console.log(`   > ${dept.name}`);
      for (const prog of dept.programs) {
        progCount++;
        console.log(`       ~ ${prog.name}`);
      }
    }
  }

  const archived = await prisma.school.count({ where: { name: { startsWith: '[ARCHIVED]' } } });
  const programs = await prisma.program.count();
  console.log(`\n=== TOTALS ===`);
  console.log(`  Active Schools:  ${schools.length}`);
  console.log(`  Departments:     ${deptCount}`);
  console.log(`  Programs:        ${progCount} (DB: ${programs})`);
  console.log(`  Archived (old):  ${archived}`);
  process.exit(0);
}

run();
