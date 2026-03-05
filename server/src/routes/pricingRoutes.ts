import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getPricingForBranch, upsertPricingForBranch } from '../controllers/pricingController';

const router = Router();

router.use(authenticate);

// GET /pricing/:branchId — any staff/owner can read
router.get('/:branchId', getPricingForBranch);

// PUT /pricing/:branchId — only owners/admins can change rates
router.put('/:branchId', authorize(['STORE_OWNER', 'ADMIN']), upsertPricingForBranch);

export default router;
