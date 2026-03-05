import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getStoreLedger = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const orgId = user.storeId;

        const entries = await prisma.ledgerEntry.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const expenses = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: {
                branch: { organizationId: orgId },
                incurredAt: { gte: startOfMonth }
            }
        });
        const mtdExpenses = Number(expenses._sum.amount || 0);

        // Session revenue (snooker table time)
        const sessionRevenue = await prisma.session.aggregate({
            _sum: { totalAmount: true },
            where: {
                branch: { organizationId: orgId },
                startedAt: { gte: startOfMonth },
                status: 'COMPLETED'
            }
        });

        // POS inventory revenue — CASH/UPI/CARD orders (exclude DUES — those are receivables, not revenue yet)
        const posRevenue = await prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: {
                branch: { organizationId: orgId },
                createdAt: { gte: startOfMonth },
                status: 'COMPLETED',
                paymentMethod: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] }
            }
        });

        // Settled dues collected this month (now actual cash revenue)
        const settledDuesRevenue = await prisma.ledgerEntry.aggregate({
            _sum: { debit: true },
            where: {
                organizationId: orgId,
                referenceType: 'DUES_SETTLEMENT',
                createdAt: { gte: startOfMonth },
                accountId: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] }
            }
        });

        const mtdRevenue =
            Number(sessionRevenue._sum.totalAmount || 0) +
            Number(posRevenue._sum.totalAmount || 0) +
            Number(settledDuesRevenue._sum.debit || 0);

        res.json({
            summary: { mtdExpenses, mtdRevenue, netProfit: mtdRevenue - mtdExpenses },
            entries
        });
    } catch (err) {
        console.error('Get Accounting Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching ledger' });
    }
};

export const addExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const orgId = user.storeId;

        const userId = user.userId;
        const { amount, category, description, branchId, incurredAt } = req.body;

        if (!amount || !category || !branchId) {
            res.status(400).json({ error: 'amount, category and branchId are required' });
            return;
        }

        // Verify branch belongs to this org
        const branch = await prisma.branch.findFirst({
            where: { id: branchId, organizationId: orgId }
        });
        if (!branch) { res.status(403).json({ error: 'Branch not found in your organization' }); return; }

        const expense = await prisma.$transaction(async (tx) => {
            const exp = await tx.expense.create({
                data: {
                    branchId,
                    recordedById: userId,
                    amount: Number(amount),
                    category: category as any,
                    description: description || null,
                    incurredAt: incurredAt ? new Date(incurredAt) : new Date()
                }
            });

            // Double-entry: Debit Expense account, Credit Cash
            await tx.ledgerEntry.create({
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
        });

        res.status(201).json({ message: 'Expense recorded', expense });
    } catch (err) {
        console.error('Add Expense Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMonthlyTrend = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const orgId = user.storeId;

        const now = new Date();
        const months: { label: string; revenue: number; expenses: number }[] = [];

        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

            const [sessionRev, posRev, settledDues, exp] = await Promise.all([
                // Snooker session revenue
                prisma.session.aggregate({
                    _sum: { totalAmount: true },
                    where: {
                        branch: { organizationId: orgId },
                        status: 'COMPLETED',
                        startedAt: { gte: start, lte: end }
                    }
                }),
                // POS inventory revenue
                prisma.order.aggregate({
                    _sum: { totalAmount: true },
                    where: {
                        branch: { organizationId: orgId },
                        status: 'COMPLETED',
                        paymentMethod: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] },
                        createdAt: { gte: start, lte: end }
                    }
                }),
                // Settled dues collected in this month
                prisma.ledgerEntry.aggregate({
                    _sum: { debit: true },
                    where: {
                        organizationId: orgId,
                        referenceType: 'DUES_SETTLEMENT',
                        accountId: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] },
                        createdAt: { gte: start, lte: end }
                    }
                }),
                // Expenses
                prisma.expense.aggregate({
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
    } catch (err) {
        console.error('Monthly Trend Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
