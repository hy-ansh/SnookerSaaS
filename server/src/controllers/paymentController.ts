import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const processPayments = async (req: Request, res: Response): Promise<void> => {
    const { session_id, payments } = req.body;

    try {
        if (!session_id || !payments || !Array.isArray(payments) || payments.length === 0) {
            res.status(400).json({ error: 'Valid session_id and payments array are required' });
            return;
        }

        const session = await prisma.session.findUnique({
            where: { id: session_id },
            include: { branch: true }
        });

        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        if (session.status !== 'COMPLETED') {
            res.status(400).json({ error: 'Cannot process payment. Session must be ended first.' });
            return;
        }

        let totalPaid = 0;

        // Note: Using an interactive transaction to ensure wallet balances don't drift
        // during concurrent requests.
        const result = await prisma.$transaction(async (tx) => {
            // 1. Pre-flight Check: Validate WALLET balances
            for (const payment of payments) {
                if (payment.method === 'WALLET') {
                    const balanceResult = await tx.walletTransaction.aggregate({
                        _sum: { amount: true },
                        where: { playerId: payment.payer_id }
                    });

                    const balance = Number(balanceResult._sum.amount || 0);
                    if (balance < payment.amount) {
                        throw new Error(`Insufficient wallet balance for player ${payment.payer_id}`);
                    }
                }
                totalPaid += payment.amount;
            }

            // 2. Process Payments
            for (const payment of payments) {
                const paymentRecord = await tx.payment.create({
                    data: {
                        sessionId: session_id,
                        payerId: payment.payer_id,
                        amount: payment.amount,
                        method: payment.method as any,
                        status: 'SUCCESS'
                    }
                });

                if (payment.method === 'WALLET') {
                    await tx.walletTransaction.create({
                        data: {
                            playerId: payment.payer_id,
                            amount: -Math.abs(payment.amount),
                            type: 'SESSION_PAYMENT',
                            referenceId: paymentRecord.id
                        }
                    });
                }

                // Write to Double Entry Ledger for cash/upi/card
                if (payment.method !== 'WALLET') {
                    await tx.ledgerEntry.create({
                        data: {
                            organizationId: session.branch.organizationId,
                            accountId: `ASSET_${payment.method}`,
                            debit: payment.amount,
                            credit: 0,
                            referenceType: 'PAYMENT',
                            referenceId: paymentRecord.id
                        }
                    });
                }
            }

            const totalSessionCost = Number(session.totalAmount || 0);

            // 3. Handle Pending Dues
            if (totalPaid < totalSessionCost) {
                const remaining = totalSessionCost - totalPaid;
                const dueRecord = await tx.due.create({
                    data: {
                        sessionId: session_id,
                        playerId: payments[0].payer_id, // Default remainder to primary payer
                        amount: remaining,
                        status: 'PENDING'
                    }
                });

                // Ledger Entry for Accounts Receivable
                await tx.ledgerEntry.create({
                    data: {
                        organizationId: session.branch.organizationId,
                        accountId: 'ACCOUNTS_RECEIVABLE',
                        debit: remaining,
                        credit: 0,
                        referenceType: 'DUES',
                        referenceId: dueRecord.id
                    }
                });
            }

            return { totalPaid, sessionCost: totalSessionCost };
        });

        res.json({
            message: 'Payments processed successfully',
            total_paid: result.totalPaid,
            session_cost: result.sessionCost
        });
    } catch (err: any) {
        console.error('Process Payments Error:', err);
        res.status(400).json({ error: err.message || 'Internal server error processing payment' });
    }
};

export const addWalletFunds = async (req: Request, res: Response): Promise<void> => {
    const { player_id, amount, payment_method } = req.body;

    try {
        if (!player_id || !amount || amount <= 0) {
            res.status(400).json({ error: 'Invalid player_id or amount' });
            return;
        }

        const txn = await prisma.walletTransaction.create({
            data: {
                playerId: player_id,
                amount: Math.abs(amount),
                type: 'DEPOSIT',
                // referenceId: stripe_or_razorpay_id
            }
        });

        res.json({ message: 'Funds added to wallet', transaction: txn });
    } catch (err) {
        console.error('Wallet Add Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const addDues = async (req: Request, res: Response): Promise<void> => {
    const { session_id, player_id, amount } = req.body;

    try {
        if (!player_id || !amount || amount <= 0) {
            res.status(400).json({ error: 'Invalid player_id or amount' });
            return;
        }

        const due = await prisma.due.create({
            data: {
                sessionId: session_id || null,
                playerId: player_id,
                amount,
                status: 'PENDING'
            }
        });

        res.json({ message: 'Dues registered successfully', due });
    } catch (err) {
        console.error('Add Dues Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getPaymentSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;

        if (!organizationId && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: No organization context' });
            return;
        }

        const period = req.query.period as string;
        let dateFilterQuery: any = {};
        if (period === '30d') {
            dateFilterQuery = { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
        } else if (period === '7d') {
            dateFilterQuery = { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
        }

        // Scope by payer's organizationId — more reliable than session->branch->org (session can be null)
        const paymentFilter: any = req.user?.role === 'SUPER_ADMIN'
            ? { status: 'SUCCESS', ...dateFilterQuery }
            : { status: 'SUCCESS', payer: { organizationId }, ...dateFilterQuery };

        // For dues, scope by playerId via player's organizationId
        const dueFilter: any = req.user?.role === 'SUPER_ADMIN'
            ? { status: 'PENDING', ...dateFilterQuery }
            : { status: 'PENDING', player: { organizationId }, ...dateFilterQuery };

        const methods = ['CASH', 'UPI', 'CARD', 'WALLET'] as const;

        // Aggregate totals per payment method and dues
        const [methodTotals, recentPayments, dueTotalResult, recentDues] = await Promise.all([
            Promise.all(
                methods.map(method =>
                    prisma.payment.aggregate({
                        _sum: { amount: true },
                        where: { ...paymentFilter, method }
                    }).then(r => ({ method, total: Number(r._sum.amount || 0) }))
                )
            ),
            prisma.payment.findMany({
                where: paymentFilter,
                include: {
                    payer: { select: { fullName: true } },
                    session: {
                        include: { table: { select: { nameOrNumber: true } } }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            prisma.due.aggregate({
                _sum: { amount: true },
                where: dueFilter
            }),
            prisma.due.findMany({
                where: dueFilter,
                include: {
                    player: { select: { fullName: true } },
                    session: {
                        include: { table: { select: { nameOrNumber: true } } }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 20
            })
        ]);

        const formattedDues = recentDues.map(d => ({
            ...d,
            method: 'DUE'
        }));

        const combinedPayments = [...recentPayments, ...formattedDues]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 20);

        (methodTotals as Array<{ method: string; total: number }>).push({
            method: 'DUE',
            total: Number(dueTotalResult._sum.amount || 0)
        });

        const totalRevenue = methodTotals.reduce((acc, m) => acc + m.total, 0);

        res.json({
            methodBreakdown: methodTotals,
            totalRevenue,
            recentPayments: combinedPayments
        });
    } catch (err) {
        console.error('Payment Summary Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
