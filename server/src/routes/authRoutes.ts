import { Router } from 'express';
import { login, register, getMe, createUser } from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', getMe);   // no authenticate middleware — validates JWT internally

// Admin/Owner endpoint to spawn new users without losing current session
router.post('/create-user', authenticate, authorize(['ADMIN', 'STORE_OWNER']), createUser);

export default router;
