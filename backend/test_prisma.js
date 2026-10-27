// Test backend Prisma client for Interview.title column
require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  try {
    const r = await p.interview.findFirst({ where: {} });
    console.log('findFirst OK — result:', r ? JSON.stringify(r).slice(0, 200) : 'null (no rows yet)');
    
    const cols = await p.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Interview' ORDER BY ordinal_position`
    );
    console.log('Interview table columns:', cols.map(c => c.column_name).join(', '));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
}
main();
