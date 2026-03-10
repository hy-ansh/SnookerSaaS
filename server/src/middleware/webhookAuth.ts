import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware to verify Razorpay webhook signatures.
 * Requires the raw request body to be available at `req.rawBody` 
 * (or uses `JSON.stringify(req.body)` as a fallback, though rawBody is strongly preferred).
 */
export const verifyWebhookSignature = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('[WebhookAuth] RAZORPAY_WEBHOOK_SECRET is not defined');
            res.status(500).json({ error: 'Webhook secret not configured' });
            return;
        }

        const signature = req.headers['x-razorpay-signature'] as string;

        if (!signature) {
            res.status(401).json({ error: 'Unauthorized: Missing signature' });
            return;
        }

        const payload = (req as any).rawBody || JSON.stringify(req.body);

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('hex');

        if (expectedSignature !== signature) {
            console.warn('[WebhookAuth] Invalid webhook signature detected');
            res.status(401).json({ error: 'Unauthorized: Invalid signature' });
            return;
        }

        next();
    } catch (err) {
        console.error('[WebhookAuth] Error verifying signature:', err);
        res.status(500).json({ error: 'Internal server error during signature verification' });
    }
};
