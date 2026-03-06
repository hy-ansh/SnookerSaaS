import { Router } from 'express';
import { getUpiConfig, saveUpiConfig, generateQrData } from '../controllers/upiController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Owner can configure and view UPI settings
router.get('/config', authorize(['STORE_OWNER', 'SUPER_ADMIN']), getUpiConfig);
router.put('/config', authorize(['STORE_OWNER', 'SUPER_ADMIN']), saveUpiConfig);

// Staff and Owner can generate QR codes for payments
router.get('/qr', authorize(['STORE_OWNER', 'STAFF', 'SUPER_ADMIN']), generateQrData);

export default router;
