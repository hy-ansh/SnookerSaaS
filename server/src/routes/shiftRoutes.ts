import { Router } from 'express';
import { openShift, closeShift, getShifts } from '../controllers/shiftController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Staff and Store Owners can open and close shifts
router.post('/open', authorize(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), openShift);
router.post('/:id/close', authorize(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), closeShift);
router.get('/', authorize(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), getShifts);

export default router;
