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
exports.getRevenueData = exports.getDashboardSummary = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getDashboardSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: No organization context' });
            return;
        }
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const sessionScopeFilter = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'SUPER_ADMIN'
            ? { status: 'COMPLETED' }
            : { status: 'COMPLETED', branch: { organizationId } };
        const [todaySessions, weeklySessions, monthlySessions, activeSessionsCount, unpaidDues] = yield Promise.all([
            // Today's revenue: sum Session.totalAmount for sessions that ENDED today
            prisma_1.default.session.aggregate({
                _sum: { totalAmount: true },
                where: Object.assign(Object.assign({}, sessionScopeFilter), { endedAt: { gte: todayStart } })
            }),
            // Weekly revenue
            prisma_1.default.session.aggregate({
                _sum: { totalAmount: true },
                where: Object.assign(Object.assign({}, sessionScopeFilter), { endedAt: { gte: oneWeekAgo } })
            }),
            // Monthly revenue
            prisma_1.default.session.aggregate({
                _sum: { totalAmount: true },
                where: Object.assign(Object.assign({}, sessionScopeFilter), { endedAt: { gte: monthStart } })
            }),
            prisma_1.default.session.count({
                where: Object.assign({ status: { in: ['ACTIVE', 'PAUSED'] } }, (((_d = req.user) === null || _d === void 0 ? void 0 : _d.role) === 'SUPER_ADMIN' ? {} : { branch: { organizationId } }))
            }),
            prisma_1.default.due.aggregate({
                _sum: { amount: true },
                where: {
                    status: 'PENDING',
                    session: ((_e = req.user) === null || _e === void 0 ? void 0 : _e.role) !== 'SUPER_ADMIN' ? { branch: { organizationId } } : undefined
                }
            })
        ]);
        // Count today's completed sessions too
        const todaySessionCount = yield prisma_1.default.session.count({
            where: Object.assign(Object.assign({}, sessionScopeFilter), { endedAt: { gte: todayStart } })
        });
        res.json({
            today_earnings: Number(todaySessions._sum.totalAmount || 0),
            weekly_earnings: Number(weeklySessions._sum.totalAmount || 0),
            monthly_earnings: Number(monthlySessions._sum.totalAmount || 0),
            active_sessions_count: activeSessionsCount,
            today_sessions: todaySessionCount,
            unpaid_dues: Number(unpaidDues._sum.amount || 0)
        });
    }
    catch (err) {
        console.error('Dashboard Summary Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getDashboardSummary = getDashboardSummary;
const getRevenueData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: No organization context' });
            return;
        }
        // Prisma groupBy (aggregating revenue by table)
        const revenueAggregation = yield prisma_1.default.session.groupBy({
            by: ['tableId'],
            _sum: { totalAmount: true },
            where: {
                status: 'COMPLETED',
                branch: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'SUPER_ADMIN' ? undefined : { organizationId }
            }
        });
        // Map table names
        const enrichedData = yield Promise.all(revenueAggregation.map((agg) => __awaiter(void 0, void 0, void 0, function* () {
            const table = yield prisma_1.default.table.findUnique({ where: { id: agg.tableId } });
            return {
                table_id: agg.tableId,
                table_name: (table === null || table === void 0 ? void 0 : table.nameOrNumber) || agg.tableId,
                revenue: Number(agg._sum.totalAmount || 0)
            };
        })));
        res.json(enrichedData);
    }
    catch (err) {
        console.error('Dashboard Revenue Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getRevenueData = getRevenueData;
