// Full end-to-end verify using backend's services/prisma.js
require('dotenv').config({ path: './.env' });
const prisma = require('./src/services/prisma');

async function main() {
  try {
    console.log('Testing prisma.js -> interview.findFirst (was failing with "title does not exist")...');
    const r = await prisma.interview.findFirst({
      where: { status: { in: ['SCHEDULED', 'RESCHEDULED'] } },
      orderBy: { createdAt: 'desc' }
    });
    console.log('✅ interview.findFirst(): OK —', r ? 'found row' : 'no rows yet (expected, DB is empty)');

    const panels = await prisma.interviewPanel.findMany({
      include: { members: true },
      orderBy: { code: 'asc' }
    });
    console.log(`✅ interviewPanel.findMany(): ${panels.length} panel(s):`);
    panels.forEach(p => {
      console.log(`   [${p.code}] ${p.name} — ${p.members.filter(m => m.isActive).length} active members`);
      p.members.forEach(m => console.log(`         ${m.isActive ? '✅' : '❌'} ${m.name} <${m.email}>`));
    });

    console.log('\n✅ ALL CHECKS PASSED — Prisma client is healthy. The dev server will use this after nodemon restarts.');
  } catch (e) {
    console.error('❌ ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
