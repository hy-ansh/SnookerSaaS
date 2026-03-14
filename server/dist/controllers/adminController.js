"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = exports.deleteSubscriptionPlan = exports.updateSubscriptionPlan = exports.updateTenantSubscription = exports.updateTenantStatus = exports.resolveFraudAlert = exports.getFraudAlerts = exports.createSubscriptionPlan = exports.getSubscriptionPlans = exports.getTenants = exports.getGlobalMetrics = exports.getSubscription = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
// Get Subscription Details for a Tenant
const getSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId; // Or from org ID if tenant
        if (!organizationId) {
            res.status(400).json({ error: 'Organization ID not found in token' });
            return;
        }
        const subscription = yield prisma_1.default.subscription.findUnique({
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
    }
    catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getSubscription = getSubscription;
// Admin Endpoints Below (Require SUPER_ADMIN)
// Get Global SaaS Metrics
const getGlobalMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activeTenants = yield prisma_1.default.organization.count();
        const activeSubscriptions = yield prisma_1.default.subscription.count({
            where: { status: 'ACTIVE' }
        });
        // Basic MRR calculation: Sum of active subscription plan prices
        const subs = yield prisma_1.default.subscription.findMany({
            where: { status: 'ACTIVE' },
            include: { plan: true }
        });
        const mrr = subs.reduce((acc, sub) => acc + Number(sub.plan.price), 0);
        res.json({
            activeTenants,
            activeSubscriptions,
            monthlyRecurringRevenue: mrr
        });
    }
    catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getGlobalMetrics = getGlobalMetrics;
// Get All Tenants (Organizations)
const getTenants = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tenants = yield prisma_1.default.organization.findMany({
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
        const enriched = tenants.map((tenant) => {
            var _a, _b, _c, _d;
            const ownerUser = tenant.users.find((u) => { var _a; return ((_a = u.role) === null || _a === void 0 ? void 0 : _a.name) === 'STORE_OWNER'; }) || tenant.users.find((u) => { var _a; return ((_a = u.role) === null || _a === void 0 ? void 0 : _a.name) === 'ADMIN'; }) || tenant.users[0];
            // Dynamically derive the active plan from the subscription relation
            const activePlan = (_c = (_b = (_a = tenant.subscriptions) === null || _a === void 0 ? void 0 : _a.find((s) => s.status === 'ACTIVE')) === null || _b === void 0 ? void 0 : _b.plan) === null || _c === void 0 ? void 0 : _c.name;
            return {
                id: tenant.id,
                name: tenant.name,
                isActive: tenant.isActive,
                subscriptionTier: activePlan || tenant.subscriptionTier,
                createdAt: tenant.createdAt,
                featureFlags: tenant.featureFlags,
                subscriptions: tenant.subscriptions,
                branchCount: tenant.branches.length,
                owner: ownerUser ? {
                    id: ownerUser.id,
                    email: ownerUser.email,
                    fullName: ownerUser.fullName,
                    role: (_d = ownerUser.role) === null || _d === void 0 ? void 0 : _d.name
                } : null
            };
        });
        res.json(enriched);
    }
    catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getTenants = getTenants;
// Get Subscription Plans
const getSubscriptionPlans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plans = yield prisma_1.default.subscriptionPlan.findMany({
            orderBy: { price: 'asc' }
        });
        res.json(plans);
    }
    catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getSubscriptionPlans = getSubscriptionPlans;
