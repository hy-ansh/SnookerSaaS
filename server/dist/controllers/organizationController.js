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
exports.getOrganizationUsers = exports.getOwnerSubscription = exports.verifyRazorpayPayment = exports.createRazorpayOrder = exports.updateOwnerSubscription = exports.getAvailablePlans = exports.updatePaymentMethods = exports.getOrganization = exports.createOrganization = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
// Lazy-initialize Razorpay to ensure dotenv has loaded env vars first.
// (ES module imports are hoisted above dotenv.config(), so top-level init
//  runs before env vars are available.)
let razorpay = null;
function getRazorpay() {
    if (!razorpay && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        razorpay = new razorpay_1.default({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpay;
}
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
const updatePaymentMethods = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        const { allowedPaymentMethods } = req.body;
        if (!organizationId) {
            res.status(403).json({ error: 'No organization linked' });
            return;
        }
        if (!Array.isArray(allowedPaymentMethods)) {
            res.status(400).json({ error: 'allowedPaymentMethods must be an array' });
            return;
        }
        const org = yield prisma_1.default.organization.update({
            where: { id: organizationId },
            data: { allowedPaymentMethods }
        });
        res.json({ message: 'Payment methods updated successfully', allowedPaymentMethods: org.allowedPaymentMethods });
    }
    catch (err) {
        console.error('Error updating payment methods:', err);
        res.status(500).json({ error: 'Internal server error updating payment methods' });
    }
});
exports.updatePaymentMethods = updatePaymentMethods;
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
        // We consciously DO NOT update the deprecated `subscriptionTier` here. Rely on Subscription relation.
        // await prisma.organization.update({
        //     where: { id: organizationId },
        //     data: { subscriptionTier: plan.name }
        // });
        res.json({ message: 'Subscription successfully upgraded', subscription });
    }
    catch (err) {
        console.error('Error updating owner subscription:', err);
        res.status(500).json({ error: 'Internal server error updating subscription' });
    }
});
exports.updateOwnerSubscription = updateOwnerSubscription;
const createRazorpayOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const plan = yield prisma_1.default.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            res.status(404).json({ error: 'Subscription Plan not found' });
            return;
        }
        // --- Handle Free Plan Bypass ---
        if (Number(plan.price) === 0) {
            // Upsert Subscription directly since it's free
            const subscription = yield prisma_1.default.subscription.upsert({
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
            // Record a 0-rupee invoice
            yield prisma_1.default.invoice.create({
                data: {
                    subscriptionId: subscription.id,
                    amount: 0,
                    status: 'PAID',
                    dueDate: new Date(),
                    paidAt: new Date()
                }
            });
            // Return freeTrack flag so frontend doesn't load Razorpay JS
            res.json({
                freeTrack: true,
                message: 'Free plan activated successfully'
            });
            return;
        }
        // -------------------------------
        if (!getRazorpay()) {
            res.status(500).json({ error: 'Razorpay is not configured on the server' });
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
        const order = yield getRazorpay().orders.create(options);
        // Optional: you can save the pending order in DB here, but Razorpay webhooks/callbacks handle success.
        res.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });
    }
    catch (err) {
        console.error('Error creating Razorpay order:', err);
        res.status(500).json({ error: 'Internal server error creating order' });
    }
});
exports.createRazorpayOrder = createRazorpayOrder;
const verifyRazorpayPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
        if (!organizationId) {
            res.status(403).json({ error: 'No organization linked' });
            return;
        }
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
            res.status(400).json({ error: 'Missing required payment verification details' });
            return;
        }
        const secret = process.env.RAZORPAY_KEY_SECRET;
        // Verify signature
        const generated_signature = crypto_1.default
            .createHmac('sha256', secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        if (generated_signature !== razorpay_signature) {
            res.status(400).json({ error: 'Invalid payment signature' });
            return;
        }
        const plan = yield prisma_1.default.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            res.status(404).json({ error: 'Subscription Plan not found' });
            return;
        }
        // Upsert Subscription since payment is valid
        const subscription = yield prisma_1.default.subscription.upsert({
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
        yield prisma_1.default.invoice.create({
            data: {
                subscriptionId: subscription.id,
                amount: plan.price,
                status: 'PAID',
                dueDate: new Date(),
                paidAt: new Date()
            }
        });
        res.json({ message: 'Payment verified and subscription activated', subscription });
    }
    catch (err) {
        console.error('Error verifying Razorpay payment:', err);
        res.status(500).json({ error: 'Internal server error verifying payment' });
    }
});
exports.verifyRazorpayPayment = verifyRazorpayPayment;
const getOwnerSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
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
        const orgAny = org;
        const allSubs = orgAny.subscriptions || [];
        const activeSub = allSubs.find((s) => s.status === 'ACTIVE');
        const baseResponse = {
            orgCreatedAt: org.createdAt,
            orgIsActive: org.isActive !== false
        };
        if (activeSub) {
            res.json(Object.assign(Object.assign({}, baseResponse), { status: activeSub.status, planId: activeSub.planId, currentPeriodStart: activeSub.currentPeriodStart, currentPeriodEnd: activeSub.currentPeriodEnd, invoices: activeSub.invoices || [], plan: {
                    id: (_b = activeSub.plan) === null || _b === void 0 ? void 0 : _b.id,
                    name: (_c = activeSub.plan) === null || _c === void 0 ? void 0 : _c.name,
                    price: Number((_e = (_d = activeSub.plan) === null || _d === void 0 ? void 0 : _d.price) !== null && _e !== void 0 ? _e : 0),
                    interval: 'month',
                    adsEnabled: (_g = (_f = activeSub.plan) === null || _f === void 0 ? void 0 : _f.adsEnabled) !== null && _g !== void 0 ? _g : true,
                    features: ((_h = activeSub.plan) === null || _h === void 0 ? void 0 : _h.features) || {}
                } }));
            return;
        }
        // No active subscription — return null plan with org metadata for trial logic
        res.json(Object.assign(Object.assign({}, baseResponse), { status: 'NO_SUB', plan: null, currentPeriodEnd: null }));
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
