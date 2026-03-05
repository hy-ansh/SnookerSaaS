"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analyticsController_1 = require("../controllers/analyticsController");
const auth_1 = require("../middleware/auth");
const requireFeature_1 = require("../middleware/requireFeature");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Owners + Admins can view analytics if their plan includes it
router.get('/heatmap', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN', 'STAFF']), (0, requireFeature_1.requireFeature)('analytics'), analyticsController_1.getHeatmapAnalytics);
router.get('/summary', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), (0, requireFeature_1.requireFeature)('analytics'), analyticsController_1.getAnalyticsSummary);
exports.default = router;
