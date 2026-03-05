import { Router } from 'express';
import { getWalletBalance, rechargeWallet, walletWebhook } from '../controllers/walletController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/webhook', walletWebhook); // Public webhook

router.use(authenticate);

router.get('/', getWalletBalance);
router.post('/recharge', rechargeWallet);

export default router;
