import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const createOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, subscriptionTier } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Organization name is required' });
            return;
        }

        const org = await prisma.organization.create({
            data: {
                name,
                subscriptionTier: subscriptionTier || 'FREE_TRIAL',
                featureFlags: {
                    canteenPOS: false,
                    splitBilling: true
                }
            }
        });

        // Create default roles for this new org
        const adminRole = await prisma.role.create({
            data: {
                organizationId: org.id,
                name: 'ADMIN',
                permissions: ['ALL']
            }
        });

        // Link the user who created this to the org and make them ADMIN
        if (req.user?.email) {
            await prisma.user.upsert({
                where: { email: req.user.email },
                update: {
                    organizationId: org.id,
                    roleId: adminRole.id
                },
                create: {
                    id: req.user.id, // from supabase token
                    email: req.user.email,
                    organizationId: org.id,
                    roleId: adminRole.id
                }
            });
        }

        res.status(201).json({ message: 'Organization created successfully', organization: org });
    } catch (err) {
        console.error('Error creating organization:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orgId } = req.params;

        const orgIdStr = typeof orgId === 'string' ? orgId : String(orgId);

        const org = await prisma.organization.findUnique({
            where: { id: orgIdStr },
            include: {
                branches: true
            }
        });

        if (!org) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        // Verify user belongs to this org
        if (req.user?.storeId !== org.id && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        res.status(200).json({ organization: org });
    } catch (err) {
        console.error('Error fetching organization:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAvailablePlans = async (req: Request, res: Response): Promise<void> => {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { price: 'asc' }
        });
        res.json(plans);
    } catch (err) {
        console.error('Error fetching available plans:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateOwnerSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;
        const { planId } = req.body;

        if (!organizationId) {
            res.status(403).json({ error: 'No organization linked' });
            return;
        }

        if (!planId) {
            res.status(400).json({ error: 'planId is required' });
            return;
        }

        // Verify plan exists
        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            res.status(404).json({ error: 'Subscription Plan not found' });
            return;
        }

        // Upsert the Subscription
        const subscription = await prisma.subscription.upsert({
            where: { organizationId },
            create: {
                organizationId,
                planId,
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1))
            },
            update: {
                planId,
                status: 'ACTIVE'
            },
            include: { plan: true }
        });

        // Sync legacy string on Org for fallback compatibility
        await prisma.organization.update({
            where: { id: organizationId },
            data: { subscriptionTier: plan.name }
        });

        res.json({ message: 'Subscription successfully upgraded', subscription });
    } catch (err) {
        console.error('Error updating owner subscription:', err);
        res.status(500).json({ error: 'Internal server error updating subscription' });
    }
};

export const getOwnerSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;
        if (!organizationId) {
            res.status(403).json({ error: 'No organization linked' });
            return;
        }

        const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
                subscriptions: {
                    include: { plan: true },
                    take: 5
                }
            }
        });

        if (!org) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const orgAny = org as any;
        const allSubs: any[] = orgAny.subscriptions || [];
        const activeSub = allSubs.find((s: any) => s.status === 'ACTIVE');

        const baseResponse = {
            orgCreatedAt: org.createdAt,
            orgIsActive: (org as any).isActive !== false
        };

        if (activeSub) {
            res.json({
                ...baseResponse,
                status: activeSub.status,
                planId: activeSub.planId,
                currentPeriodStart: activeSub.currentPeriodStart,
                currentPeriodEnd: activeSub.currentPeriodEnd,
                plan: {
                    id: activeSub.plan?.id,
                    name: activeSub.plan?.name,
                    price: Number(activeSub.plan?.price ?? 0),
                    interval: 'month',
                    features: activeSub.plan?.features || {}
                }
            });
            return;
        }

        // No active subscription — return null plan with org metadata for trial logic
        res.json({
            ...baseResponse,
            status: 'NO_SUB',
            plan: null,
            currentPeriodEnd: null
        });
    } catch (err) {
        console.error('Error fetching owner sub:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};


export const getOrganizationUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;
        if (!organizationId) {
            res.status(403).json({ error: 'No organization linked' });
            return;
        }

        const users = await prisma.user.findMany({
            where: { organizationId },
            include: {
                role: true,
                branch: true
            },
            orderBy: { email: 'asc' }
        });

        // Map data to prevent sensitive leaks and format for UI
        const mappedUsers = (users as any[]).map(u => ({
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            role: u.role?.name || 'PLAYER',
            branchName: u.branch?.name || 'All Branches',
            createdAt: new Date().toISOString() // Fallback to current date for the UI
        }));

        res.json({ users: mappedUsers });
    } catch (err) {
        console.error('Error fetching organization users:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
