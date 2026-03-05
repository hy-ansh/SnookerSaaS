import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting backfill of missing organizationId for STAFF users...');

    // Find all users who are missing an organizationId but have a role assigned
    const orphanedUsers = await prisma.user.findMany({
        where: {
            organizationId: null,
            roleId: { not: null }
        },
        include: { role: true }
    });

    console.log(`Found ${orphanedUsers.length} orphaned users missing organizationId.`);

    let updatedCount = 0;
    for (const user of orphanedUsers) {
        if (user.role?.organizationId) {
            await prisma.user.update({
                where: { id: user.id },
                data: { organizationId: user.role.organizationId }
            });
            console.log(`Updated user ${user.email} with orgId ${user.role.organizationId}`);
            updatedCount++;
        } else {
            // If the role itself somehow doesn't have an org, assign the first org as a fallback (for test envs)
            const firstOrg = await prisma.organization.findFirst();
            if (firstOrg) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { organizationId: firstOrg.id }
                });
                console.log(`Updated user ${user.email} with fallback orgId ${firstOrg.id}`);
                updatedCount++;
            }
        }
    }

    console.log(`Backfill complete. Updated ${updatedCount} users.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
