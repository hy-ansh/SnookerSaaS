import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export const requireFeature = (featureName: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const organizationId = req.user?.storeId;

            if (!organizationId) {
                res.status(403).json({ error: 'No organization linked to this user' });
                return;
            }

            // Fetch the organization and their active subscription
            const org = await prisma.organization.findUnique({
                where: { id: organizationId },
                include: {
                    subscriptions: {
                        where: { status: 'ACTIVE' },
                        include: { plan: true },
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            });

            if (!org) {
                res.status(404).json({ error: 'Organization not found' });
                return;
            }

            // If it's a legacy org without a proper Subscription relation, allow access to ease transition,
            // or strictly check based on string. For production, strictly evaluate the JSON.
            // If it's a trial org (no active subscription), check creation date
            if (!org.subscriptions || org.subscriptions.length === 0) {
                const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
                const createdAt = (org as any).createdAt;
                const isInTrial = createdAt && (Date.now() - new Date(createdAt).getTime() < THREE_DAYS_MS);
                if (isInTrial) {
                    // Free trial — grant access to all features
                    next();
                    return;
                }
                // Legacy subscriptionTier check for older records
                if (org.subscriptionTier && org.subscriptionTier !== 'FREE_TRIAL') {
                    next();
                    return;
                }
                res.status(403).json({ error: `Subscription required for feature: ${featureName}` });
                return;
            }

            const activePlan = org.subscriptions[0].plan;

            // Check the features JSON payload
            const features = activePlan?.features as Record<string, any>;

            if (!features || !features[featureName]) {
                res.status(403).json({
                    error: `Upgrade Required`,
                    message: `Your current plan (${activePlan?.name}) does not include ${featureName}.`
                });
                return;
            }

            next();
        } catch (error) {
            console.error(`Error checking feature flag ${featureName}:`, error);
            res.status(500).json({ error: 'Internal server error verifying subscription features' });
        }
    };
};
