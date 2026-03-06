import { Router } from 'express';
import {
    getSubscription, getGlobalMetrics, getFraudAlerts, resolveFraudAlert,
    getTenants, getSubscriptionPlans, createSubscriptionPlan,
    updateTenantStatus, updateTenantSubscription, updateSubscriptionPlan, deleteSubscriptionPlan,
    getSettings, updateSettings
} from '../controllers/adminController';
import { getAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement } from '../controllers/adController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const admin = ['SUPER_ADMIN', 'ADMIN'];

router.get('/subscription', authorize(['STORE_OWNER', 'SUPER_ADMIN', 'ADMIN']), getSubscription);

// Super Admin routes
router.get('/metrics', authorize(admin), getGlobalMetrics);
router.get('/fraud', authorize(admin), getFraudAlerts);
router.post('/fraud/:id/resolve', authorize(admin), resolveFraudAlert);

router.get('/tenants', authorize(admin), getTenants);
router.put('/tenants/:id/status', authorize(admin), updateTenantStatus);
router.put('/tenants/:id/subscription', authorize(admin), updateTenantSubscription);

router.get('/plans', authorize(admin), getSubscriptionPlans);
router.post('/plans', authorize(admin), createSubscriptionPlan);
router.put('/plans/:id', authorize(admin), updateSubscriptionPlan);
router.delete('/plans/:id', authorize(admin), deleteSubscriptionPlan);

// Advertisement Admin routes
router.get('/ads', authorize(admin), getAdvertisements);
router.post('/ads', authorize(admin), createAdvertisement);
router.put('/ads/:id', authorize(admin), updateAdvertisement);
router.delete('/ads/:id', authorize(admin), deleteAdvertisement);

// Global settings routes
router.get('/settings', authorize(admin), getSettings);
router.put('/settings', authorize(admin), updateSettings);

export default router;
