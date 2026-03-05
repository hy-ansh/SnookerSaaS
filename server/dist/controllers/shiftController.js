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
exports.getShifts = exports.closeShift = exports.openShift = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ========== SHIFT RECONCILIATION (GALLA) ==========
const openShift = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { branchId, openingCash, notes } = req.body;
        const staffId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!branchId || !staffId) {
            res.status(400).json({ error: 'Branch ID and Staff identity required' });
            return;
        }
        // Check if a shift is already open for this staff/branch
        const openShift = yield prisma.shiftReconciliation.findFirst({
            where: { branchId, closedAt: null }
        });
        if (openShift) {
            res.status(400).json({ error: 'A shift is already open at this branch.' });
            return;
        }
        const shift = yield prisma.shiftReconciliation.create({
            data: {
                branchId,
                staffId,
                openingCash: Number(openingCash) || 0,
                notes
            }
        });
        res.status(201).json(shift);
    }
    catch (error) {
        console.error('Error opening shift:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.openShift = openShift;
const closeShift = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { actualCash, notes } = req.body;
        const shift = yield prisma.shiftReconciliation.findUnique({
            where: { id }
        });
        if (!shift) {
            res.status(404).json({ error: 'Shift not found' });
            return;
        }
        if (shift.closedAt) {
            res.status(400).json({ error: 'Shift is already closed.' });
            return;
        }
        // Calculate Expected Cash:
        // Opening Cash + Cash from Sessions + Cash from Canteen POS - Expenses Paid By Cash
        // This query requires aggregating LedgerEntries for the duration of the shift.
        const branch = yield prisma.branch.findUnique({ where: { id: shift.branchId } });
        const cashLedgerAggr = yield prisma.ledgerEntry.aggregate({
            where: {
                organizationId: branch.organizationId,
                accountId: 'CashInHand',
                createdAt: {
                    gte: shift.openedAt,
                    lte: new Date()
                }
            },
            _sum: {
                debit: true, // Cash flowing IN
                credit: true // Cash flowing OUT (Expenses)
            }
        });
        const netCashCollected = (Number(cashLedgerAggr._sum.debit) || 0) - (Number(cashLedgerAggr._sum.credit) || 0);
        const expectedCash = Number(shift.openingCash) + netCashCollected;
        const discrepancy = Number(actualCash) - expectedCash;
        const updatedShift = yield prisma.shiftReconciliation.update({
            where: { id },
            data: {
                closedAt: new Date(),
                expectedCash,
                actualCash: Number(actualCash),
                discrepancy,
                notes: notes ? `${shift.notes}\nClose Notes: ${notes}` : shift.notes
            }
        });
        res.json(updatedShift);
    }
    catch (error) {
        console.error('Error closing shift:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.closeShift = closeShift;
const getShifts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const branchId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.branchId;
        if (!branchId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }
        const shifts = yield prisma.shiftReconciliation.findMany({
            where: branchId ? { branchId } : undefined,
            include: { staff: { select: { fullName: true, email: true } } },
            orderBy: { openedAt: 'desc' }
        });
        res.json(shifts);
    }
    catch (error) {
        console.error('Error fetching shifts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getShifts = getShifts;
