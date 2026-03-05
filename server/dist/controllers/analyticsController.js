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
exports.getAnalyticsSummary = exports.getHeatmapAnalytics = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getHeatmapAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        const branchId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.branchId;
        // Let's get sessions from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Build scope: STAFF scopes to branch, STORE_OWNER or above scopes to org
        const whereClause = {
            startedAt: { gte: thirtyDaysAgo }
        };
        if (organizationId && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'SUPER_ADMIN') {
            whereClause.branch = { organizationId };
        }
        else if (branchId && ((_d = req.user) === null || _d === void 0 ? void 0 : _d.role) === 'STAFF') {
            whereClause.branchId = branchId;
        }
        const sessions = yield prisma_1.default.session.findMany({
            where: whereClause,
            select: {
                startedAt: true,
                durationMinutes: true,
                endedAt: true
            }
        });
        // Initialize a 7 (days) x 24 (hours) matrix for tracking busy hours
        const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));
        sessions.forEach(session => {
            const startStr = session.startedAt instanceof Date ? session.startedAt : new Date(session.startedAt);
            const dayOfWeek = startStr.getDay();
            const hourOfDay = startStr.getHours();
            heatmap[dayOfWeek][hourOfDay] += 1;
        });
        res.json({ heatmap });
    }
    catch (error) {
        console.error('Error generating heatmap:', error);
        res.status(500).json({ error: 'Internal server error processing analytics' });
    }
});
exports.getHeatmapAnalytics = getHeatmapAnalytics;
const getAnalyticsSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: No organization context' });
            return;
        }
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sessionFilter = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'SUPER_ADMIN'
            ? { status: 'COMPLETED' }
            : { status: 'COMPLETED', branch: { organizationId } };
        const monthlySessionFilter = ((_d = req.user) === null || _d === void 0 ? void 0 : _d.role) === 'SUPER_ADMIN'
            ? { status: 'COMPLETED', endedAt: { gte: firstOfMonth } }
            : { status: 'COMPLETED', endedAt: { gte: firstOfMonth }, branch: { organizationId } };
        const [monthlyRevAgg, completedSessions, activePlayers] = yield Promise.all([
            // Sum Session.totalAmount for sessions that ENDED this month (reliable vs Payment rows)
            prisma_1.default.session.aggregate({
                _sum: { totalAmount: true },
                where: monthlySessionFilter
            }),
            prisma_1.default.session.findMany({
                where: sessionFilter,
                select: { durationMinutes: true, tableId: true, startedAt: true, endedAt: true }
            }),
            prisma_1.default.sessionPlayer.groupBy({
                by: ['playerId'],
                where: {
                    session: ((_e = req.user) === null || _e === void 0 ? void 0 : _e.role) === 'SUPER_ADMIN'
                        ? { status: 'COMPLETED' }
                        : { status: 'COMPLETED', branch: { organizationId } }
                },
                _count: { playerId: true }
            })
        ]);
        const monthlyRevenue = Number(monthlyRevAgg._sum.totalAmount || 0);
        const totalSessions = completedSessions.length;
        const avgSessionMinutes = totalSessions > 0
            ? Math.round(completedSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / totalSessions)
            : 0;
        const tableIds = [...new Set(completedSessions.map(s => s.tableId))];
        const tableTurnoverRate = tableIds.length > 0
            ? Math.round((totalSessions / Math.max(tableIds.length, 1) / 30) * 10) / 10
            : 0;
        res.json({
            monthlyRevenue,
            activePlayers: activePlayers.length,
            avgSessionMinutes,
            tableTurnoverRate
        });
    }
    catch (error) {
        console.error('Error generating analytics summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAnalyticsSummary = getAnalyticsSummary;
