"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Middleware to verify Razorpay webhook signatures.
 * Requires the raw request body to be available at `req.rawBody`
 * (or uses `JSON.stringify(req.body)` as a fallback, though rawBody is strongly preferred).
 */
const verifyWebhookSignature = (req, res, next) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('[WebhookAuth] RAZORPAY_WEBHOOK_SECRET is not defined');
            res.status(500).json({ error: 'Webhook secret not configured' });
            return;
        }
        const signature = req.headers['x-razorpay-signature'];
        if (!signature) {
            res.status(401).json({ error: 'Unauthorized: Missing signature' });
            return;
        }
        const payload = req.rawBody || JSON.stringify(req.body);
        const expectedSignature = crypto_1.default
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('hex');
        if (expectedSignature !== signature) {
            console.warn('[WebhookAuth] Invalid webhook signature detected');
            res.status(401).json({ error: 'Unauthorized: Invalid signature' });
            return;
        }
        next();
    }
    catch (err) {
        console.error('[WebhookAuth] Error verifying signature:', err);
        res.status(500).json({ error: 'Internal server error during signature verification' });
    }
};
exports.verifyWebhookSignature = verifyWebhookSignature;
