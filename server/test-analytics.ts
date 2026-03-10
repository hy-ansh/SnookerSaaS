import prisma from './src/config/prisma';

async function testAnalytics() {
    const owner = await prisma.user.findFirst({
        where: { role: { name: 'STORE_OWNER' } }
    });

    if (!owner) {
        console.log("No STORE_OWNER found!");
        return;
    }

    console.log("Testing with owner:", owner.id, "org:", owner.organizationId);

    try {
        const organizationId = owner.organizationId;
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const period = '30d';
        let dateFilterQuery: any = {};
        if (period === '30d') {
            dateFilterQuery = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30) };
        } else if (period === '7d') {
            dateFilterQuery = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7) };
        }

        const sessionDateFilter = dateFilterQuery ? { startedAt: dateFilterQuery } : {};
        const sessionFilter: any = { status: 'COMPLETED', branch: { organizationId }, ...sessionDateFilter };

        const [completedSessions] = await Promise.all([
            prisma.session.findMany({
                where: sessionFilter,
                select: { durationMinutes: true, tableId: true, startedAt: true, endedAt: true }
            })
        ]);

        console.log("Found sessions:", completedSessions.length);
    } catch (e: any) {
        console.error("Error running query:", e.message);
    }
}

testAnalytics().finally(() => prisma.$disconnect());
