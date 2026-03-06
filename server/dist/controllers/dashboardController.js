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
    var _a, _b, _c;
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
        const isSuperAdmin = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'SUPER_ADMIN';
        // Revenue = actual payments received, NOT session.totalAmount
        // This prevents double-counting when sessions are paid via Dues
        const payerFilter = isSuperAdmin ? {} : { payer: { organizationId } };
        const [todayPayments, weeklyPayments, monthlyPayments, activeSessionsCount, unpaidDues] = yield Promise.all([
            // Today's revenue: payments received today
            prisma_1.default.payment.aggregate({
                _sum: { amount: true },
                where: Object.assign({ status: 'SUCCESS', createdAt: { gte: todayStart } }, payerFilter)
            }),
            // Weekly revenue
            prisma_1.default.payment.aggregate({
                _sum: { amount: true },
                where: Object.assign({ status: 'SUCCESS', createdAt: { gte: oneWeekAgo } }, payerFilter)
            }),
            // Monthly revenue
            prisma_1.default.payment.aggregate({
                _sum: { amount: true },
                where: Object.assign({ status: 'SUCCESS', createdAt: { gte: monthStart } }, payerFilter)
            }),
            prisma_1.default.session.count({
                where: Object.assign({ status: { in: ['ACTIVE', 'PAUSED'] } }, (isSuperAdmin ? {} : { branch: { organizationId } }))
            }),
            prisma_1.default.due.aggregate({
                _sum: { amount: true },
                where: {
                    status: 'PENDING',
                    player: isSuperAdmin ? undefined : { organizationId }
                }
            })
        ]);
        // Count today's completed sessions too
        const todaySessionCount = yield prisma_1.default.session.count({
            where: Object.assign({ status: 'COMPLETED', endedAt: { gte: todayStart } }, (isSuperAdmin ? {} : { branch: { organizationId } }))
        });
        res.json({
            today_earnings: Number(todayPayments._sum.amount || 0),
            weekly_earnings: Number(weeklyPayments._sum.amount || 0),
            monthly_earnings: Number(monthlyPayments._sum.amount || 0),
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
        const isSuperAdmin = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'SUPER_ADMIN';
        // Revenue by table — aggregate payments linked to sessions, grouped by table
        const sessionsWithPayments = yield prisma_1.default.session.findMany({
            where: Object.assign({ status: 'COMPLETED' }, (isSuperAdmin ? {} : { branch: { organizationId } })),
            select: {
                tableId: true,
                payments: {
                    where: { status: 'SUCCESS' },
                    select: { amount: true }
                }
            }
        });
        // Aggregate by table
        const tableRevMap = new Map();
        for (const s of sessionsWithPayments) {
            const current = tableRevMap.get(s.tableId) || 0;
            const sessionPayments = s.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            tableRevMap.set(s.tableId, current + sessionPayments);
        }
        // Map table names
        const enrichedData = yield Promise.all(Array.from(tableRevMap.entries()).map((_a) => __awaiter(void 0, [_a], void 0, function* ([tableId, revenue]) {
            const table = yield prisma_1.default.table.findUnique({ where: { id: tableId } });
            return {
                table_id: tableId,
                table_name: (table === null || table === void 0 ? void 0 : table.nameOrNumber) || tableId,
                revenue
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
