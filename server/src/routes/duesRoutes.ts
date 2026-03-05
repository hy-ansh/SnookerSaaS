import { Router } from 'express';
import { getStoreDues, settlePlayerDues, settleSpecificDue, getMyDues } from '../controllers/duesController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Player can view own dues (no owner restriction)
router.get('/my', getMyDues);

// Staff/Owner restricted endpoints
router.get('/', authorize(['STORE_OWNER', 'STAFF', 'SUPER_ADMIN']), getStoreDues);
router.post('/settle/:playerId', authorize(['STORE_OWNER', 'STAFF', 'SUPER_ADMIN']), settlePlayerDues);
router.post('/settle-one/:dueId', authorize(['STORE_OWNER', 'STAFF', 'SUPER_ADMIN']), settleSpecificDue);

export default router;
