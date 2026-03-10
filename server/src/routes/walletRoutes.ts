import { Router } from 'express';
import { getWalletBalance, rechargeWallet, walletWebhook } from '../controllers/walletController';
import { authenticate } from '../middleware/auth';
import { verifyWebhookSignature } from '../middleware/webhookAuth';

const router = Router();

router.post('/webhook', verifyWebhookSignature, walletWebhook); // Secured webhook with HMAC signature

router.use(authenticate);

router.get('/', getWalletBalance);
router.post('/recharge', rechargeWallet);

export default router;
