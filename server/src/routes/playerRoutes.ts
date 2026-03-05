import { Router } from 'express';
import { getPlayerHistory, getPlayerStats, getLeaderboard, getPlayerAnalytics } from '../controllers/playerController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Any authenticated user can check their own history / leaderboard
router.use(authenticate);

router.get('/leaderboard', getLeaderboard);
router.get('/history', getPlayerHistory);
router.get('/stats', getPlayerStats);
router.get('/stats/:playerId', getPlayerStats);
router.get('/analytics', authorize(['STORE_OWNER', 'SUPER_ADMIN', 'STAFF']), getPlayerAnalytics);

export default router;
