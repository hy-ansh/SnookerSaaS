import { Router } from 'express';
import { getAppSettings, updateAppSettings } from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public route for mobile app
router.get('/app-update', getAppSettings);

// Protected route for Admins
router.put('/app-update', authenticate, updateAppSettings);

export default router;
