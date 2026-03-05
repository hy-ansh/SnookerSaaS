import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ========== SHIFT RECONCILIATION (GALLA) ==========

export const openShift = async (req: Request, res: Response): Promise<void> => {
    try {
        const { branchId, openingCash, notes } = req.body;
        const staffId = req.user?.id;

        if (!branchId || !staffId) {
            res.status(400).json({ error: 'Branch ID and Staff identity required' });
            return;
        }

        // Check if a shift is already open for this staff/branch
        const openShift = await prisma.shiftReconciliation.findFirst({
            where: { branchId, closedAt: null }
        });

        if (openShift) {
            res.status(400).json({ error: 'A shift is already open at this branch.' });
            return;
        }

        const shift = await prisma.shiftReconciliation.create({
            data: {
                branchId,
                staffId,
                openingCash: Number(openingCash) || 0,
                notes
            }
        });

        res.status(201).json(shift);
    } catch (error) {
        console.error('Error opening shift:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const closeShift = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const { actualCash, notes } = req.body;

        const shift = await prisma.shiftReconciliation.findUnique({
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
        const branch = await prisma.branch.findUnique({ where: { id: shift.branchId } });

        const cashLedgerAggr = await prisma.ledgerEntry.aggregate({
            where: {
                organizationId: branch!.organizationId,
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

        const updatedShift = await prisma.shiftReconciliation.update({
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
    } catch (error) {
        console.error('Error closing shift:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getShifts = async (req: Request, res: Response): Promise<void> => {
    try {
        const branchId = req.user?.branchId;
        if (!branchId && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        const shifts = await prisma.shiftReconciliation.findMany({
            where: branchId ? { branchId } : undefined,
            include: { staff: { select: { fullName: true, email: true } } },
            orderBy: { openedAt: 'desc' }
        });

        res.json(shifts);
    } catch (error) {
        console.error('Error fetching shifts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
