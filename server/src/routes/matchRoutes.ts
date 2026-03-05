import { Router } from 'express';
import { createMatch, endMatch, getPlayerStats } from '../controllers/matchController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Secure all match routes behind authentication
router.use(authenticate);

router.post('/', createMatch);
router.post('/:id/end', endMatch);
router.get('/player/:userId/stats', getPlayerStats);

export default router;
