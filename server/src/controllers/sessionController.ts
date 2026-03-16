import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { calculateElo } from '../services/eloService';

export const startSession = async (req: Request, res: Response): Promise<void> => {
    const { table_id, player_ids, game_type } = req.body;

    try {
        if (!table_id) {
            res.status(400).json({ error: 'table_id is required' });
            return;
        }

        const table = await prisma.table.findUnique({
            where: { id: table_id },
            include: { branch: true }
        });

        if (!table) {
            res.status(404).json({ error: 'Table not found' });
            return;
        }

        if (table.status !== 'AVAILABLE') {
            res.status(400).json({ error: `Table is currently ${table.status}` });
            return;
        }

        // Branch Access Check - Tenant Isolation
        if (req.user?.role !== 'SUPER_ADMIN' &&
            req.user?.branchId !== table.branchId &&
            req.user?.storeId !== table.branch.organizationId) {
            res.status(403).json({ error: 'Forbidden: Table does not belong to your organization' });
            return;
        }

        // Dynamic Pricing — Prioritize Table custom rate, else fall back to branch rule, else ₹100/hr
        let hourlyRate = 100;

        if (table.customHourlyRate) {
            hourlyRate = Number(table.customHourlyRate);
        } else {
            const rule = await prisma.pricingRule.findFirst({
                where: { branchId: table.branchId }
            });
            if (rule) {
                hourlyRate = Number(rule.hourlyRate);
            }
        }

        // WALLET / CREDIT LIMIT CHECK — Disabled for now (future feature)
        // Wallet logic will be re-enabled once the wallet system is implemented.

        // Create Session & Update Table cleanly in a Transaction
        const [session] = await prisma.$transaction([
            prisma.session.create({
                data: {
                    tableId: table_id,
                    branchId: table.branchId,
                    hourlyRateApplied: hourlyRate,
                    status: 'ACTIVE',
                    gameType: game_type || null,
                    players: player_ids && player_ids.length > 0 ? {
                        create: player_ids.map((id: string) => ({
                            playerId: id,
                            splitPct: 100 / player_ids.length
                        }))
                    } : undefined
                }
            }),
            prisma.table.update({
                where: { id: table_id },
                data: { status: 'PLAYING' }
            })
        ]);

        res.status(201).json({ message: 'Session started', session });
    } catch (err) {
        console.error('Start Session Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const pauseSession = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.params.id as string;

    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { branch: true }
        });

        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        const sessionWithBranch = session as any;
        if (req.user?.role !== 'SUPER_ADMIN' &&
            req.user?.branchId !== session.branchId &&
            req.user?.storeId !== sessionWithBranch.branch.organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        if (session.status !== 'ACTIVE') {
            res.status(400).json({ error: 'Only ACTIVE sessions can be paused' });
            return;
        }

        await prisma.$transaction([
            prisma.session.update({
                where: { id: sessionId },
                data: { status: 'PAUSED' }
            }),
            prisma.sessionPause.create({
                data: { sessionId }
            }),
            prisma.table.update({
                where: { id: session.tableId },
                data: { status: 'AVAILABLE' }
            })
        ]);

        res.json({ message: 'Session paused successfully' });
    } catch (err) {
        console.error('Pause Session Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const resumeSession = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.params.id as string;

    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { branch: true }
        });

        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        const sessionWithBranch = session as any;
        if (req.user?.role !== 'SUPER_ADMIN' &&
            req.user?.branchId !== session.branchId &&
            req.user?.storeId !== sessionWithBranch.branch.organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        if (session.status !== 'PAUSED') {
            res.status(400).json({ error: 'Session is not paused' });
            return;
        }

        const activePause = await prisma.sessionPause.findFirst({
            where: { sessionId, resumedAt: null }
        });

        if (!activePause) {
            await prisma.session.update({
                where: { id: sessionId },
                data: { status: 'ACTIVE' }
            });
            res.json({ message: 'Session resumed (No tracking record)' });
            return;
        }

        const resumedAt = new Date();
        const durationSeconds = Math.floor((resumedAt.getTime() - activePause.pausedAt.getTime()) / 1000);

        await prisma.$transaction([
            prisma.sessionPause.update({
                where: { id: activePause.id },
                data: { resumedAt }
            }),
            prisma.session.update({
                where: { id: sessionId },
                data: {
                    status: 'ACTIVE',
                    pausedDurationSecs: { increment: durationSeconds }
                }
            }),
            prisma.table.update({
                where: { id: session.tableId },
                data: { status: 'PLAYING' }
            })
        ]);

        res.json({ message: 'Session resumed successfully', pausedDurationSecs: durationSeconds });
    } catch (err) {
        console.error('Resume Session Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const endSession = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.params.id as string;
    // paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'DUES' | 'SPLIT'
    // splitPayments: [{ playerId, method, amount }] — for split among players
    const { paymentMethod = 'CASH', splitPayments, gameType, winnerIds } = req.body;

    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { branch: true, players: { include: { player: { include: { profile: true } } } } }
        });

        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
            res.status(400).json({ error: 'Session is already completed or cancelled' });
            return;
        }

        // Close out any lingering pause if stopped abruptly
        let currentPausedSecs = session.pausedDurationSecs;
        if (session.status === 'PAUSED') {
            const activePause = await prisma.sessionPause.findFirst({
                where: { sessionId, resumedAt: null }
            });
            if (activePause) {
                const endedNow = new Date();
                currentPausedSecs += Math.floor((endedNow.getTime() - activePause.pausedAt.getTime()) / 1000);
                await prisma.sessionPause.update({
                    where: { id: activePause.id },
                    data: { resumedAt: endedNow }
                });
            }
        }

        const endedAt = new Date();
        const totalElapsedSecs = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);
        const effectivePlaySecs = totalElapsedSecs - currentPausedSecs;
        const durationMinutes = Math.ceil(effectivePlaySecs / 60);

        const amount = (durationMinutes / 60) * Number(session.hourlyRateApplied);
        const totalAmount = Math.round(amount * 100) / 100;

        const sessionWithBranch = session as any;
        const organizationId = sessionWithBranch.branch.organizationId;

        // Perform final DB updates in transaction
        const updatedSession = await prisma.$transaction(async (tx) => {
            const ended = await tx.session.update({
                where: { id: sessionId },
                data: {
                    status: 'COMPLETED',
                    endedAt,
                    durationMinutes,
                    totalAmount,
                    pausedDurationSecs: currentPausedSecs,
                    gameType: gameType || null,
                    winnerIds: winnerIds || []
                }
            });

            await tx.table.update({
                where: { id: session.tableId },
                data: { status: 'AVAILABLE' }
            });

            // Write Ledger Entry
            await tx.ledgerEntry.create({
                data: {
                    organizationId,
                    accountId: 'Revenue_Session',
                    debit: 0,
                    credit: totalAmount,
                    referenceType: 'SESSION',
                    referenceId: sessionId
                }
            });

            // Elo Rating Update
            const players = session.players || [];
            if (players.length > 1 && winnerIds && winnerIds.length > 0 && winnerIds.length < players.length) {
                const winners = players.filter(p => winnerIds.includes(p.playerId));
                const losers = players.filter(p => !winnerIds.includes(p.playerId));

                const avgWinnerElo = winners.reduce((sum, p) => sum + (p.player.profile?.eloRating || 1200), 0) / winners.length;
                const avgLoserElo = losers.reduce((sum, p) => sum + (p.player.profile?.eloRating || 1200), 0) / losers.length;

                const { newRatingA: newWinnerElo, newRatingB: newLoserElo } = calculateElo(avgWinnerElo, avgLoserElo, 1, 0);

                const winnerDelta = newWinnerElo - avgWinnerElo;
                const loserDelta = newLoserElo - avgLoserElo;

                for (const w of winners) {
                    if (w.player.profile) {
                        await tx.playerProfile.update({
                            where: { id: w.player.profile.id },
                            data: { eloRating: { increment: Math.round(winnerDelta) }, matchesPlayed: { increment: 1 }, matchesWon: { increment: 1 } }
                        });
                    }
                }
                for (const l of losers) {
                    if (l.player.profile) {
                        await tx.playerProfile.update({
                            where: { id: l.player.profile.id },
                            data: { eloRating: { increment: Math.round(loserDelta) }, matchesPlayed: { increment: 1 } }
                        });
                    }
                }
            } else if (players.length > 0) {
                // Update matches played even if no clear winners
                for (const p of players) {
                    if (p.player.profile) {
                        await tx.playerProfile.update({
                            where: { id: p.player.profile.id },
                            data: { matchesPlayed: { increment: 1 } }
                        });
                    }
                }
            }

            // ── GameType-Aware Payment & Dues Logic ──────────────────────────
            const allPlayers = session.players || [];
            const effectiveGameType = gameType || session.gameType || 'SPLIT';

            // Determine which players are responsible for payment based on gameType
            let payingPlayers = allPlayers;
            if (effectiveGameType === 'LTP' && winnerIds && winnerIds.length > 0 && allPlayers.length > 1) {
                // LTP (Loser To Pay): Only losers (non-winners) pay the full amount
                payingPlayers = allPlayers.filter(p => !winnerIds.includes(p.playerId));
            } else if (effectiveGameType === 'SOLO' && allPlayers.length > 0) {
                // SOLO: Only the first player pays the full amount
                payingPlayers = [allPlayers[0]];
            }
            // SPLIT (default): All players split equally — payingPlayers stays as allPlayers

            console.log('[EndSession DEBUG] req.body:', JSON.stringify(req.body));
            console.log('[EndSession DEBUG] effectiveGameType:', effectiveGameType, '| winnerIds:', winnerIds, '| allPlayers:', allPlayers.map(p => p.playerId), '| payingPlayers:', payingPlayers.map(p => p.playerId));

            if (paymentMethod === 'DUES') {
                // Create dues only for the paying players
                const perPlayer = payingPlayers.length > 0
                    ? Math.round((totalAmount / payingPlayers.length) * 100) / 100
                    : totalAmount;

                for (const sp of payingPlayers) {
                    await tx.due.create({
                        data: {
                            playerId: sp.playerId,
                            sessionId,
                            amount: perPlayer,
                            status: 'PENDING'
                        }
                    });
                }
            } else if (paymentMethod === 'SPLIT' && splitPayments && splitPayments.length > 0) {
                // Individual split payments per player
                for (const sp of splitPayments) {
                    if (sp.method === 'DUES') {
                        await tx.due.create({
                            data: {
                                playerId: sp.playerId,
                                sessionId,
                                amount: sp.amount,
                                status: 'PENDING'
                            }
                        });
                    } else {
                        await tx.payment.create({
                            data: {
                                sessionId,
                                payerId: sp.playerId,
                                amount: sp.amount,
                                method: sp.method as any,
                                status: 'SUCCESS'
                            }
                        });
                    }
                }
            } else {
                // Single payment (CASH/UPI/CARD) — record for the first paying player
                const payerId = payingPlayers[0]?.playerId || allPlayers[0]?.playerId;
                if (payerId) {
                    await tx.payment.create({
                        data: {
                            sessionId,
                            payerId,
                            amount: totalAmount,
                            method: paymentMethod as any,
                            status: 'SUCCESS'
                        }
                    });
                }
            }

            return ended;
        });

        res.json({ message: 'Session ended successfully', session: updatedSession, totalAmount, durationMinutes });
    } catch (err) {
        console.error('End Session Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const addPlayerToSession = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.params.id as string;
    const { playerId } = req.body;

    if (!playerId) {
        res.status(400).json({ error: 'playerId is required' });
        return;
    }

    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { players: true }
        });

        if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
        if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
            res.status(400).json({ error: 'Cannot add player to a completed session' }); return;
        }

        const alreadyIn = session.players.some((p: any) => p.playerId === playerId);
        if (alreadyIn) { res.status(409).json({ error: 'Player already in session' }); return; }

        // Recalculate split %
        const newCount = session.players.length + 1;
        const newSplitPct = 100 / newCount;

        await prisma.$transaction([
            // Update existing players' split
            ...session.players.map((p: any) =>
                prisma.sessionPlayer.update({
                    where: { sessionId_playerId: { sessionId: p.sessionId, playerId: p.playerId } },
                    data: { splitPct: newSplitPct }
                })
            ),
            // Add new player
            prisma.sessionPlayer.create({
                data: { sessionId, playerId, splitPct: newSplitPct }
            })
        ]);

        const updated = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { players: { include: { player: true } }, table: true, branch: true }
        });

        res.json({ message: 'Player added', session: updated });
    } catch (err) {
        console.error('Add Player Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const removePlayerFromSession = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.params.id as string;
    const { playerId } = req.body;

    if (!playerId) {
        res.status(400).json({ error: 'playerId is required' });
        return;
    }

    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { players: true }
        });

        if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

        const playerEntry = session.players.find((p: any) => p.playerId === playerId);
        if (!playerEntry) { res.status(404).json({ error: 'Player not in session' }); return; }

        await prisma.sessionPlayer.delete({
            where: { sessionId_playerId: { sessionId, playerId } }
        });

        // Rebalance splits
        const remaining = session.players.filter((p: any) => p.playerId !== playerId);
        if (remaining.length > 0) {
            const newSplit = 100 / remaining.length;
            await prisma.$transaction(
                remaining.map((p: any) =>
                    prisma.sessionPlayer.update({
                        where: { sessionId_playerId: { sessionId: p.sessionId, playerId: p.playerId } },
                        data: { splitPct: newSplit }
                    })
                )
            );
        }

        const updated = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { players: { include: { player: true } }, table: true, branch: true }
        });

        res.json({ message: 'Player removed', session: updated });
    } catch (err) {
        console.error('Remove Player Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const searchPlayers = async (req: Request, res: Response): Promise<void> => {
    const { q } = req.query;
    const organizationId = req.user?.storeId;

    try {
        const players = await prisma.user.findMany({
            where: {
                // Players are users with a PlayerProfile record
                profile: { isNot: null },
                ...(organizationId ? { organizationId } : {}),
                ...(q ? {
                    OR: [
                        { fullName: { contains: String(q), mode: 'insensitive' } },
                        { email: { contains: String(q), mode: 'insensitive' } }
                    ]
                } : {})
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                profile: { select: { nickname: true, walletBalance: true } }
            },
            take: 20
        });

        res.json(players);
    } catch (err) {
        console.error('Search Players Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateSessionRate = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.params.id as string;
    const { newRate } = req.body;

    if (!newRate || isNaN(Number(newRate)) || Number(newRate) < 0) {
        res.status(400).json({ error: 'A valid positive newRate is required' });
        return;
    }

    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { branch: true }
        });

        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        const sessionWithBranch = session as any;
        if (req.user?.role !== 'SUPER_ADMIN' &&
            req.user?.role !== 'STORE_OWNER' &&
            req.user?.storeId !== sessionWithBranch.branch.organizationId) {
            res.status(403).json({ error: 'Forbidden: Only owners/admins can change session rates' });
            return;
        }

        if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
            res.status(400).json({ error: 'Cannot change rate of a completed or cancelled session' });
            return;
        }

        const updated = await prisma.session.update({
            where: { id: sessionId },
            data: { hourlyRateApplied: Number(newRate) }
        });

        res.json({ message: 'Session rate updated successfully', session: updated });
    } catch (err) {
        console.error('Update Session Rate Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getActiveSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        // Enforce organization scope
        const organizationId = req.user?.storeId;

        if (!organizationId && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: No organization context' });
            return;
        }

        const activeSessions = await prisma.session.findMany({
            where: {
                status: { in: ['ACTIVE', 'PAUSED'] },
                branch: req.user?.role === 'SUPER_ADMIN' ? undefined : { organizationId }
            },
            include: {
                table: true,
                players: { include: { player: true } },
                pauses: { where: { resumedAt: null } }
            }
        });

        res.json(activeSessions);
    } catch (err) {
        console.error('Get Active Sessions Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getSessionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionId = req.params.id as string;
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                table: true,
                branch: true,
                players: { include: { player: true } },
                pauses: { where: { resumedAt: null } }
            }
        });

        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        const sessionWithBranch = session as any;

        // Auth Isolation Check
        if (req.user?.role !== 'SUPER_ADMIN' &&
            req.user?.storeId !== sessionWithBranch.branch?.organizationId &&
            req.user?.branchId !== session.branchId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        res.json(session);
    } catch (err) {
        console.error('Get Session Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getCompletedSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;

        if (!organizationId && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const completedSessions = await prisma.session.findMany({
            where: {
                status: 'COMPLETED',
                branch: req.user?.role === 'SUPER_ADMIN' ? undefined : { organizationId }
            },
            include: {
                table: true,
                players: { include: { player: true } },
                payments: { select: { payerId: true, method: true, status: true } },
                dues: { select: { playerId: true, amount: true, status: true } },
            },
            orderBy: {
                endedAt: 'desc'
            },
            take: 50
        });

        res.json(completedSessions);
    } catch (err) {
        console.error('Get Completed Sessions Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