// Create Subscription Plan
const createSubscriptionPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, type, price, billingCycle, features, adsEnabled, isActive } = req.body;
        if (!name || price === undefined) {
            res.status(400).json({ error: 'Plan name and price are required' });
            return;
        }
        const plan = yield prisma_1.default.subscriptionPlan.create({
            data: {
                name,
                type: type || 'pro',
                price: Number(price),
                billingCycle: billingCycle || 'monthly',
                features: features || {},
                adsEnabled: adsEnabled !== undefined ? Boolean(adsEnabled) : false,
                isActive: isActive !== undefined ? Boolean(isActive) : true
            }
        });
        res.status(201).json(plan);
    }
    catch (error) {
        console.error('Error creating plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.createSubscriptionPlan = createSubscriptionPlan;
// Get Active Fraud Alerts
const getFraudAlerts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const alerts = yield prisma_1.default.fraudAlert.findMany({
            where: { resolved: false },
            include: {
                organization: { select: { name: true } },
                branch: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(alerts);
    }
    catch (error) {
        console.error('Error fetching fraud alerts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getFraudAlerts = getFraudAlerts;
// Resolve Fraud Alert
const resolveFraudAlert = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const alert = yield prisma_1.default.fraudAlert.update({
            where: { id },
            data: { resolved: true }
        });
        res.json(alert);
    }
    catch (error) {
        console.error('Error resolving fraud alert:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.resolveFraudAlert = resolveFraudAlert;
// Update Tenant Status (Pause / Resume Account)
const updateTenantStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        if (typeof isActive !== 'boolean') {
            res.status(400).json({ error: 'isActive must be a boolean' });
            return;
        }
        // Use raw SQL to bypass stale Prisma client (isActive was just added to schema)
        yield prisma_1.default.$executeRaw `UPDATE "Organization" SET "isActive" = ${isActive}, "updatedAt" = NOW() WHERE "id" = ${id}`;
        // Return the updated org (using any to bypass type-checking for new field)
        const orgs = yield prisma_1.default.$queryRaw `SELECT * FROM "Organization" WHERE "id" = ${id} LIMIT 1`;
        const org = orgs[0] || { id, isActive };
        res.json(org);
    }
    catch (error) {
        console.error('Error updating tenant status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateTenantStatus = updateTenantStatus;
// Force Change Tenant Subscription Plan
const updateTenantSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { planId } = req.body;
        if (!planId) {
            res.status(400).json({ error: 'planId is required' });
            return;
        }
        // Verify plan exists
        const plan = yield prisma_1.default.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            res.status(404).json({ error: 'Subscription Plan not found' });
            return;
        }
        // Upsert the tenant's Subscription record
        const subscription = yield prisma_1.default.subscription.upsert({
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
        // We consciously DO NOT update the deprecated `subscriptionTier` here. Rely on Subscription relation.
        // await prisma.organization.update({
        //     where: { id },
        //     data: { subscriptionTier: plan.name }
        // });
        res.json(subscription);
    }
    catch (error) {
        console.error('Error forcefully updating tenant subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateTenantSubscription = updateTenantSubscription;
// Update Subscription Plan (Prices, Features, Name)
const updateSubscriptionPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, type, price, billingCycle, features, adsEnabled, isActive } = req.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (type !== undefined)
            updateData.type = type;
        if (price !== undefined)
            updateData.price = Number(price);
        if (billingCycle !== undefined)
            updateData.billingCycle = billingCycle;
        if (features !== undefined)
            updateData.features = features;
        if (adsEnabled !== undefined)
            updateData.adsEnabled = Boolean(adsEnabled);
        if (isActive !== undefined)
            updateData.isActive = Boolean(isActive);
        const plan = yield prisma_1.default.subscriptionPlan.update({
            where: { id },
            data: updateData
        });
        res.json(plan);
    }
    catch (error) {
        console.error('Error updating subscription plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateSubscriptionPlan = updateSubscriptionPlan;
// Delete a Subscription Plan 
// Note: This might fail if subscriptions are actively attached due to foreign key constraints,
// which is actually a good safety net.
const deleteSubscriptionPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Count active subs on this plan
        const tiedSubs = yield prisma_1.default.subscription.count({ where: { planId: id } });
        if (tiedSubs > 0) {
            res.status(409).json({ error: `Cannot delete plan while ${tiedSubs} organizations are actively subscribed to it.` });
            return;
        }
        yield prisma_1.default.subscriptionPlan.delete({ where: { id } });
        res.json({ success: true, message: 'Plan deleted' });
    }
    catch (error) {
        console.error('Error deleting subscription plan:', error);
        if (error.code === 'P2003') { // Prisma foreign key violation code
            res.status(409).json({ error: 'Cannot delete plan because it is referenced by existing subscriptions or invoices.' });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deleteSubscriptionPlan = deleteSubscriptionPlan;
// Get Global Settings (e.g., Free Trial Duration)
const getSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let settings = yield prisma_1.default.globalSetting.findUnique({ where: { id: 'global' } });
        if (!settings) {
            settings = yield prisma_1.default.globalSetting.create({
                data: {
                    id: 'global',
                    freeTrialDays: 3
                }
            });
        }
        res.json(settings);
    }
    catch (error) {
        console.error('Error fetching global settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getSettings = getSettings;
// Update Global Settings
const updateSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { freeTrialDays } = req.body;
        const updateData = {};
        if (freeTrialDays !== undefined) {
            updateData.freeTrialDays = Number(freeTrialDays);
        }
        const settings = yield prisma_1.default.globalSetting.upsert({
            where: { id: 'global' },
            create: Object.assign({ id: 'global' }, updateData),
            update: updateData
        });
        res.json(settings);
    }
    catch (error) {
        console.error('Error updating global settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateSettings = updateSettings;
