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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpenses = exports.recordExpense = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ========== EXPENSE MANAGEMENT ==========
const recordExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { amount, category, description, receiptUrl } = req.body;
        const branchId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.branchId;
        const recordedById = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        if (!branchId || !recordedById) {
            res.status(400).json({ error: 'Branch ID and User context required' });
            return;
        }
        const validCategories = ['MAINTENANCE', 'UTILITIES', 'SUPPLIES', 'SALARIES', 'MISC'];
        if (!validCategories.includes(category)) {
            res.status(400).json({ error: 'Invalid expense category' });
            return;
        }
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create Expense record
            const expense = yield tx.expense.create({
                data: {
                    branchId,
                    recordedById,
                    amount: Number(amount),
                    category,
                    description,
                    receiptUrl
                }
            });
            // Write to Ledger (Credit Cash, Debit Expense)
            const branch = yield tx.branch.findUnique({ where: { id: branchId } });
            yield tx.ledgerEntry.create({
                data: {
                    organizationId: branch.organizationId,
                    accountId: `Expense_${category}`,
                    debit: Number(amount),
                    credit: 0,
                    referenceType: 'EXPENSE',
                    referenceId: expense.id
                }
            });
            yield tx.ledgerEntry.create({
                data: {
                    organizationId: branch.organizationId,
                    accountId: 'CashInHand',
                    debit: 0,
                    credit: Number(amount),
                    referenceType: 'EXPENSE',
                    referenceId: expense.id
                }
            });
            return expense;
        }));
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error recording expense:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.recordExpense = recordExpense;
const getExpenses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const branchId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.branchId;
        if (!branchId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }
        const expenses = yield prisma.expense.findMany({
            where: branchId ? { branchId } : undefined,
            include: { recordedBy: { select: { fullName: true } } },
            orderBy: { incurredAt: 'desc' }
        });
        res.json(expenses);
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getExpenses = getExpenses;
