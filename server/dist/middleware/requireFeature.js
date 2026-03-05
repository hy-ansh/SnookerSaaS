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
exports.requireFeature = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const requireFeature = (featureName) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
            if (!organizationId) {
                res.status(403).json({ error: 'No organization linked to this user' });
                return;
            }
            // Fetch the organization and their active subscription
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
            // If it's a legacy org without a proper Subscription relation, allow access to ease transition,
            // or strictly check based on string. For production, strictly evaluate the JSON.
            if (!org.subscriptions || org.subscriptions.length === 0) {
                // Fallback: If they are FREE_TRIAL, they don't get premium features
                if (org.subscriptionTier === 'FREE_TRIAL') {
                    res.status(403).json({ error: `Subscription upgrade required for feature: ${featureName}` });
                    return;
                }
                // If they have legacy "PRO", just pass them.
                next();
                return;
            }
            const activePlan = org.subscriptions[0].plan;
            // Check the features JSON payload
            const features = activePlan === null || activePlan === void 0 ? void 0 : activePlan.features;
            if (!features || !features[featureName]) {
                res.status(403).json({
                    error: `Upgrade Required`,
                    message: `Your current plan (${activePlan === null || activePlan === void 0 ? void 0 : activePlan.name}) does not include ${featureName}.`
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error(`Error checking feature flag ${featureName}:`, error);
            res.status(500).json({ error: 'Internal server error verifying subscription features' });
        }
    });
};
exports.requireFeature = requireFeature;
