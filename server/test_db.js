require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('Connecting...');
  
  // Test connection
  try {
    const count = await p.user.count();
    console.log('Connection successful. Total users:', count);
  } catch (err) {
    console.error('Connection failed:', err);
    return;
  }

  // Get staff users
  const staffUsers = await p.user.findMany({
    where: { role: { name: 'STAFF' } },
    include: { role: true, organization: true, branch: true }
  });
  
  console.log('\n--- STAFF USERS ---');
  for (const u of staffUsers) {
    console.log(`ID: ${u.id}`);
    console.log(`Email: ${u.email}`);
    console.log(`Role: ${u.role?.name} (org: ${u.role?.organizationId})`);
    console.log(`Org: ${u.organization?.name} (${u.organizationId})`);
    console.log(`Branch: ${u.branch?.name} (${u.branchId})`);
    console.log('-------------------');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => p.$disconnect());
