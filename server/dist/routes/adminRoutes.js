"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const router = Router();
router.use(auth_1.authenticate);
// Store Owner routes
router.get('/subscription', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), adminController_1.getSubscription);
// Super Admin routes
router.get('/metrics', (0, auth_1.authorize)(['SUPER_ADMIN']), adminController_1.getGlobalMetrics);
router.get('/fraud', (0, auth_1.authorize)(['SUPER_ADMIN']), adminController_1.getFraudAlerts);
router.post('/fraud/:id/resolve', (0, auth_1.authorize)(['SUPER_ADMIN']), adminController_1.resolveFraudAlert);
router.get('/tenants', (0, auth_1.authorize)(['SUPER_ADMIN']), adminController_1.getTenants);
router.put('/tenants/:id/status', (0, auth_1.authorize)(['SUPER_ADMIN']), adminController_1.updateTenantStatus);
router.put('/tenants/:id/subscription', (0, auth_1.authorize)(['SUPER_ADMIN']), adminController_1.updateTenantSubscription);
router.get('/plans', (0, auth_1.authorize)(['SUPER_ADMIN']), adminController_1.getSubscriptionPlans);
router.post('/plans', (0, auth_1.authorize)(['SUPER_ADMIN']), adminController_1.createSubscriptionPlan);
router.put('/plans/:id', (0, auth_1.authorize)(['SUPER_ADMIN']), adminController_1.updateSubscriptionPlan);
router.delete('/plans/:id', (0, auth_1.authorize)(['SUPER_ADMIN']), adminController_1.deleteSubscriptionPlan);
exports.default = router;
