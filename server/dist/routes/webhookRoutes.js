"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhookController_1 = require("../controllers/webhookController");
const router = (0, express_1.Router)();
// Endpoint for Razorpay Webhooks
// Note: Middleware like express.json() might be needed globally or locally
// but for standard body json verification it relies on the raw body, 
// express natively handles it if we stringify or use a raw body parser before express.json()
router.post('/razorpay', webhookController_1.handleRazorpayWebhook);
exports.default = router;
