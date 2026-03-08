import { Router } from 'express';
import { handleRazorpayWebhook } from '../controllers/webhookController';

const router = Router();

// Endpoint for Razorpay Webhooks
// Note: Middleware like express.json() might be needed globally or locally
// but for standard body json verification it relies on the raw body, 
// express natively handles it if we stringify or use a raw body parser before express.json()
router.post('/razorpay', handleRazorpayWebhook);

export default router;
