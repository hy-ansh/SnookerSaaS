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
exports.settleSpecificDue = exports.settlePlayerDues = exports.getMyDues = exports.getStoreDues = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
// ── Store owner: get all dues ────────────────────────────────────────────────
const getStoreDues = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const q = req.query.q;
        // Scope by player's organizationId so POS dues (where sessionId is null) are included
        const dues = yield prisma_1.default.due.findMany({
            where: {
                player: Object.assign({ organizationId: user.storeId }, (q ? {
                    OR: [
                        { fullName: { contains: q, mode: 'insensitive' } },
                        { email: { contains: q, mode: 'insensitive' } }
                    ]
                } : {}))
            },
            include: {
                player: { select: { id: true, fullName: true, email: true } },
                session: {
                    select: {
                        id: true, startedAt: true, totalAmount: true, gameType: true, branchId: true,
                        table: { select: { nameOrNumber: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // For POS dues (no session), find the nearest matching order and embed item names
        let enrichedDues = yield Promise.all(dues.map((due) => __awaiter(void 0, void 0, void 0, function* () {
            if (due.sessionId)
                return Object.assign(Object.assign({}, due), { posOrder: null });
            // Find the closest order for this player within 60 seconds of due creation
            const windowMs = 60000;
            const order = yield prisma_1.default.order.findFirst({
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
            return Object.assign(Object.assign({}, due), { posOrder: order });
        })));
        // Scope by branchId if user is STAFF or restricted to a branch
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'STORE_OWNER' && user.branchId) {
            enrichedDues = enrichedDues.filter(d => {
                var _a;
                if (d.sessionId)
                    return ((_a = d.session) === null || _a === void 0 ? void 0 : _a.branchId) === user.branchId;
                if (d.posOrder)
                    return d.posOrder.branchId === user.branchId;
                // If we can't determine the branch for a POS due, hide it from branch-restricted staff
                return false;
            });
        }
        res.json({ dues: enrichedDues });
    }
    catch (err) {
        console.error('Get Dues Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching dues' });
    }
});
exports.getStoreDues = getStoreDues;
// ── Player: get own dues ─────────────────────────────────────────────────────
const getMyDues = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const playerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const dues = yield prisma_1.default.due.findMany({
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
    }
    catch (err) {
        console.error('Get My Dues Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching dues' });
    }
});
exports.getMyDues = getMyDues;
// ── Settle ALL pending dues for a player (Staff/Owner) ───────────────────────
const settlePlayerDues = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { playerId } = req.params;
        const user = req.user;
        const { method = 'CASH' } = req.body;
        // Scope by player.organizationId instead of session.branch so POS dues are included
        let duesToSettle = yield prisma_1.default.due.findMany({
            where: {
                playerId: playerId,
                status: 'PENDING',
                player: { organizationId: user.storeId }
            },
            include: {
                session: {
                    select: { branchId: true }
                }
            }
        });
        // Filter by branchId if user is STAFF
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'STORE_OWNER' && user.branchId) {
            const enriched = yield Promise.all(duesToSettle.map((d) => __awaiter(void 0, void 0, void 0, function* () {
                if (d.sessionId)
                    return Object.assign(Object.assign({}, d), { posOrder: null });
                const order = yield prisma_1.default.order.findFirst({
                    where: {
                        playerId: d.playerId,
                        createdAt: {
                            gte: new Date(d.createdAt.getTime() - 60000),
                            lte: new Date(d.createdAt.getTime() + 60000)
                        }
                    }
                });
                return Object.assign(Object.assign({}, d), { posOrder: order });
            })));
            duesToSettle = enriched.filter(d => {
                var _a;
                if (d.sessionId)
                    return ((_a = d.session) === null || _a === void 0 ? void 0 : _a.branchId) === user.branchId;
                if (d.posOrder)
                    return d.posOrder.branchId === user.branchId;
                return false;
            });
        }
        if (duesToSettle.length === 0) {
            res.status(404).json({ error: 'No pending dues found for this player in your organization.' });
            return;
        }
        const totalAmount = duesToSettle.reduce((acc, due) => acc + Number(due.amount), 0);
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.due.updateMany({
                where: { id: { in: duesToSettle.map(d => d.id) } },
                data: { status: 'SETTLED' }
            });
            // Create a Payment record so it shows on Revenue Dashboard
            yield tx.payment.create({
                data: {
                    payerId: playerId,
                    amount: totalAmount,
                    method: method,
                    status: 'SUCCESS'
                }
            });
            yield tx.ledgerEntry.create({
                data: {
                    organizationId: user.storeId,
                    accountId: method,
                    debit: totalAmount,
                    credit: 0,
                    referenceType: 'DUES_SETTLEMENT',
                    referenceId: playerId
                }
            });
            yield tx.ledgerEntry.create({
                data: {
                    organizationId: user.storeId,
                    accountId: 'ACCOUNTS_RECEIVABLE',
                    debit: 0,
                    credit: totalAmount,
                    referenceType: 'DUES_SETTLEMENT',
                    referenceId: playerId
                }
            });
        }));
        res.json({ message: 'Dues successfully settled', amount: totalAmount });
    }
    catch (err) {
        console.error('Settle Dues Error:', err);
        res.status(500).json({ error: 'Internal server error while settling dues' });
    }
});
exports.settlePlayerDues = settlePlayerDues;
// ── Settle a SPECIFIC due (partial/individual) ───────────────────────────────
const settleSpecificDue = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { dueId } = req.params;
        const dueIdStr = Array.isArray(dueId) ? dueId[0] : dueId;
        const user = req.user;
        const { method = 'CASH', amount: partialAmount } = req.body;
        const due = yield prisma_1.default.due.findUnique({
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
        const dueOrg = ((_a = due.player) === null || _a === void 0 ? void 0 : _a.organizationId)
            || ((_c = (_b = due.session) === null || _b === void 0 ? void 0 : _b.branch) === null || _c === void 0 ? void 0 : _c.organizationId);
        if (dueOrg !== user.storeId && user.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        // Check branch scope for Staff
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'STORE_OWNER' && user.branchId) {
            let matchesBranch = false;
            if (due.sessionId) {
                matchesBranch = ((_d = due.session) === null || _d === void 0 ? void 0 : _d.branchId) === user.branchId;
            }
            else {
                const order = yield prisma_1.default.order.findFirst({
                    where: {
                        playerId: due.playerId,
                        createdAt: {
                            gte: new Date(due.createdAt.getTime() - 60000),
                            lte: new Date(due.createdAt.getTime() + 60000)
                        }
                    }
                });
                if ((order === null || order === void 0 ? void 0 : order.branchId) === user.branchId)
                    matchesBranch = true;
            }
            if (!matchesBranch) {
                res.status(403).json({ error: 'Forbidden: Due belongs to a different branch' });
                return;
            }
        }
        if (due.status === 'SETTLED') {
            res.status(400).json({ error: 'Due is already settled' });
            return;
        }
        const dueAmount = Number(due.amount);
        const settledAmount = partialAmount ? Math.min(Number(partialAmount), dueAmount) : dueAmount;
        const isPartial = settledAmount < dueAmount;
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            if (isPartial) {
                yield tx.due.update({
                    where: { id: dueIdStr },
                    data: { amount: dueAmount - settledAmount }
                });
                yield tx.due.create({
                    data: {
                        playerId: due.playerId,
                        sessionId: (_a = due.sessionId) !== null && _a !== void 0 ? _a : undefined,
                        amount: settledAmount,
                        status: 'SETTLED'
                    }
                });
            }
            else {
                yield tx.due.update({
                    where: { id: dueIdStr },
                    data: { status: 'SETTLED' }
                });
            }
            // Create a Payment record so it shows up on Revenue Dashboard
            yield tx.payment.create({
                data: {
                    payerId: due.playerId,
                    amount: settledAmount,
                    method: method,
                    status: 'SUCCESS'
                }
            });
            yield tx.ledgerEntry.create({
                data: {
                    organizationId: user.storeId,
                    accountId: method,
                    debit: settledAmount,
                    credit: 0,
                    referenceType: 'DUES_SETTLEMENT',
                    referenceId: dueIdStr
                }
            });
            yield tx.ledgerEntry.create({
                data: {
                    organizationId: user.storeId,
                    accountId: 'ACCOUNTS_RECEIVABLE',
                    debit: 0,
                    credit: settledAmount,
                    referenceType: 'DUES_SETTLEMENT',
                    referenceId: dueIdStr
                }
            });
        }));
        res.json({
            message: isPartial ? `Partially settled ₹${settledAmount}` : 'Due fully settled',
            settledAmount,
            remaining: isPartial ? dueAmount - settledAmount : 0
        });
    }
    catch (err) {
        console.error('Settle Specific Due Error:', err);
        res.status(500).json({ error: 'Internal server error while settling due' });
    }
});
exports.settleSpecificDue = settleSpecificDue;
