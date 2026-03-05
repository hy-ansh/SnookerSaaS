import { Router } from 'express';
import { getAssetMaintenance, createAssetMaintenance } from '../controllers/assetMaintenanceController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize(['STORE_OWNER', 'SUPER_ADMIN']));

router.get('/', getAssetMaintenance);
router.post('/', createAssetMaintenance);

export default router;
