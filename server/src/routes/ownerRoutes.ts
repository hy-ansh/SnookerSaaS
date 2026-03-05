import { Router } from 'express';
import { getOwnerSubscription, getOrganizationUsers, getAvailablePlans, updateOwnerSubscription } from '../controllers/organizationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/subscription', authorize(['STORE_OWNER', 'SUPER_ADMIN']), getOwnerSubscription);
router.get('/plans', authorize(['STORE_OWNER', 'SUPER_ADMIN']), getAvailablePlans);
router.put('/subscription/change', authorize(['STORE_OWNER', 'SUPER_ADMIN']), updateOwnerSubscription);
router.get('/users', authorize(['STORE_OWNER', 'SUPER_ADMIN']), getOrganizationUsers);

export default router;
