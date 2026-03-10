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
                        include: { plan: true }
                    }
                }
            });

            if (!org) {
                res.status(404).json({ error: 'Organization not found' });
                return;
            }

            const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
            const createdAt = (org as any).createdAt;
            const isInTrial = createdAt && (Date.now() - new Date(createdAt).getTime() < THREE_DAYS_MS);

            if (isInTrial) {
                // Free trial — grant access to all features
                next();
                return;
            }

            // Check features: Prefer the active subscription plan's features, fallback to legacy org featureFlags
            const activeSub = org.subscriptions[0];
            const activePlan = activeSub?.plan;

            const features = (activePlan?.features as Record<string, any>) || (org.featureFlags as Record<string, any>);
            const currentPlanName = activePlan?.name || (org as any).subscriptionTier || 'Free/Legacy';

            if (!features || !features[featureName]) {
                res.status(403).json({
                    error: `Upgrade Required`,
                    message: `Your current plan (${currentPlanName}) does not include ${featureName}.`
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
