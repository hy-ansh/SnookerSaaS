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
                        include: { plan: true }
                    }
                }
            });
            if (!org) {
                res.status(404).json({ error: 'Organization not found' });
                return;
            }
            const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
            const createdAt = org.createdAt;
            const isInTrial = createdAt && (Date.now() - new Date(createdAt).getTime() < THREE_DAYS_MS);
            if (isInTrial) {
                // Free trial — grant access to all features
                next();
                return;
            }
            // Check features: Prefer the active subscription plan's features, fallback to legacy org featureFlags
            const activeSub = org.subscriptions[0];
            const activePlan = activeSub === null || activeSub === void 0 ? void 0 : activeSub.plan;
            const features = (activePlan === null || activePlan === void 0 ? void 0 : activePlan.features) || org.featureFlags;
            const currentPlanName = (activePlan === null || activePlan === void 0 ? void 0 : activePlan.name) || org.subscriptionTier || 'Free/Legacy';
            if (!features || !features[featureName]) {
                res.status(403).json({
                    error: `Upgrade Required`,
                    message: `Your current plan (${currentPlanName}) does not include ${featureName}.`
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
