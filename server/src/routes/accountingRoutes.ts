import { Router } from 'express';
import { getStoreLedger, addExpense, getMonthlyTrend } from '../controllers/accountingController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize(['STORE_OWNER', 'SUPER_ADMIN']));

router.get('/', getStoreLedger);
router.post('/expenses', addExpense);
router.get('/trend', getMonthlyTrend);

export default router;
