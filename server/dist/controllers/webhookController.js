"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRazorpayWebhook = void 0;
const crypto_1 = __importDefault(require("crypto"));
const handleRazorpayWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('RAZORPAY_WEBHOOK_SECRET is not defined');
            res.status(500).send('Webhook secret not configured');
            return;
        }
        const signature = req.headers['x-razorpay-signature'];
        if (!signature) {
            res.status(400).send('No signature found');
            return;
        }
        // To verify the webhook, we must use the raw request body. 
        // In Express, if req.body is already an object (via express.json()), 
        // we can stringify it, BUT it's safer to use the exact string.
        // We will assume a custom middleware has attached the raw body to req.rawBody
        // OR we can just use JSON.stringify(req.body) and hope the formatting matches exactly.
        const payload = req.rawBody || JSON.stringify(req.body);
        const expectedSignature = crypto_1.default
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('hex');
        if (expectedSignature !== signature) {
            console.warn('Invalid Razorpay Webhook Signature');
            res.status(400).send('Invalid signature');
            return;
        }
        const event = req.body;
        switch (event.event) {
            case 'payment.captured':
                // Event fired when payment is successfully captured
                const payment = event.payload.payment.entity;
                console.log(`Webhook: Payment captured: ${payment.id}`);
                // You can add logic here to process specific order types, 
                // but since the frontend handles the immediate verification in `/verify-payment`,
                // this webhook is mostly a fallback or for recurring subscriptions.
                break;
            case 'subscription.charged':
                // Handle recurring subscription successful charge
                const sub = event.payload.subscription.entity;
                console.log(`Webhook: Subscription charged: ${sub.id}`);
                break;
            default:
                console.log(`Webhook: Unhandled event ${event.event}`);
        }
        // Acknowledge receipt of the webhook to Razorpay
        res.status(200).json({ status: 'ok' });
    }
    catch (err) {
        console.error('Error handling webhook:', err);
        res.status(500).send('Internal server error');
    }
});
exports.handleRazorpayWebhook = handleRazorpayWebhook;
