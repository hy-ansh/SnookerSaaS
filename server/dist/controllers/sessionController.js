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
exports.getCompletedSessions = exports.getSessionById = exports.getActiveSessions = exports.updateSessionRate = exports.searchPlayers = exports.removePlayerFromSession = exports.addPlayerToSession = exports.endSession = exports.resumeSession = exports.pauseSession = exports.startSession = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const eloService_1 = require("../services/eloService");
const startSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { table_id, player_ids, game_type } = req.body;
    try {
        if (!table_id) {
            res.status(400).json({ error: 'table_id is required' });
            return;
        }
        const table = yield prisma_1.default.table.findUnique({
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
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'SUPER_ADMIN' &&
            ((_b = req.user) === null || _b === void 0 ? void 0 : _b.branchId) !== table.branchId &&
            ((_c = req.user) === null || _c === void 0 ? void 0 : _c.storeId) !== table.branch.organizationId) {
            res.status(403).json({ error: 'Forbidden: Table does not belong to your organization' });
            return;
        }
        // Dynamic Pricing — Prioritize Table custom rate, else fall back to branch rule, else ₹100/hr
        let hourlyRate = 100;
        if (table.customHourlyRate) {
            hourlyRate = Number(table.customHourlyRate);
        }
        else {
            const rule = yield prisma_1.default.pricingRule.findFirst({
                where: { branchId: table.branchId }
            });
            if (rule) {
                hourlyRate = Number(rule.hourlyRate);
            }
        }
        // DUES SYSTEM: Check Credit Limits
        if (player_ids && player_ids.length > 0) {
            for (const pid of player_ids) {
                const profile = yield prisma_1.default.playerProfile.findUnique({ where: { userId: pid } });
                if (profile && Number(profile.walletBalance) < -500) {
                    res.status(403).json({ error: `Player ${profile.nickname || pid} has exceeded the credit limit. Please recharge wallet.` });
                    return;
                }
            }
        }
        // Create Session & Update Table cleanly in a Transaction
        const [session] = yield prisma_1.default.$transaction([
            prisma_1.default.session.create({
                data: {
                    tableId: table_id,
                    branchId: table.branchId,
                    hourlyRateApplied: hourlyRate,
                    status: 'ACTIVE',
                    gameType: game_type || null,
                    players: player_ids && player_ids.length > 0 ? {
                        create: player_ids.map((id) => ({
                            playerId: id,
                            splitPct: 100 / player_ids.length
                        }))
                    } : undefined
                }
            }),
            prisma_1.default.table.update({
                where: { id: table_id },
                data: { status: 'PLAYING' }
            })
        ]);
        res.status(201).json({ message: 'Session started', session });
    }
    catch (err) {
        console.error('Start Session Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.startSession = startSession;
const pauseSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const sessionId = req.params.id;
    try {
        const session = yield prisma_1.default.session.findUnique({
            where: { id: sessionId },
            include: { branch: true }
        });
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        const sessionWithBranch = session;
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'SUPER_ADMIN' &&
            ((_b = req.user) === null || _b === void 0 ? void 0 : _b.branchId) !== session.branchId &&
            ((_c = req.user) === null || _c === void 0 ? void 0 : _c.storeId) !== sessionWithBranch.branch.organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (session.status !== 'ACTIVE') {
            res.status(400).json({ error: 'Only ACTIVE sessions can be paused' });
            return;
        }
        yield prisma_1.default.$transaction([
            prisma_1.default.session.update({
                where: { id: sessionId },
                data: { status: 'PAUSED' }
            }),
            prisma_1.default.sessionPause.create({
                data: { sessionId }
            }),
            prisma_1.default.table.update({
                where: { id: session.tableId },
                data: { status: 'AVAILABLE' }
            })
        ]);
        res.json({ message: 'Session paused successfully' });
    }
    catch (err) {
        console.error('Pause Session Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.pauseSession = pauseSession;
const resumeSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const sessionId = req.params.id;
    try {
        const session = yield prisma_1.default.session.findUnique({
            where: { id: sessionId },
            include: { branch: true }
        });
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        const sessionWithBranch = session;
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'SUPER_ADMIN' &&
            ((_b = req.user) === null || _b === void 0 ? void 0 : _b.branchId) !== session.branchId &&
            ((_c = req.user) === null || _c === void 0 ? void 0 : _c.storeId) !== sessionWithBranch.branch.organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (session.status !== 'PAUSED') {
            res.status(400).json({ error: 'Session is not paused' });
            return;
        }
        const activePause = yield prisma_1.default.sessionPause.findFirst({
            where: { sessionId, resumedAt: null }
        });
        if (!activePause) {
            yield prisma_1.default.session.update({
                where: { id: sessionId },
                data: { status: 'ACTIVE' }
            });
            res.json({ message: 'Session resumed (No tracking record)' });
            return;
        }
        const resumedAt = new Date();
        const durationSeconds = Math.floor((resumedAt.getTime() - activePause.pausedAt.getTime()) / 1000);
        yield prisma_1.default.$transaction([
            prisma_1.default.sessionPause.update({
                where: { id: activePause.id },
                data: { resumedAt }
            }),
            prisma_1.default.session.update({
                where: { id: sessionId },
                data: {
                    status: 'ACTIVE',
                    pausedDurationSecs: { increment: durationSeconds }
                }
            }),
            prisma_1.default.table.update({
                where: { id: session.tableId },
                data: { status: 'PLAYING' }
            })
        ]);
        res.json({ message: 'Session resumed successfully', pausedDurationSecs: durationSeconds });
    }
    catch (err) {
        console.error('Resume Session Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.resumeSession = resumeSession;
const endSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sessionId = req.params.id;
    // paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'DUES' | 'SPLIT'
    // splitPayments: [{ playerId, method, amount }] — for split among players
    const { paymentMethod = 'CASH', splitPayments, gameType, winnerIds } = req.body;
    try {
        const session = yield prisma_1.default.session.findUnique({
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
            const activePause = yield prisma_1.default.sessionPause.findFirst({
                where: { sessionId, resumedAt: null }
            });
            if (activePause) {
                const endedNow = new Date();
                currentPausedSecs += Math.floor((endedNow.getTime() - activePause.pausedAt.getTime()) / 1000);
                yield prisma_1.default.sessionPause.update({
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
        const sessionWithBranch = session;
        const organizationId = sessionWithBranch.branch.organizationId;
        // Perform final DB updates in transaction
        const updatedSession = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const ended = yield tx.session.update({
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
            yield tx.table.update({
                where: { id: session.tableId },
                data: { status: 'AVAILABLE' }
            });
            // Write Ledger Entry
            yield tx.ledgerEntry.create({
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
                const avgWinnerElo = winners.reduce((sum, p) => { var _a; return sum + (((_a = p.player.profile) === null || _a === void 0 ? void 0 : _a.eloRating) || 1200); }, 0) / winners.length;
                const avgLoserElo = losers.reduce((sum, p) => { var _a; return sum + (((_a = p.player.profile) === null || _a === void 0 ? void 0 : _a.eloRating) || 1200); }, 0) / losers.length;
                const { newRatingA: newWinnerElo, newRatingB: newLoserElo } = (0, eloService_1.calculateElo)(avgWinnerElo, avgLoserElo, 1, 0);
                const winnerDelta = newWinnerElo - avgWinnerElo;
                const loserDelta = newLoserElo - avgLoserElo;
                for (const w of winners) {
                    if (w.player.profile) {
                        yield tx.playerProfile.update({
                            where: { id: w.player.profile.id },
                            data: { eloRating: { increment: Math.round(winnerDelta) }, matchesPlayed: { increment: 1 }, matchesWon: { increment: 1 } }
                        });
                    }
                }
                for (const l of losers) {
                    if (l.player.profile) {
                        yield tx.playerProfile.update({
                            where: { id: l.player.profile.id },
                            data: { eloRating: { increment: Math.round(loserDelta) }, matchesPlayed: { increment: 1 } }
                        });
                    }
                }
            }
            else if (players.length > 0) {
                // Update matches played even if no clear winners
                for (const p of players) {
                    if (p.player.profile) {
                        yield tx.playerProfile.update({
                            where: { id: p.player.profile.id },
                            data: { matchesPlayed: { increment: 1 } }
                        });
                    }
                }
            }
            // Handle payment method
            if (paymentMethod === 'DUES') {
                // Add to dues for each player (split equally)
                const players = session.players || [];
                const perPlayer = players.length > 0 ? totalAmount / players.length : totalAmount;
                for (const sp of players) {
                    yield tx.playerProfile.updateMany({
                        where: { userId: sp.playerId },
                        data: { walletBalance: { decrement: perPlayer } }
                    });
                    yield tx.due.create({
                        data: {
                            playerId: sp.playerId,
                            sessionId,
                            amount: perPlayer,
                            status: 'PENDING'
                        }
                    });
                }
            }
            else if (paymentMethod === 'SPLIT' && splitPayments && splitPayments.length > 0) {
                // Individual split payments per player
                for (const sp of splitPayments) {
                    if (sp.method === 'DUES') {
                        yield tx.playerProfile.updateMany({
                            where: { userId: sp.playerId },
                            data: { walletBalance: { decrement: sp.amount } }
                        });
                        yield tx.due.create({
                            data: {
                                playerId: sp.playerId,
                                sessionId,
                                amount: sp.amount,
                                status: 'PENDING'
                            }
                        });
                    }
                    else {
                        // Payment requires payerId — use the player's userId
                        yield tx.payment.create({
                            data: {
                                sessionId,
                                payerId: sp.playerId,
                                amount: sp.amount,
                                method: sp.method,
                                status: 'SUCCESS'
                            }
                        });
                    }
                }
            }
            else {
                // Single payment — only record if we have a payer (first player, or skip if no players)
                const firstPlayerId = (_a = (session.players || [])[0]) === null || _a === void 0 ? void 0 : _a.playerId;
                if (firstPlayerId && paymentMethod !== 'DUES') {
                    yield tx.payment.create({
                        data: {
                            sessionId,
                            payerId: firstPlayerId,
                            amount: totalAmount,
                            method: paymentMethod,
                            status: 'SUCCESS'
                        }
                    });
                }
            }
            return ended;
        }));
        res.json({ message: 'Session ended successfully', session: updatedSession, totalAmount, durationMinutes });
    }
    catch (err) {
        console.error('End Session Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.endSession = endSession;
const addPlayerToSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sessionId = req.params.id;
    const { playerId } = req.body;
    if (!playerId) {
        res.status(400).json({ error: 'playerId is required' });
        return;
    }
    try {
        const session = yield prisma_1.default.session.findUnique({
            where: { id: sessionId },
            include: { players: true }
        });
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
            res.status(400).json({ error: 'Cannot add player to a completed session' });
            return;
        }
        const alreadyIn = session.players.some((p) => p.playerId === playerId);
        if (alreadyIn) {
            res.status(409).json({ error: 'Player already in session' });
            return;
        }
        // Recalculate split %
        const newCount = session.players.length + 1;
        const newSplitPct = 100 / newCount;
        yield prisma_1.default.$transaction([
            // Update existing players' split
            ...session.players.map((p) => prisma_1.default.sessionPlayer.update({
                where: { sessionId_playerId: { sessionId: p.sessionId, playerId: p.playerId } },
                data: { splitPct: newSplitPct }
            })),
            // Add new player
            prisma_1.default.sessionPlayer.create({
                data: { sessionId, playerId, splitPct: newSplitPct }
            })
        ]);
        const updated = yield prisma_1.default.session.findUnique({
            where: { id: sessionId },
            include: { players: { include: { player: true } }, table: true, branch: true }
        });
        res.json({ message: 'Player added', session: updated });
    }
    catch (err) {
        console.error('Add Player Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.addPlayerToSession = addPlayerToSession;
const removePlayerFromSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sessionId = req.params.id;
    const { playerId } = req.body;
    if (!playerId) {
        res.status(400).json({ error: 'playerId is required' });
        return;
    }
    try {
        const session = yield prisma_1.default.session.findUnique({
            where: { id: sessionId },
            include: { players: true }
        });
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        const playerEntry = session.players.find((p) => p.playerId === playerId);
        if (!playerEntry) {
            res.status(404).json({ error: 'Player not in session' });
            return;
        }
        yield prisma_1.default.sessionPlayer.delete({
            where: { sessionId_playerId: { sessionId, playerId } }
        });
        // Rebalance splits
        const remaining = session.players.filter((p) => p.playerId !== playerId);
        if (remaining.length > 0) {
            const newSplit = 100 / remaining.length;
            yield prisma_1.default.$transaction(remaining.map((p) => prisma_1.default.sessionPlayer.update({
                where: { sessionId_playerId: { sessionId: p.sessionId, playerId: p.playerId } },
                data: { splitPct: newSplit }
            })));
        }
        const updated = yield prisma_1.default.session.findUnique({
            where: { id: sessionId },
            include: { players: { include: { player: true } }, table: true, branch: true }
        });
        res.json({ message: 'Player removed', session: updated });
    }
    catch (err) {
        console.error('Remove Player Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.removePlayerFromSession = removePlayerFromSession;
const searchPlayers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { q } = req.query;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
    try {
        const players = yield prisma_1.default.user.findMany({
            where: Object.assign(Object.assign({ 
                // Players are users with a PlayerProfile record
                profile: { isNot: null } }, (organizationId ? { organizationId } : {})), (q ? {
                OR: [
                    { fullName: { contains: String(q), mode: 'insensitive' } },
                    { email: { contains: String(q), mode: 'insensitive' } }
                ]
            } : {})),
            select: {
                id: true,
                fullName: true,
                email: true,
                profile: { select: { nickname: true, walletBalance: true } }
            },
            take: 20
        });
        res.json(players);
    }
    catch (err) {
        console.error('Search Players Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.searchPlayers = searchPlayers;
const updateSessionRate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const sessionId = req.params.id;
    const { newRate } = req.body;
    if (!newRate || isNaN(Number(newRate)) || Number(newRate) < 0) {
        res.status(400).json({ error: 'A valid positive newRate is required' });
        return;
    }
    try {
        const session = yield prisma_1.default.session.findUnique({
            where: { id: sessionId },
            include: { branch: true }
        });
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        const sessionWithBranch = session;
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'SUPER_ADMIN' &&
            ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'STORE_OWNER' &&
            ((_c = req.user) === null || _c === void 0 ? void 0 : _c.storeId) !== sessionWithBranch.branch.organizationId) {
            res.status(403).json({ error: 'Forbidden: Only owners/admins can change session rates' });
            return;
        }
        if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
            res.status(400).json({ error: 'Cannot change rate of a completed or cancelled session' });
            return;
        }
        const updated = yield prisma_1.default.session.update({
            where: { id: sessionId },
            data: { hourlyRateApplied: Number(newRate) }
        });
        res.json({ message: 'Session rate updated successfully', session: updated });
    }
    catch (err) {
        console.error('Update Session Rate Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateSessionRate = updateSessionRate;
const getActiveSessions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        // Enforce organization scope
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: No organization context' });
            return;
        }
        const activeSessions = yield prisma_1.default.session.findMany({
            where: {
                status: { in: ['ACTIVE', 'PAUSED'] },
                branch: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'SUPER_ADMIN' ? undefined : { organizationId }
            },
            include: {
                table: true,
                players: { include: { player: true } }
            }
        });
        res.json(activeSessions);
    }
    catch (err) {
        console.error('Get Active Sessions Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getActiveSessions = getActiveSessions;
const getSessionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const sessionId = req.params.id;
        const session = yield prisma_1.default.session.findUnique({
            where: { id: sessionId },
            include: {
                table: true,
                branch: true,
                players: { include: { player: true } }
            }
        });
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        const sessionWithBranch = session;
        // Auth Isolation Check
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'SUPER_ADMIN' &&
            ((_b = req.user) === null || _b === void 0 ? void 0 : _b.storeId) !== ((_c = sessionWithBranch.branch) === null || _c === void 0 ? void 0 : _c.organizationId) &&
            ((_d = req.user) === null || _d === void 0 ? void 0 : _d.branchId) !== session.branchId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        res.json(session);
    }
    catch (err) {
        console.error('Get Session Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getSessionById = getSessionById;
const getCompletedSessions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const completedSessions = yield prisma_1.default.session.findMany({
            where: {
                status: 'COMPLETED',
                branch: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'SUPER_ADMIN' ? undefined : { organizationId }
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
    }
    catch (err) {
        console.error('Get Completed Sessions Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getCompletedSessions = getCompletedSessions;
