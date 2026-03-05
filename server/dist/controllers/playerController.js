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
exports.getPlayerAnalytics = exports.getLeaderboard = exports.getPlayerStats = exports.getPlayerHistory = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getPlayerHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const playerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const history = yield prisma_1.default.sessionPlayer.findMany({
            where: { playerId },
            include: {
                session: {
                    include: {
                        table: true,
                        branch: true,
                        players: { include: { player: { select: { id: true, fullName: true, email: true } } } },
                        payments: { select: { payerId: true, method: true, status: true, amount: true } },
                        dues: { select: { playerId: true, amount: true, status: true } },
                    }
                }
            },
            orderBy: {
                session: { startedAt: 'desc' }
            },
            take: 50
        });
        res.json({ history });
    }
    catch (err) {
        console.error('Get Player History Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching history' });
    }
});
exports.getPlayerHistory = getPlayerHistory;
const getPlayerStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const rawPlayerId = req.params.playerId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const playerId = Array.isArray(rawPlayerId) ? rawPlayerId[0] : rawPlayerId;
        if (!playerId) {
            res.status(400).json({ error: 'Player ID required' });
            return;
        }
        const user = yield prisma_1.default.user.findUnique({
            where: { id: playerId },
            include: { profile: true, dues: { where: { status: 'PENDING' } } }
        });
        if (!user) {
            res.status(404).json({ error: 'Player not found' });
            return;
        }
        const userProfile = user.profile;
        const pendingDues = (user.dues || []).reduce((sum, d) => sum + Number(d.amount), 0);
        // Count sessions this player was part of
        const sessionCount = yield prisma_1.default.sessionPlayer.count({ where: { playerId } });
        const wonSessions = yield prisma_1.default.sessionPlayer.count({
            where: {
                playerId,
                session: {
                    winnerIds: { has: playerId },
                    status: 'COMPLETED'
                }
            }
        });
        const stats = {
            user: { fullName: user.fullName, email: user.email },
            matchesPlayed: (userProfile === null || userProfile === void 0 ? void 0 : userProfile.matchesPlayed) || sessionCount,
            matchesWon: (userProfile === null || userProfile === void 0 ? void 0 : userProfile.matchesWon) || wonSessions,
            eloRating: (userProfile === null || userProfile === void 0 ? void 0 : userProfile.eloRating) || 1200,
            walletBalance: (userProfile === null || userProfile === void 0 ? void 0 : userProfile.walletBalance) || 0,
            pendingDues,
        };
        res.json(stats);
    }
    catch (err) {
        console.error('Get Player Stats Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching stats' });
    }
});
exports.getPlayerStats = getPlayerStats;
const getLeaderboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        const profiles = yield prisma_1.default.playerProfile.findMany({
            where: organizationId ? { user: { organizationId } } : undefined,
            orderBy: { eloRating: 'desc' },
            take: 50,
            include: {
                user: { select: { id: true, fullName: true, email: true } }
            }
        });
        const ranked = profiles.map((p, idx) => {
            var _a, _b;
            const winRate = p.matchesPlayed > 0
                ? Math.round((p.matchesWon / p.matchesPlayed) * 100)
                : 0;
            return {
                rank: idx + 1,
                id: p.userId,
                name: ((_a = p.user) === null || _a === void 0 ? void 0 : _a.fullName) || ((_b = p.user) === null || _b === void 0 ? void 0 : _b.email) || 'Unknown',
                elo: p.eloRating,
                winRate,
                matchesPlayed: p.matchesPlayed,
                matchesWon: p.matchesWon,
                walletBalance: Number(p.walletBalance),
                trend: 'same'
            };
        });
        res.json(ranked);
    }
    catch (err) {
        console.error('Get Leaderboard Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching leaderboard' });
    }
});
exports.getLeaderboard = getLeaderboard;
const getPlayerAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        // Sessions in scope
        const baseScopeFilter = {
            status: 'COMPLETED',
            branch: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'SUPER_ADMIN' ? undefined : { organizationId }
        };
        const [todaySessions, monthSessions, topPlayers] = yield Promise.all([
            prisma_1.default.session.findMany({
                where: Object.assign(Object.assign({}, baseScopeFilter), { endedAt: { gte: todayStart } }),
                include: { players: { include: { player: { select: { id: true, fullName: true, email: true } } } } }
            }),
            prisma_1.default.session.findMany({
                where: Object.assign(Object.assign({}, baseScopeFilter), { endedAt: { gte: monthStart } }),
                include: { players: { include: { player: { select: { id: true, fullName: true, email: true } } } } }
            }),
            // Top players by session wins
            prisma_1.default.playerProfile.findMany({
                where: organizationId ? { user: { organizationId } } : undefined,
                orderBy: { matchesWon: 'desc' },
                take: 10,
                include: { user: { select: { id: true, fullName: true, email: true } } }
            })
        ]);
        // Compute winner stats from today and monthly sessions
        const computeWinMap = (sessions) => {
            var _a;
            const wins = {};
            for (const s of sessions) {
                const winnerIds = s.winnerIds || [];
                for (const sp of s.players || []) {
                    const pid = sp.playerId;
                    const name = ((_a = sp.player) === null || _a === void 0 ? void 0 : _a.fullName) || 'Unknown';
                    if (!wins[pid])
                        wins[pid] = { name, wins: 0, sessions: 0 };
                    wins[pid].sessions += 1;
                    if (winnerIds.includes(pid))
                        wins[pid].wins += 1;
                }
            }
            return Object.entries(wins)
                .map(([id, v]) => (Object.assign({ id }, v)))
                .sort((a, b) => b.wins - a.wins);
        };
        const todayRevenue = todaySessions.reduce((s, sess) => s + Number(sess.totalAmount || 0), 0);
        const monthRevenue = monthSessions.reduce((s, sess) => s + Number(sess.totalAmount || 0), 0);
        res.json({
            today: {
                sessions: todaySessions.length,
                revenue: todayRevenue,
                winners: computeWinMap(todaySessions).slice(0, 5),
                uniquePlayers: new Set(todaySessions.flatMap(s => (s.players || []).map((p) => p.playerId))).size,
            },
            monthly: {
                sessions: monthSessions.length,
                revenue: monthRevenue,
                winners: computeWinMap(monthSessions).slice(0, 10),
                uniquePlayers: new Set(monthSessions.flatMap(s => (s.players || []).map((p) => p.playerId))).size,
            },
            leaderboard: topPlayers.map((p, i) => {
                var _a, _b;
                return ({
                    rank: i + 1,
                    id: p.userId,
                    name: ((_a = p.user) === null || _a === void 0 ? void 0 : _a.fullName) || ((_b = p.user) === null || _b === void 0 ? void 0 : _b.email) || 'Unknown',
                    wins: p.matchesWon,
                    played: p.matchesPlayed,
                    winRate: p.matchesPlayed > 0 ? Math.round((p.matchesWon / p.matchesPlayed) * 100) : 0,
                    elo: p.eloRating,
                });
            })
        });
    }
    catch (err) {
        console.error('Get Player Analytics Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getPlayerAnalytics = getPlayerAnalytics;
