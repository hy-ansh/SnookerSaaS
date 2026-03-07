import { AlertSeverity } from '@prisma/client';
import prisma from '../config/prisma';

/**
 * Sweeps recently completed or cancelled sessions to look for anomalies.
 * If found, generates a Fraud Alert for the Super Admin.
 */
export const runFraudDetectionSweep = async () => {
    try {
        console.log('[FraudService] Running background sweep...');

        // 1. Look for High Cancellation Rates (Ghosted Revenue)
        // Let's get all cancelled sessions in the last 24h grouped by branch
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const recentCancellations = await prisma.session.findMany({
            where: {
                status: 'CANCELLED',
                startedAt: { gte: yesterday }
            },
            include: { branch: true }
        });

        // Group by organization
        const orgCancellationCounts: Record<string, { count: number, branchId: string }> = {};

        recentCancellations.forEach(session => {
            const orgId = session.branch.organizationId;
            if (!orgCancellationCounts[orgId]) {
                orgCancellationCounts[orgId] = { count: 0, branchId: session.branchId };
            }
            orgCancellationCounts[orgId].count += 1;
        });

        // If an org cancels more than 5 sessions in 24h, flag it
        for (const orgId in orgCancellationCounts) {
            if (orgCancellationCounts[orgId].count >= 5) {
                // Check if alert already exists today to prevent spam
                const existingAlert = await prisma.fraudAlert.findFirst({
                    where: {
                        organizationId: orgId,
                        description: { contains: 'High number of session cancellations' },
                        createdAt: { gte: yesterday }
                    }
                });

                if (!existingAlert) {
                    await prisma.fraudAlert.create({
                        data: {
                            organizationId: orgId,
                            branchId: orgCancellationCounts[orgId].branchId,
                            severity: AlertSeverity.HIGH,
                            description: `High number of session cancellations (${orgCancellationCounts[orgId].count} in 24h). Potential ghosted revenue.`
                        }
                    });
                    console.log(`[FraudService] High alert generated for Org: ${orgId}`);
                }
            }
        }

        // Add additional checks here:
        // 2. High number of zero-dollar manual settlements
        // 3. Excessive pause durations

        console.log('[FraudService] Sweep complete.');

    } catch (error) {
        console.error('[FraudService] Error during sweep:', error);
    }
};
