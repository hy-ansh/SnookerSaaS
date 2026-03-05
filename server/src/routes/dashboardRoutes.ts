import { Router } from 'express';
import { getDashboardSummary, getRevenueData } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Only owners and admins should see detailed financial dashboards
router.use(authenticate);
router.use(authorize(['STORE_OWNER', 'ADMIN']));

router.get('/summary', getDashboardSummary);
router.get('/revenue', getRevenueData);

export default router;
