import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all advertisements (Admin)
export const getAdvertisements = async (req: Request, res: Response): Promise<void> => {
    try {
        const ads = await prisma.advertisement.findMany({
            include: {
                placements: true,
                planVisibilities: {
                    include: { plan: true }
                }
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
        });
        res.json(ads);
    } catch (error) {
        console.error('Error fetching advertisements:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create an advertisement
export const createAdvertisement = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, imageUrl, redirectUrl, isActive, startDate, endDate, priority, placements, planIds } = req.body;

        if (!title || !imageUrl) {
            res.status(400).json({ error: 'Title and imageUrl are required' });
            return;
        }

        const ad = await prisma.advertisement.create({
            data: {
                title,
                imageUrl,
                redirectUrl,
                isActive: isActive !== undefined ? isActive : true,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                priority: priority || 0,
                placements: {
                    create: (placements || []).map((p: string) => ({ placementName: p }))
                },
                planVisibilities: planIds?.length > 0 ? {
                    create: planIds.map((id: string) => ({ planId: id }))
                } : {
                    create: [{ planId: null }] // null means applies to all plans that have ads enabled
                }
            },
            include: {
                placements: true,
                planVisibilities: true
            }
        });

        res.status(201).json(ad);
    } catch (error) {
        console.error('Error creating advertisement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update an advertisement
export const updateAdvertisement = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const { title, imageUrl, redirectUrl, isActive, startDate, endDate, priority, placements, planIds } = req.body;

        // Delete existing relations to overwrite
        if (placements !== undefined) {
            await prisma.adPlacement.deleteMany({ where: { advertisementId: id } });
        }
        if (planIds !== undefined) {
            await prisma.adPlanVisibility.deleteMany({ where: { advertisementId: id } });
        }

        const ad = await prisma.advertisement.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(imageUrl && { imageUrl }),
                ...(redirectUrl !== undefined && { redirectUrl }),
                ...(isActive !== undefined && { isActive }),
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(priority !== undefined && { priority: Number(priority) }),

                ...(placements !== undefined && {
                    placements: {
                        create: placements.map((p: string) => ({ placementName: p }))
                    }
                }),
                ...(planIds !== undefined && {
                    planVisibilities: planIds.length > 0 ? {
                        create: planIds.map((pId: string) => ({ planId: pId }))
                    } : {
                        create: [{ planId: null }]
                    }
                })
            },
            include: {
                placements: true,
                planVisibilities: { include: { plan: true } }
            }
        });

        res.json(ad);
    } catch (error) {
        console.error('Error updating advertisement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete an advertisement
export const deleteAdvertisement = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        await prisma.advertisement.delete({ where: { id } });
        res.json({ success: true, message: 'Advertisement deleted successfully' });
    } catch (error) {
        console.error('Error deleting advertisement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ==========================================
// PUBLIC / OWNER API
// ==========================================

export const getActiveAds = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;
        const placement = req.query.placement ? String(req.query.placement) : undefined;

        if (!organizationId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Get organization and active plan
        const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    take: 1
                }
            }
        });

        if (!org) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const activePlan = org.subscriptions?.[0]?.plan;

        // Check if user is in trial, or if ads are disabled on their plan
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
        const createdAt = (org as any).createdAt;
        const isInTrial = createdAt && (Date.now() - new Date(createdAt).getTime() < THREE_DAYS_MS);

        const hasSub = org.subscriptions && org.subscriptions.length > 0;
        const adsEnabled = hasSub ? activePlan?.adsEnabled === true : true; // Usually ads enabled on Trial & Free plans

        if (!adsEnabled && !isInTrial) {
            // Strictly enforce ads logic. If ads are not enabled for this tier, return empty.
            res.json([]);
            return;
        }

        // Fetch active ads
        const now = new Date();
        const ads = await prisma.advertisement.findMany({
            where: {
                isActive: true,
                OR: [
                    { startDate: null },
                    { startDate: { lte: now } }
                ],
                AND: [
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: now } }
                        ]
                    }
                ],
                ...(placement ? {
                    placements: {
                        some: { placementName: placement }
                    }
                } : {}),
                planVisibilities: {
                    some: {
                        OR: [
                            { planId: null }, // Global Ad
                            { planId: activePlan?.id } // Targeted Ad
                        ]
                    }
                }
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
        });

        res.json(ads);
    } catch (error) {
        console.error('Error fetching active advertisements:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
