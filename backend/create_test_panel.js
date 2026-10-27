// Script: Create Test Panel with nishantchaubey8004@gmail.com as panelist
require('dotenv').config({ path: './.env' });

let PrismaClient;
try {
  PrismaClient = require('./node_modules/@prisma/client').PrismaClient;
} catch {
  PrismaClient = require('@prisma/client').PrismaClient;
}

const p = new PrismaClient();

async function main() {
  console.log('--- Creating Test Panel for nishantchaubey8004@gmail.com ---');

  // 1. Check if test panel already exists
  let panel = await p.interviewPanel.findFirst({
    where: { code: 'TEST' }
  });

  if (panel) {
    console.log('Test panel already exists:', panel.id, '—', panel.name);
  } else {
    panel = await p.interviewPanel.create({
      data: {
        name: 'Test Panel',
        code: 'TEST',
        description: 'Test panel for email verification and end-to-end testing'
      }
    });
    console.log('✅ Created Test Panel:', panel.id);
  }

  // 2. Check if panelist already exists in this panel
  const existingMember = await p.panelMember.findFirst({
    where: {
      panelId: panel.id,
      email: 'nishantchaubey8004@gmail.com'
    }
  });

  if (existingMember) {
    console.log('✅ Panelist already exists:', existingMember.id);
    await p.panelMember.update({
      where: { id: existingMember.id },
      data: { isActive: true, name: 'Nishant Chaubey (Admin)' }
    });
    console.log('   Ensured isActive=true and name updated.');
  } else {
    const member = await p.panelMember.create({
      data: {
        panelId: panel.id,
        name: 'Nishant Chaubey (Admin)',
        email: 'nishantchaubey8004@gmail.com',
        designation: 'Portal Administrator',
        isActive: true
      }
    });
    console.log('✅ Created test panelist:', member.id);
  }

  // 3. Print current state of all panels
  const allPanels = await p.interviewPanel.findMany({
    include: { members: { orderBy: { createdAt: 'asc' } } },
    orderBy: { code: 'asc' }
  });

  console.log('\n--- All Panels in Database ---');
  for (const panel of allPanels) {
    console.log(`\n  [${panel.code}] ${panel.name}`);
    if (panel.description) console.log(`       ${panel.description}`);
    for (const m of panel.members) {
      console.log(`       • ${m.isActive ? '✅' : '❌'} ${m.name} — ${m.email} (${m.designation || 'No designation'})`);
    }
    if (panel.members.length === 0) console.log('       (no members yet)');
  }

  console.log('\n✅ Done. Restart the dev server for the Prisma client fix to take effect.');
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
}).finally(() => p.$disconnect());
