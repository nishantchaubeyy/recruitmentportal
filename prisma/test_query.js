const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  try {
    // Test 1: findFirst on Interview
    const r = await p.interview.findFirst({ where: {} });
    console.log('findFirst OK — result:', r ? JSON.stringify(r).slice(0, 120) : 'null (no rows)');

    // Test 2: Check columns by querying raw
    const cols = await p.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Interview' ORDER BY ordinal_position`
    );
    console.log('Interview columns:', cols.map(c => c.column_name).join(', '));

    // Test 3: Check panels
    const panels = await p.interviewPanel.findMany({ include: { members: true } });
    console.log('Panels:', panels.map(panel => `${panel.name} (${panel.members.length} members)`).join(', ') || 'NONE');

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
}
main();
