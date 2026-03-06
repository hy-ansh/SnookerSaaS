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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveAds = exports.deleteAdvertisement = exports.updateAdvertisement = exports.createAdvertisement = exports.getAdvertisements = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Get all advertisements (Admin)
const getAdvertisements = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ads = yield prisma.advertisement.findMany({
            include: {
                placements: true,
                planVisibilities: {
                    include: { plan: true }
                }
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
        });
        res.json(ads);
    }
    catch (error) {
        console.error('Error fetching advertisements:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAdvertisements = getAdvertisements;
// Create an advertisement
const createAdvertisement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, imageUrl, redirectUrl, isActive, startDate, endDate, priority, placements, planIds } = req.body;
        if (!title || !imageUrl) {
            res.status(400).json({ error: 'Title and imageUrl are required' });
            return;
        }
        const ad = yield prisma.advertisement.create({
            data: {
                title,
                imageUrl,
                redirectUrl,
                isActive: isActive !== undefined ? isActive : true,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                priority: priority || 0,
                placements: {
                    create: (placements || []).map((p) => ({ placementName: p }))
                },
                planVisibilities: (planIds === null || planIds === void 0 ? void 0 : planIds.length) > 0 ? {
                    create: planIds.map((id) => ({ planId: id }))
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
    }
    catch (error) {
        console.error('Error creating advertisement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.createAdvertisement = createAdvertisement;
// Update an advertisement
const updateAdvertisement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id);
        const { title, imageUrl, redirectUrl, isActive, startDate, endDate, priority, placements, planIds } = req.body;
        // Delete existing relations to overwrite
        if (placements !== undefined) {
            yield prisma.adPlacement.deleteMany({ where: { advertisementId: id } });
        }
        if (planIds !== undefined) {
            yield prisma.adPlanVisibility.deleteMany({ where: { advertisementId: id } });
        }
        const ad = yield prisma.advertisement.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (title && { title })), (imageUrl && { imageUrl })), (redirectUrl !== undefined && { redirectUrl })), (isActive !== undefined && { isActive })), (startDate !== undefined && { startDate: startDate ? new Date(startDate) : null })), (endDate !== undefined && { endDate: endDate ? new Date(endDate) : null })), (priority !== undefined && { priority: Number(priority) })), (placements !== undefined && {
                placements: {
                    create: placements.map((p) => ({ placementName: p }))
                }
            })), (planIds !== undefined && {
                planVisibilities: planIds.length > 0 ? {
                    create: planIds.map((pId) => ({ planId: pId }))
                } : {
                    create: [{ planId: null }]
                }
            })),
            include: {
                placements: true,
                planVisibilities: { include: { plan: true } }
            }
        });
        res.json(ad);
    }
    catch (error) {
        console.error('Error updating advertisement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateAdvertisement = updateAdvertisement;
// Delete an advertisement
const deleteAdvertisement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id);
        yield prisma.advertisement.delete({ where: { id } });
        res.json({ success: true, message: 'Advertisement deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting advertisement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deleteAdvertisement = deleteAdvertisement;
// ==========================================
// PUBLIC / OWNER API
// ==========================================
const getActiveAds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        const placement = req.query.placement ? String(req.query.placement) : undefined;
        if (!organizationId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Get organization and active plan
        const org = yield prisma.organization.findUnique({
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
        const activePlan = (_c = (_b = org.subscriptions) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.plan;
        // Check if user is in trial, or if ads are disabled on their plan
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
        const createdAt = org.createdAt;
        const isInTrial = createdAt && (Date.now() - new Date(createdAt).getTime() < THREE_DAYS_MS);
        const hasSub = org.subscriptions && org.subscriptions.length > 0;
        const adsEnabled = hasSub ? (activePlan === null || activePlan === void 0 ? void 0 : activePlan.adsEnabled) === true : true; // Usually ads enabled on Trial & Free plans
        if (!adsEnabled && !isInTrial) {
            // Strictly enforce ads logic. If ads are not enabled for this tier, return empty.
            res.json([]);
            return;
        }
        // Fetch active ads
        const now = new Date();
        const ads = yield prisma.advertisement.findMany({
            where: Object.assign(Object.assign({ isActive: true, OR: [
                    { startDate: null },
                    { startDate: { lte: now } }
                ], AND: [
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: now } }
                        ]
                    }
                ] }, (placement ? {
                placements: {
                    some: { placementName: placement }
                }
            } : {})), { planVisibilities: {
                    some: {
                        OR: [
                            { planId: null }, // Global Ad
                            { planId: activePlan === null || activePlan === void 0 ? void 0 : activePlan.id } // Targeted Ad
                        ]
                    }
                } }),
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
        });
        res.json(ads);
    }
    catch (error) {
        console.error('Error fetching active advertisements:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getActiveAds = getActiveAds;
