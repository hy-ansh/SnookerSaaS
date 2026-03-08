import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';

export const handleRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('RAZORPAY_WEBHOOK_SECRET is not defined');
            res.status(500).send('Webhook secret not configured');
            return;
        }

        const signature = req.headers['x-razorpay-signature'] as string;

        if (!signature) {
            res.status(400).send('No signature found');
            return;
        }

        // To verify the webhook, we must use the raw request body. 
        // In Express, if req.body is already an object (via express.json()), 
        // we can stringify it, BUT it's safer to use the exact string.
        // We will assume a custom middleware has attached the raw body to req.rawBody
        // OR we can just use JSON.stringify(req.body) and hope the formatting matches exactly.
        const payload = (req as any).rawBody || JSON.stringify(req.body);

        const expectedSignature = crypto
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
    } catch (err) {
        console.error('Error handling webhook:', err);
        res.status(500).send('Internal server error');
    }
};
