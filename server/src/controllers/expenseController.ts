import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ========== EXPENSE MANAGEMENT ==========

export const recordExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const { amount, category, description, receiptUrl } = req.body;
        const branchId = req.user?.branchId;
        const recordedById = req.user?.id;

        if (!branchId || !recordedById) {
            res.status(400).json({ error: 'Branch ID and User context required' });
            return;
        }

        const validCategories = ['MAINTENANCE', 'UTILITIES', 'SUPPLIES', 'SALARIES', 'MISC'];
        if (!validCategories.includes(category)) {
            res.status(400).json({ error: 'Invalid expense category' });
            return;
        }

        const result = await prisma.$transaction(async (tx) => {
            // Create Expense record
            const expense = await tx.expense.create({
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
            const branch = await tx.branch.findUnique({ where: { id: branchId } });

            await tx.ledgerEntry.create({
                data: {
                    organizationId: branch!.organizationId,
                    accountId: `Expense_${category}`,
                    debit: Number(amount),
                    credit: 0,
                    referenceType: 'EXPENSE',
                    referenceId: expense.id
                }
            });

            await tx.ledgerEntry.create({
                data: {
                    organizationId: branch!.organizationId,
                    accountId: 'CashInHand',
                    debit: 0,
                    credit: Number(amount),
                    referenceType: 'EXPENSE',
                    referenceId: expense.id
                }
            });

            return expense;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error recording expense:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
    try {
        const branchId = req.user?.branchId;
        if (!branchId && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        const expenses = await prisma.expense.findMany({
            where: branchId ? { branchId } : undefined,
            include: { recordedBy: { select: { fullName: true } } },
            orderBy: { incurredAt: 'desc' }
        });

        res.json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
