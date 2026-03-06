"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const adController_1 = require("../controllers/adController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const admin = ['SUPER_ADMIN', 'ADMIN'];
router.get('/subscription', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN', 'ADMIN']), adminController_1.getSubscription);
// Super Admin routes
router.get('/metrics', (0, auth_1.authorize)(admin), adminController_1.getGlobalMetrics);
router.get('/fraud', (0, auth_1.authorize)(admin), adminController_1.getFraudAlerts);
router.post('/fraud/:id/resolve', (0, auth_1.authorize)(admin), adminController_1.resolveFraudAlert);
router.get('/tenants', (0, auth_1.authorize)(admin), adminController_1.getTenants);
router.put('/tenants/:id/status', (0, auth_1.authorize)(admin), adminController_1.updateTenantStatus);
router.put('/tenants/:id/subscription', (0, auth_1.authorize)(admin), adminController_1.updateTenantSubscription);
router.get('/plans', (0, auth_1.authorize)(admin), adminController_1.getSubscriptionPlans);
router.post('/plans', (0, auth_1.authorize)(admin), adminController_1.createSubscriptionPlan);
router.put('/plans/:id', (0, auth_1.authorize)(admin), adminController_1.updateSubscriptionPlan);
router.delete('/plans/:id', (0, auth_1.authorize)(admin), adminController_1.deleteSubscriptionPlan);
// Advertisement Admin routes
router.get('/ads', (0, auth_1.authorize)(admin), adController_1.getAdvertisements);
router.post('/ads', (0, auth_1.authorize)(admin), adController_1.createAdvertisement);
router.put('/ads/:id', (0, auth_1.authorize)(admin), adController_1.updateAdvertisement);
router.delete('/ads/:id', (0, auth_1.authorize)(admin), adController_1.deleteAdvertisement);
// Global settings routes
router.get('/settings', (0, auth_1.authorize)(admin), adminController_1.getSettings);
router.put('/settings', (0, auth_1.authorize)(admin), adminController_1.updateSettings);
exports.default = router;
