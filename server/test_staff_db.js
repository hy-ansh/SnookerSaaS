require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function checkUsers() {
  const staffUsers = await p.user.findMany({ 
      where: { role: { name: 'STAFF' } },
      include: { role: true, organization: true }
  });
  
  if (staffUsers.length === 0) {
      console.log('No staff users found');
  } else {
      console.log('Testing with staff email:', staffUsers[0].email);
      console.log('Staff details:', JSON.stringify(staffUsers, null, 2));
  }
  
  const noOrgUsers = await p.user.findMany({
    where: { organizationId: null },
    include: { role: true }
  });
  console.log('\n=== USERS WITHOUT ORG ===');
  for (const u of noOrgUsers) {
    console.log(`  id=${u.id}, email=${u.email}, roleId=${u.roleId}, role=${u.role?.name}`);
  }
}
checkUsers().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
