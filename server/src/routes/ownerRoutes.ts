import { Router } from 'express';
import { getOwnerSubscription, getOrganizationUsers, getAvailablePlans, updateOwnerSubscription, createRazorpayOrder, verifyRazorpayPayment } from '../controllers/organizationController';
import { getActiveAds } from '../controllers/adController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/subscription', authorize(['STORE_OWNER', 'SUPER_ADMIN', 'STAFF']), getOwnerSubscription);
router.get('/plans', authorize(['STORE_OWNER', 'SUPER_ADMIN']), getAvailablePlans);
router.put('/subscription/change', authorize(['STORE_OWNER', 'SUPER_ADMIN']), updateOwnerSubscription);

// Razorpay endpoints
router.post('/subscription/create-order', authorize(['STORE_OWNER', 'SUPER_ADMIN']), createRazorpayOrder);
router.post('/subscription/verify-payment', authorize(['STORE_OWNER', 'SUPER_ADMIN']), verifyRazorpayPayment);

router.get('/users', authorize(['STORE_OWNER', 'SUPER_ADMIN']), getOrganizationUsers);
router.get('/ads', authorize(['STORE_OWNER', 'SUPER_ADMIN']), getActiveAds);
import { updatePaymentMethods } from '../controllers/organizationController';
router.put('/payment-methods', authorize(['STORE_OWNER', 'SUPER_ADMIN']), updatePaymentMethods);

export default router;
