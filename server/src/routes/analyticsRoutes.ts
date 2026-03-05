import { Router } from 'express';
import { getHeatmapAnalytics, getAnalyticsSummary, getOperationalStats } from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';
import { requireFeature } from '../middleware/requireFeature';

const router = Router();

router.use(authenticate);

// Owners + Admins can view analytics if their plan includes it
router.get('/heatmap', authorize(['STORE_OWNER', 'SUPER_ADMIN', 'STAFF']), requireFeature('analytics'), getHeatmapAnalytics);
router.get('/summary', authorize(['STORE_OWNER', 'SUPER_ADMIN']), requireFeature('analytics'), getAnalyticsSummary);
router.get('/operational', authorize(['STORE_OWNER', 'SUPER_ADMIN']), requireFeature('analytics'), getOperationalStats);

export default router;
