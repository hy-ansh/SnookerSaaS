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
                where: { id: organizationId }
            });

            if (!org) {
                res.status(404).json({ error: 'Organization not found' });
                return;
            }

            // Or strictly check based on string. For production, strictly evaluate the JSON.
            // If it's a trial org, check creation date
            // Note: In an ideal scenario we could check the attached `SubscriptionPlan`,
            // but `requireFeature` operates at an organization string tier level right now for simplicity.

            const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
            const createdAt = (org as any).createdAt;
            const isInTrial = createdAt && (Date.now() - new Date(createdAt).getTime() < THREE_DAYS_MS);

            if (isInTrial) {
                // Free trial — grant access to all features
                next();
                return;
            }

            // Check the features JSON payload
            const features = org.featureFlags as Record<string, any>;

            if (!features || !features[featureName]) {
                res.status(403).json({
                    error: `Upgrade Required`,
                    message: `Your current plan (${org.subscriptionTier}) does not include ${featureName}.`
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
