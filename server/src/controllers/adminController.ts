import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get Subscription Details for a Tenant
export const getSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId; // Or from org ID if tenant
        if (!organizationId) {
            res.status(400).json({ error: 'Organization ID not found in token' });
            return;
        }

        const subscription = await prisma.subscription.findUnique({
            where: { organizationId },
            include: {
                plan: true,
                invoices: {
                    orderBy: { dueDate: 'desc' },
                    take: 5
                }
            }
        });

        res.json(subscription); // If null, the frontend will show the 'No Subscription' state
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Admin Endpoints Below (Require SUPER_ADMIN)

// Get Global SaaS Metrics
export const getGlobalMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
        const activeTenants = await prisma.organization.count();
        const activeSubscriptions = await prisma.subscription.count({
            where: { status: 'ACTIVE' }
        });

        // Basic MRR calculation: Sum of active subscription plan prices
        const subs = await prisma.subscription.findMany({
            where: { status: 'ACTIVE' },
            include: { plan: true }
        });

        const mrr = subs.reduce((acc: number, sub: any) => acc + Number(sub.plan.price), 0);

        res.json({
            activeTenants,
            activeSubscriptions,
            monthlyRecurringRevenue: mrr
        });
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get All Tenants (Organizations)
export const getTenants = async (req: Request, res: Response): Promise<void> => {
    try {
        const tenants = await prisma.organization.findMany({
            include: {
                subscriptions: {
                    include: { plan: true }
                },
                branches: {
                    select: { id: true }
                },
                users: {
                    include: { role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Enrich each tenant: find the primary owner user and count branches
        const enriched = tenants.map((tenant: any) => {
            const ownerUser = tenant.users.find(
                (u: any) => u.role?.name === 'STORE_OWNER'
            ) || tenant.users.find(
                (u: any) => u.role?.name === 'ADMIN'
            ) || tenant.users[0];

            return {
                id: tenant.id,
                name: tenant.name,
                isActive: tenant.isActive,
                subscriptionTier: tenant.subscriptionTier,
                createdAt: tenant.createdAt,
                featureFlags: tenant.featureFlags,
                subscriptions: tenant.subscriptions,
                branchCount: tenant.branches.length,
                owner: ownerUser ? {
                    id: ownerUser.id,
                    email: ownerUser.email,
                    fullName: ownerUser.fullName,
                    role: ownerUser.role?.name
                } : null
            };
        });

        res.json(enriched);
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get Subscription Plans
export const getSubscriptionPlans = async (req: Request, res: Response): Promise<void> => {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { price: 'asc' }
        });
        res.json(plans);
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create Subscription Plan
export const createSubscriptionPlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, price, features } = req.body;

        if (!name || price === undefined) {
            res.status(400).json({ error: 'Plan name and price are required' });
            return;
        }

        const plan = await prisma.subscriptionPlan.create({
            data: {
                name,
                price: Number(price),
                features: features || {}
            }
        });

        res.status(201).json(plan);
    } catch (error) {
        console.error('Error creating plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get Active Fraud Alerts
export const getFraudAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
        const alerts = await prisma.fraudAlert.findMany({
            where: { resolved: false },
            include: {
                organization: { select: { name: true } },
                branch: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(alerts);
    } catch (error) {
        console.error('Error fetching fraud alerts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Resolve Fraud Alert
export const resolveFraudAlert = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const alert = await prisma.fraudAlert.update({
            where: { id },
            data: { resolved: true }
        });

        res.json(alert);
    } catch (error) {
        console.error('Error resolving fraud alert:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update Tenant Status (Pause / Resume Account)
export const updateTenantStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            res.status(400).json({ error: 'isActive must be a boolean' });
            return;
        }

        // Use raw SQL to bypass stale Prisma client (isActive was just added to schema)
        await prisma.$executeRaw`UPDATE "Organization" SET "isActive" = ${isActive}, "updatedAt" = NOW() WHERE "id" = ${id}`;

        // Return the updated org (using any to bypass type-checking for new field)
        const orgs: any[] = await prisma.$queryRaw`SELECT * FROM "Organization" WHERE "id" = ${id} LIMIT 1`;
        const org = orgs[0] || { id, isActive };

        res.json(org);
    } catch (error) {
        console.error('Error updating tenant status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Force Change Tenant Subscription Plan
export const updateTenantSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const { planId } = req.body;

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

        // Upsert the tenant's Subscription record
        const subscription = await prisma.subscription.upsert({
            where: { organizationId: id },
            create: {
                organizationId: id,
                planId: planId,
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)) // 1 month from now
            },
            update: {
                planId: planId,
                status: 'ACTIVE' // Ensure they aren't stuck on incomplete or canceled
            },
            include: { plan: true }
        });

        // Update the legacy tier string on Organization just in case anything else relies on it temporarily
        await prisma.organization.update({
            where: { id },
            data: { subscriptionTier: plan.name }
        });

        res.json(subscription);
    } catch (error) {
        console.error('Error forcefully updating tenant subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update Subscription Plan (Prices, Features, Name)
export const updateSubscriptionPlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const { name, price, features } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = Number(price);
        if (features !== undefined) updateData.features = features;

        const plan = await prisma.subscriptionPlan.update({
            where: { id },
            data: updateData
        });

        res.json(plan);
    } catch (error) {
        console.error('Error updating subscription plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete a Subscription Plan 
// Note: This might fail if subscriptions are actively attached due to foreign key constraints,
// which is actually a good safety net.
export const deleteSubscriptionPlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };

        // Count active subs on this plan
        const tiedSubs = await prisma.subscription.count({ where: { planId: id } });
        if (tiedSubs > 0) {
            res.status(409).json({ error: `Cannot delete plan while ${tiedSubs} organizations are actively subscribed to it.` });
            return;
        }

        await prisma.subscriptionPlan.delete({ where: { id } });
        res.json({ success: true, message: 'Plan deleted' });
    } catch (error: any) {
        console.error('Error deleting subscription plan:', error);
        if (error.code === 'P2003') { // Prisma foreign key violation code
            res.status(409).json({ error: 'Cannot delete plan because it is referenced by existing subscriptions or invoices.' });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};
