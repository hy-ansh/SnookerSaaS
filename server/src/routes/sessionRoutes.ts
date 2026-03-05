import { Router } from 'express';
import { startSession, pauseSession, resumeSession, endSession, getActiveSessions, getCompletedSessions, getSessionById, updateSessionRate, addPlayerToSession, removePlayerFromSession, searchPlayers } from '../controllers/sessionController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize(['STAFF', 'STORE_OWNER', 'ADMIN']));

router.get('/active', getActiveSessions);
router.get('/completed', getCompletedSessions);
router.get('/search-players', searchPlayers);
router.get('/:id', getSessionById);
router.post('/start', startSession);
router.post('/:id/pause', pauseSession);
router.post('/:id/resume', resumeSession);
router.post('/:id/end', endSession);
router.post('/:id/players', addPlayerToSession);
router.delete('/:id/players', removePlayerFromSession);
router.put('/:id/rate', updateSessionRate);

export default router;

