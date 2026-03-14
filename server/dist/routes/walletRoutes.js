"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const walletController_1 = require("../controllers/walletController");
const auth_1 = require("../middleware/auth");
const webhookAuth_1 = require("../middleware/webhookAuth");
const router = (0, express_1.Router)();
router.post('/webhook', webhookAuth_1.verifyWebhookSignature, walletController_1.walletWebhook); // Secured webhook with HMAC signature
router.use(auth_1.authenticate);
router.get('/', walletController_1.getWalletBalance);
router.post('/recharge', walletController_1.rechargeWallet);
exports.default = router;
