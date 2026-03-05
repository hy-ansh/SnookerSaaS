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
exports.getMonthlyTrend = exports.addExpense = exports.getStoreLedger = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getStoreLedger = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const orgId = user.storeId;
        const entries = yield prisma_1.default.ledgerEntry.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const expenses = yield prisma_1.default.expense.aggregate({
            _sum: { amount: true },
            where: {
                branch: { organizationId: orgId },
                incurredAt: { gte: startOfMonth }
            }
        });
        const mtdExpenses = Number(expenses._sum.amount || 0);
        // Session revenue (snooker table time)
        const sessionRevenue = yield prisma_1.default.session.aggregate({
            _sum: { totalAmount: true },
            where: {
                branch: { organizationId: orgId },
                startedAt: { gte: startOfMonth },
                status: 'COMPLETED'
            }
        });
        // POS inventory revenue — CASH/UPI/CARD orders (exclude DUES — those are receivables, not revenue yet)
        const posRevenue = yield prisma_1.default.order.aggregate({
            _sum: { totalAmount: true },
            where: {
                branch: { organizationId: orgId },
                createdAt: { gte: startOfMonth },
                status: 'COMPLETED',
                paymentMethod: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] }
            }
        });
        // Settled dues collected this month (now actual cash revenue)
        const settledDuesRevenue = yield prisma_1.default.ledgerEntry.aggregate({
            _sum: { debit: true },
            where: {
                organizationId: orgId,
                referenceType: 'DUES_SETTLEMENT',
                createdAt: { gte: startOfMonth },
                accountId: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] }
            }
        });
        const mtdRevenue = Number(sessionRevenue._sum.totalAmount || 0) +
            Number(posRevenue._sum.totalAmount || 0) +
            Number(settledDuesRevenue._sum.debit || 0);
        res.json({
            summary: { mtdExpenses, mtdRevenue, netProfit: mtdRevenue - mtdExpenses },
            entries
        });
    }
    catch (err) {
        console.error('Get Accounting Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching ledger' });
    }
});
exports.getStoreLedger = getStoreLedger;
const addExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const orgId = user.storeId;
        const userId = user.userId;
        const { amount, category, description, branchId, incurredAt } = req.body;
        if (!amount || !category || !branchId) {
            res.status(400).json({ error: 'amount, category and branchId are required' });
            return;
        }
        // Verify branch belongs to this org
        const branch = yield prisma_1.default.branch.findFirst({
            where: { id: branchId, organizationId: orgId }
        });
        if (!branch) {
            res.status(403).json({ error: 'Branch not found in your organization' });
            return;
        }
        const expense = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const exp = yield tx.expense.create({
                data: {
                    branchId,
                    recordedById: userId,
                    amount: Number(amount),
                    category: category,
                    description: description || null,
                    incurredAt: incurredAt ? new Date(incurredAt) : new Date()
                }
            });
            // Double-entry: Debit Expense account, Credit Cash
            yield tx.ledgerEntry.create({
                data: {
                    organizationId: orgId,
                    accountId: `EXPENSE_${category}`,
                    debit: Number(amount),
                    credit: 0,
                    referenceType: 'EXPENSE',
                    referenceId: exp.id
                }
            });
            return exp;
        }));
        res.status(201).json({ message: 'Expense recorded', expense });
    }
    catch (err) {
        console.error('Add Expense Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.addExpense = addExpense;
const getMonthlyTrend = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const orgId = user.storeId;
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const [sessionRev, posRev, settledDues, exp] = yield Promise.all([
                // Snooker session revenue
                prisma_1.default.session.aggregate({
                    _sum: { totalAmount: true },
                    where: {
                        branch: { organizationId: orgId },
                        status: 'COMPLETED',
                        startedAt: { gte: start, lte: end }
                    }
                }),
                // POS inventory revenue
                prisma_1.default.order.aggregate({
                    _sum: { totalAmount: true },
                    where: {
                        branch: { organizationId: orgId },
                        status: 'COMPLETED',
                        paymentMethod: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] },
                        createdAt: { gte: start, lte: end }
                    }
                }),
                // Settled dues collected in this month
                prisma_1.default.ledgerEntry.aggregate({
                    _sum: { debit: true },
                    where: {
                        organizationId: orgId,
                        referenceType: 'DUES_SETTLEMENT',
                        accountId: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] },
                        createdAt: { gte: start, lte: end }
                    }
                }),
                // Expenses
                prisma_1.default.expense.aggregate({
                    _sum: { amount: true },
                    where: {
                        branch: { organizationId: orgId },
                        incurredAt: { gte: start, lte: end }
                    }
                })
            ]);
            months.push({
                label: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
                revenue: Number(sessionRev._sum.totalAmount || 0)
                    + Number(posRev._sum.totalAmount || 0)
                    + Number(settledDues._sum.debit || 0),
                expenses: Number(exp._sum.amount || 0)
            });
        }
        res.json({ trend: months });
    }
    catch (err) {
        console.error('Monthly Trend Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getMonthlyTrend = getMonthlyTrend;
