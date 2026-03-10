import { Request, Response } from 'express';
import prisma from '../config/prisma';
import crypto from 'crypto';
import Razorpay from 'razorpay';

// Lazy-initialize Razorpay to ensure dotenv has loaded env vars first.
// (ES module imports are hoisted above dotenv.config(), so top-level init
//  runs before env vars are available.)
let razorpay: Razorpay | null = null;
function getRazorpay(): Razorpay | null {
    if (!razorpay && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID as string,
            key_secret: process.env.RAZORPAY_KEY_SECRET as string,
        });
    }
    return razorpay;
}


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

export const updatePaymentMethods = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;
        const { allowedPaymentMethods } = req.body;

        if (!organizationId) {
            res.status(403).json({ error: 'No organization linked' });
            return;
        }
        if (!Array.isArray(allowedPaymentMethods)) {
            res.status(400).json({ error: 'allowedPaymentMethods must be an array' });
            return;
        }

        const org = await prisma.organization.update({
            where: { id: organizationId },
            data: { allowedPaymentMethods }
        });

        res.json({ message: 'Payment methods updated successfully', allowedPaymentMethods: org.allowedPaymentMethods });
    } catch (err) {
        console.error('Error updating payment methods:', err);
        res.status(500).json({ error: 'Internal server error updating payment methods' });
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

        // We consciously DO NOT update the deprecated `subscriptionTier` here. Rely on Subscription relation.
        // await prisma.organization.update({
        //     where: { id: organizationId },
        //     data: { subscriptionTier: plan.name }
        // });

        res.json({ message: 'Subscription successfully upgraded', subscription });
    } catch (err) {
        console.error('Error updating owner subscription:', err);
        res.status(500).json({ error: 'Internal server error updating subscription' });
    }
};

export const createRazorpayOrder = async (req: Request, res: Response): Promise<void> => {
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

        if (!getRazorpay()) {
            res.status(500).json({ error: 'Razorpay is not configured on the server' });
            return;
        }

        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            res.status(404).json({ error: 'Subscription Plan not found' });
            return;
        }

        // Razorpay works in subunits (paise for INR)
        const amount = Math.round(Number(plan.price) * 100);

        const options = {
            amount: amount,
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: {
                organizationId,
                planId
            }
        };

        const order = await getRazorpay()!.orders.create(options);

        // Optional: you can save the pending order in DB here, but Razorpay webhooks/callbacks handle success.

        res.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (err) {
        console.error('Error creating Razorpay order:', err);
        res.status(500).json({ error: 'Internal server error creating order' });
    }
};

export const verifyRazorpayPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

        if (!organizationId) {
            res.status(403).json({ error: 'No organization linked' });
            return;
        }

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
            res.status(400).json({ error: 'Missing required payment verification details' });
            return;
        }

        const secret = process.env.RAZORPAY_KEY_SECRET as string;

        // Verify signature
        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            res.status(400).json({ error: 'Invalid payment signature' });
            return;
        }

        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            res.status(404).json({ error: 'Subscription Plan not found' });
            return;
        }

        // Upsert Subscription since payment is valid
        const subscription = await prisma.subscription.upsert({
            where: { organizationId },
            create: {
                organizationId,
                planId: plan.id,
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1))
            },
            update: {
                planId: plan.id,
                status: 'ACTIVE',
                currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1))
            },
            include: { plan: true }
        });

        // We consciously DO NOT update the deprecated `subscriptionTier` here. Rely on Subscription relation.
        // await prisma.organization.update({
        //     where: { id: organizationId },
        //     data: { subscriptionTier: plan.name }
        // });

        // Also record the invoice
        await prisma.invoice.create({
            data: {
                subscriptionId: subscription.id,
                amount: plan.price,
                status: 'PAID',
                dueDate: new Date(),
                paidAt: new Date()
            }
        });

        res.json({ message: 'Payment verified and subscription activated', subscription });

    } catch (err) {
        console.error('Error verifying Razorpay payment:', err);
        res.status(500).json({ error: 'Internal server error verifying payment' });
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
                    include: {
                        plan: true,
                        invoices: {
                            orderBy: { dueDate: 'desc' }
                        }
                    },
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
                invoices: activeSub.invoices || [],
                plan: {
                    id: activeSub.plan?.id,
                    name: activeSub.plan?.name,
                    price: Number(activeSub.plan?.price ?? 0),
                    interval: 'month',
                    adsEnabled: activeSub.plan?.adsEnabled ?? true,
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
