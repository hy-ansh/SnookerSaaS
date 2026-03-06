import { Router } from 'express';
import { getOwnerSubscription, getOrganizationUsers, getAvailablePlans, updateOwnerSubscription } from '../controllers/organizationController';
import { getActiveAds } from '../controllers/adController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/subscription', authorize(['STORE_OWNER', 'SUPER_ADMIN']), getOwnerSubscription);
router.get('/plans', authorize(['STORE_OWNER', 'SUPER_ADMIN']), getAvailablePlans);
router.put('/subscription/change', authorize(['STORE_OWNER', 'SUPER_ADMIN']), updateOwnerSubscription);
router.get('/users', authorize(['STORE_OWNER', 'SUPER_ADMIN']), getOrganizationUsers);
router.get('/ads', authorize(['STORE_OWNER', 'SUPER_ADMIN']), getActiveAds);
import { updatePaymentMethods } from '../controllers/organizationController';
router.put('/payment-methods', authorize(['STORE_OWNER', 'SUPER_ADMIN']), updatePaymentMethods);

export default router;
