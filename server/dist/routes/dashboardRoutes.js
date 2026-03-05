"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Only owners and admins should see detailed financial dashboards
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(['STORE_OWNER', 'ADMIN']));
router.get('/summary', dashboardController_1.getDashboardSummary);
router.get('/revenue', dashboardController_1.getRevenueData);
exports.default = router;
