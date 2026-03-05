import { Router } from 'express';
import { processPayments, addWalletFunds, addDues, getPaymentSummary } from '../controllers/paymentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET summary is available to owners + admins (read-only)
router.get('/summary', authorize(['STORE_OWNER', 'SUPER_ADMIN', 'STAFF']), getPaymentSummary);

// Mutation routes require staff+ role
router.post('/', authorize(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), processPayments);
router.post('/wallet/add', authorize(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), addWalletFunds);
router.post('/dues/add', authorize(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), addDues);

export default router;
