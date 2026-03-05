import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Mark all payments for completed sessions as SUCCESS (they were mistakenly created as PENDING)
    const result = await prisma.payment.updateMany({
        where: {
            status: 'PENDING',
            session: { status: 'COMPLETED' }
        },
        data: { status: 'SUCCESS' }
    });
    console.log(`✅ Updated ${result.count} payments from PENDING → SUCCESS`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
