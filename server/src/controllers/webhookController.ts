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
            case 'payment.captured': {
                const payment = event.payload.payment.entity;
                console.log(`Webhook: Payment captured: ${payment.id}`);
                // One-time payment capture is handled by /verify-payment endpoint
                break;
            }

            case 'subscription.charged': {
                // ── Monthly Renewal: extend subscription period by 1 month ──
                const subEntity = event.payload.subscription?.entity;
                if (subEntity?.notes?.organizationId) {
                    const orgId = subEntity.notes.organizationId;
                    console.log(`Webhook: Subscription charged for org ${orgId}`);

                    const existingSub = await prisma.subscription.findUnique({
                        where: { organizationId: orgId }
                    });

                    if (existingSub) {
                        const newPeriodEnd = new Date(existingSub.currentPeriodEnd);
                        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

                        await prisma.subscription.update({
                            where: { organizationId: orgId },
                            data: {
                                status: 'ACTIVE',
                                currentPeriodEnd: newPeriodEnd
                            }
                        });

                        // Record invoice
                        await prisma.invoice.create({
                            data: {
                                subscriptionId: existingSub.id,
                                amount: subEntity.total_count ? Number(subEntity.total_count) / 100 : 0,
                                status: 'PAID',
                                dueDate: new Date(),
                                paidAt: new Date()
                            }
                        });

                        console.log(`Webhook: Extended subscription for org ${orgId} to ${newPeriodEnd.toISOString()}`);
                    }
                }
                break;
            }

            case 'payment.failed': {
                // ── Mark subscription as PAST_DUE on payment failure ──
                const failedPayment = event.payload.payment?.entity;
                const failedOrgId = failedPayment?.notes?.organizationId;
                if (failedOrgId) {
                    console.log(`Webhook: Payment failed for org ${failedOrgId}`);
                    await prisma.subscription.updateMany({
                        where: { organizationId: failedOrgId, status: 'ACTIVE' },
                        data: { status: 'PAST_DUE' }
                    });
                }
                break;
            }

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
