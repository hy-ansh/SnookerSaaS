import { Router } from 'express';
import { recordExpense, getExpenses } from '../controllers/expenseController';
import { authenticate, authorize } from '../middleware/auth';
import { requireFeature } from '../middleware/requireFeature';

const router = Router();

router.use(authenticate);

// Staff and Owners can view and record expenses if plan includes accounting
router.post('/', authorize(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), requireFeature('accounting'), recordExpense);
router.get('/', authorize(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), requireFeature('accounting'), getExpenses);

export default router;
