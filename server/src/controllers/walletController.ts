import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getWalletBalance = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        let profile = await prisma.playerProfile.findUnique({ where: { userId } });
        if (!profile) {
            profile = await prisma.playerProfile.create({ data: { userId } });
        }

        const txns = await prisma.walletTransaction.findMany({
            where: { playerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        res.json({ balance: profile.walletBalance, history: txns });
    } catch (error) {
        console.error('Error getting wallet balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const rechargeWallet = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { amount } = req.body;

        if (!userId || !amount) {
            res.status(400).json({ error: 'Missing amount or unauthorized' });
            return;
        }

        // Mocking Razorpay Order Creation
        const mockOrderId = "order_" + Math.random().toString(36).substring(7);

        res.json({ orderId: mockOrderId, amount, currency: 'INR' });
    } catch (error) {
        console.error('Error creating recharge order:', error);
        res.status(500).json({ error: 'Failed to create recharge order' });
    }
};

export const walletWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, amount, paymentId, status } = req.body;

        if (status !== 'SUCCESS') {
            // For webhooks, we usually shouldn't return an error to Razorpay for failed payments, just 200 OK so it doesn't retry
            res.status(200).json({ status: 'ignored', message: 'Payment not successful' });
            return;
        }

        // Idempotency Check: Prevent processing the same webhook twice
        const existingTxn = await prisma.walletTransaction.findFirst({
            where: { referenceId: paymentId }
        });

        if (existingTxn) {
            console.log(`[WalletWebhook] Idempotency catch: paymentId ${paymentId} already processed.`);
            res.status(200).json({ status: 'ignored', message: 'Already processed' });
            return;
        }

        await prisma.$transaction(async (tx) => {
            // Update balance
            await tx.playerProfile.update({
                where: { userId },
                data: { walletBalance: { increment: amount } }
            });

            // Insert Txn
            await tx.walletTransaction.create({
                data: {
                    playerId: userId,
                    amount,
                    type: 'DEPOSIT',
                    referenceId: paymentId
                }
            });
        });

        res.status(200).json({ status: 'ok', message: 'Recharge successful' });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
