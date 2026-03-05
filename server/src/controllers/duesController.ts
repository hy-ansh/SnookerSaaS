import { Request, Response } from 'express';
import prisma from '../config/prisma';

// ── Store owner: get all dues ────────────────────────────────────────────────
export const getStoreDues = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const q = req.query.q as string | undefined;

        // Scope by player's organizationId so POS dues (where sessionId is null) are included
        const dues = await prisma.due.findMany({
            where: {
                player: {
                    organizationId: user.storeId,
                    ...(q ? {
                        OR: [
                            { fullName: { contains: q, mode: 'insensitive' } },
                            { email: { contains: q, mode: 'insensitive' } }
                        ]
                    } : {})
                }
            },
            include: {
                player: { select: { id: true, fullName: true, email: true } },
                session: {
                    select: {
                        id: true, startedAt: true, totalAmount: true, gameType: true,
                        table: { select: { nameOrNumber: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // For POS dues (no session), find the nearest matching order and embed item names
        const enrichedDues = await Promise.all(dues.map(async (due) => {
            if (due.sessionId) return { ...due, posOrder: null };

            // Find the closest order for this player within 60 seconds of due creation
            const windowMs = 60_000;
            const order = await prisma.order.findFirst({
                where: {
                    playerId: due.playerId,
                    createdAt: {
                        gte: new Date(due.createdAt.getTime() - windowMs),
                        lte: new Date(due.createdAt.getTime() + windowMs)
                    }
                },
                include: {
                    items: {
                        include: { inventoryItem: { select: { name: true, category: true } } }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return { ...due, posOrder: order };
        }));

        res.json({ dues: enrichedDues });
    } catch (err) {
        console.error('Get Dues Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching dues' });
    }
};

// ── Player: get own dues ─────────────────────────────────────────────────────
export const getMyDues = async (req: Request, res: Response): Promise<void> => {
    try {
        const playerId = req.user?.id;

        const dues = await prisma.due.findMany({
            where: { playerId },
            include: {
                session: {
                    include: {
                        table: { select: { nameOrNumber: true } },
                        branch: { select: { name: true } },
                        players: { include: { player: { select: { id: true, fullName: true } } } },
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const totalPending = dues
            .filter(d => d.status === 'PENDING')
            .reduce((sum, d) => sum + Number(d.amount), 0);

        res.json({ dues, totalPending });
    } catch (err) {
        console.error('Get My Dues Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching dues' });
    }
};

// ── Settle ALL pending dues for a player (Staff/Owner) ───────────────────────
export const settlePlayerDues = async (req: Request, res: Response): Promise<void> => {
    try {
        const { playerId } = req.params;
        const user = (req as any).user;
        const { method = 'CASH' } = req.body;

        // Scope by player.organizationId instead of session.branch so POS dues are included
        const duesToSettle = await prisma.due.findMany({
            where: {
                playerId: playerId as string,
                status: 'PENDING',
                player: { organizationId: user.storeId }
            }
        });

        if (duesToSettle.length === 0) {
            res.status(404).json({ error: 'No pending dues found for this player in your organization.' });
            return;
        }

        const totalAmount = duesToSettle.reduce((acc, due) => acc + Number(due.amount), 0);

        await prisma.$transaction(async (tx) => {
            await tx.due.updateMany({
                where: { id: { in: duesToSettle.map(d => d.id) } },
                data: { status: 'SETTLED' }
            });

            // Create a Payment record so it shows on Revenue Dashboard
            await tx.payment.create({
                data: {
                    payerId: playerId as string,
                    amount: totalAmount,
                    method: method as any,
                    status: 'SUCCESS'
                }
            });

            await tx.ledgerEntry.create({
                data: {
                    organizationId: user.storeId,
                    accountId: method,
                    debit: totalAmount,
                    credit: 0,
                    referenceType: 'DUES_SETTLEMENT',
                    referenceId: playerId as string
                }
            });
            await tx.ledgerEntry.create({
                data: {
                    organizationId: user.storeId,
                    accountId: 'ACCOUNTS_RECEIVABLE',
                    debit: 0,
                    credit: totalAmount,
                    referenceType: 'DUES_SETTLEMENT',
                    referenceId: playerId as string
                }
            });
        });

        res.json({ message: 'Dues successfully settled', amount: totalAmount });
    } catch (err) {
        console.error('Settle Dues Error:', err);
        res.status(500).json({ error: 'Internal server error while settling dues' });
    }
};

// ── Settle a SPECIFIC due (partial/individual) ───────────────────────────────
export const settleSpecificDue = async (req: Request, res: Response): Promise<void> => {
    try {
        const { dueId } = req.params;
        const dueIdStr = Array.isArray(dueId) ? dueId[0] : dueId;
        const user = (req as any).user;
        const { method = 'CASH', amount: partialAmount } = req.body;

        const due = await prisma.due.findUnique({
            where: { id: dueIdStr },
            include: {
                player: { select: { organizationId: true } },
                session: { include: { branch: true } }
            }
        });

        if (!due) {
            res.status(404).json({ error: 'Due not found' });
            return;
        }

        // Check org scope via player (covers POS dues with no session)
        const dueOrg = (due as any).player?.organizationId
            || (due as any).session?.branch?.organizationId;

        if (dueOrg !== user.storeId && user.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        if (due.status === 'SETTLED') {
            res.status(400).json({ error: 'Due is already settled' });
            return;
        }

        const dueAmount = Number(due.amount);
        const settledAmount = partialAmount ? Math.min(Number(partialAmount), dueAmount) : dueAmount;
        const isPartial = settledAmount < dueAmount;

        await prisma.$transaction(async (tx) => {
            if (isPartial) {
                await tx.due.update({
                    where: { id: dueIdStr },
                    data: { amount: dueAmount - settledAmount }
                });
                await tx.due.create({
                    data: {
                        playerId: due.playerId,
                        sessionId: due.sessionId ?? undefined,
                        amount: settledAmount,
                        status: 'SETTLED'
                    }
                });
            } else {
                await tx.due.update({
                    where: { id: dueIdStr },
                    data: { status: 'SETTLED' }
                });
            }

            // Create a Payment record so it shows up on Revenue Dashboard
            await tx.payment.create({
                data: {
                    payerId: due.playerId,
                    amount: settledAmount,
                    method: method as any,
                    status: 'SUCCESS'
                }
            });

            await tx.ledgerEntry.create({
                data: {
                    organizationId: user.storeId,
                    accountId: method,
                    debit: settledAmount,
                    credit: 0,
                    referenceType: 'DUES_SETTLEMENT',
                    referenceId: dueIdStr
                }
            });
            await tx.ledgerEntry.create({
                data: {
                    organizationId: user.storeId,
                    accountId: 'ACCOUNTS_RECEIVABLE',
                    debit: 0,
                    credit: settledAmount,
                    referenceType: 'DUES_SETTLEMENT',
                    referenceId: dueIdStr
                }
            });
        });

        res.json({
            message: isPartial ? `Partially settled ₹${settledAmount}` : 'Due fully settled',
            settledAmount,
            remaining: isPartial ? dueAmount - settledAmount : 0
        });
    } catch (err) {
        console.error('Settle Specific Due Error:', err);
        res.status(500).json({ error: 'Internal server error while settling due' });
    }
};
