import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;

        if (!organizationId && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: No organization context' });
            return;
        }

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';

        // Revenue = actual payments received, NOT session.totalAmount
        // This prevents double-counting when sessions are paid via Dues
        const payerFilter = isSuperAdmin ? {} : { payer: { organizationId } };

        const [todayPayments, weeklyPayments, monthlyPayments, activeSessionsCount, unpaidDues] = await Promise.all([
            // Today's revenue: payments received today
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: { status: 'SUCCESS', createdAt: { gte: todayStart }, ...payerFilter }
            }),
            // Weekly revenue
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: { status: 'SUCCESS', createdAt: { gte: oneWeekAgo }, ...payerFilter }
            }),
            // Monthly revenue
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: { status: 'SUCCESS', createdAt: { gte: monthStart }, ...payerFilter }
            }),
            prisma.session.count({
                where: {
                    status: { in: ['ACTIVE', 'PAUSED'] },
                    ...(isSuperAdmin ? {} : { branch: { organizationId } })
                }
            }),
            prisma.due.aggregate({
                _sum: { amount: true },
                where: {
                    status: 'PENDING',
                    player: isSuperAdmin ? undefined : { organizationId }
                }
            })
        ]);

        // Count today's completed sessions too
        const todaySessionCount = await prisma.session.count({
            where: {
                status: 'COMPLETED',
                endedAt: { gte: todayStart },
                ...(isSuperAdmin ? {} : { branch: { organizationId } })
            }
        });

        res.json({
            today_earnings: Number(todayPayments._sum.amount || 0),
            weekly_earnings: Number(weeklyPayments._sum.amount || 0),
            monthly_earnings: Number(monthlyPayments._sum.amount || 0),
            active_sessions_count: activeSessionsCount,
            today_sessions: todaySessionCount,
            unpaid_dues: Number(unpaidDues._sum.amount || 0)
        });
    } catch (err) {
        console.error('Dashboard Summary Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getRevenueData = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;

        if (!organizationId && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: No organization context' });
            return;
        }

        const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';

        // Revenue by table — aggregate payments linked to sessions, grouped by table
        const sessionsWithPayments = await prisma.session.findMany({
            where: {
                status: 'COMPLETED',
                ...(isSuperAdmin ? {} : { branch: { organizationId } })
            },
            select: {
                tableId: true,
                payments: {
                    where: { status: 'SUCCESS' },
                    select: { amount: true }
                }
            }
        });

        // Aggregate by table
        const tableRevMap = new Map<string, number>();
        for (const s of sessionsWithPayments) {
            const current = tableRevMap.get(s.tableId) || 0;
            const sessionPayments = s.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            tableRevMap.set(s.tableId, current + sessionPayments);
        }

        // Map table names
        const enrichedData = await Promise.all(
            Array.from(tableRevMap.entries()).map(async ([tableId, revenue]) => {
                const table = await prisma.table.findUnique({ where: { id: tableId } });
                return {
                    table_id: tableId,
                    table_name: table?.nameOrNumber || tableId,
                    revenue
                };
            })
        );

        res.json(enrichedData);
    } catch (err) {
        console.error('Dashboard Revenue Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
