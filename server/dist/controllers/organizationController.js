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
exports.getOrganizationUsers = exports.getOwnerSubscription = exports.updateOwnerSubscription = exports.getAvailablePlans = exports.getOrganization = exports.createOrganization = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, subscriptionTier } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Organization name is required' });
            return;
        }
        const org = yield prisma_1.default.organization.create({
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
        const adminRole = yield prisma_1.default.role.create({
            data: {
                organizationId: org.id,
                name: 'ADMIN',
                permissions: ['ALL']
            }
        });
        // Link the user who created this to the org and make them ADMIN
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email) {
            yield prisma_1.default.user.upsert({
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
    }
    catch (err) {
        console.error('Error creating organization:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.createOrganization = createOrganization;
const getOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { orgId } = req.params;
        const orgIdStr = typeof orgId === 'string' ? orgId : String(orgId);
        const org = yield prisma_1.default.organization.findUnique({
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
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId) !== org.id && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        res.status(200).json({ organization: org });
    }
    catch (err) {
        console.error('Error fetching organization:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getOrganization = getOrganization;
const getAvailablePlans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plans = yield prisma_1.default.subscriptionPlan.findMany({
            orderBy: { price: 'asc' }
        });
        res.json(plans);
    }
    catch (err) {
        console.error('Error fetching available plans:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAvailablePlans = getAvailablePlans;
const updateOwnerSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
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
        const plan = yield prisma_1.default.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            res.status(404).json({ error: 'Subscription Plan not found' });
            return;
        }
        // Upsert the Subscription
        const subscription = yield prisma_1.default.subscription.upsert({
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
        yield prisma_1.default.organization.update({
            where: { id: organizationId },
            data: { subscriptionTier: plan.name }
        });
        res.json({ message: 'Subscription successfully upgraded', subscription });
    }
    catch (err) {
        console.error('Error updating owner subscription:', err);
        res.status(500).json({ error: 'Internal server error updating subscription' });
    }
});
exports.updateOwnerSubscription = updateOwnerSubscription;
const getOwnerSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId) {
            res.status(403).json({ error: 'No organization linked' });
            return;
        }
        const org = yield prisma_1.default.organization.findUnique({
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
        // If they have a real subscription from the new model:
        const orgWithSubs = org;
        if (orgWithSubs.subscriptions && orgWithSubs.subscriptions.length > 0) {
            const activeSub = orgWithSubs.subscriptions[0];
            res.json({
                status: activeSub.status,
                planId: activeSub.planId,
                plan: {
                    id: (_b = activeSub.plan) === null || _b === void 0 ? void 0 : _b.id,
                    name: (_c = activeSub.plan) === null || _c === void 0 ? void 0 : _c.name,
                    price: (_d = activeSub.plan) === null || _d === void 0 ? void 0 : _d.price,
                    interval: 'month',
                    features: ((_e = activeSub.plan) === null || _e === void 0 ? void 0 : _e.features) || {}
                },
                currentPeriodEnd: activeSub.currentPeriodEnd,
                invoices: [] // To be wired to stripe/actual invoices later
            });
            return;
        }
        // Fallback to Legacy structure:
        const isFree = org.subscriptionTier === 'FREE_TRIAL';
        res.json({
            status: 'ACTIVE',
            plan: {
                name: org.subscriptionTier || 'FREE_TRIAL',
                price: isFree ? 0.00 : 149.00,
                interval: 'month'
            },
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            invoices: isFree ? [] : [
                { id: 'inv_1', amount: 149.00, dueDate: new Date().toISOString(), status: 'PAID' }
            ]
        });
    }
    catch (err) {
        console.error('Error fetching owner sub:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getOwnerSubscription = getOwnerSubscription;
const getOrganizationUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId) {
            res.status(403).json({ error: 'No organization linked' });
            return;
        }
        const users = yield prisma_1.default.user.findMany({
            where: { organizationId },
            include: {
                role: true,
                branch: true
            },
            orderBy: { email: 'asc' }
        });
        // Map data to prevent sensitive leaks and format for UI
        const mappedUsers = users.map(u => {
            var _a, _b;
            return ({
                id: u.id,
                email: u.email,
                fullName: u.fullName,
                role: ((_a = u.role) === null || _a === void 0 ? void 0 : _a.name) || 'PLAYER',
                branchName: ((_b = u.branch) === null || _b === void 0 ? void 0 : _b.name) || 'All Branches',
                createdAt: new Date().toISOString() // Fallback to current date for the UI
            });
        });
        res.json({ users: mappedUsers });
    }
    catch (err) {
        console.error('Error fetching organization users:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getOrganizationUsers = getOrganizationUsers;
