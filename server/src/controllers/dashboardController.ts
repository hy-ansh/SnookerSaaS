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

        const sessionScopeFilter = req.user?.role === 'SUPER_ADMIN'
            ? { status: 'COMPLETED' as const }
            : { status: 'COMPLETED' as const, branch: { organizationId } };

        const [todaySessions, weeklySessions, monthlySessions, activeSessionsCount, unpaidDues] = await Promise.all([
            // Today's revenue: sum Session.totalAmount for sessions that ENDED today
            prisma.session.aggregate({
                _sum: { totalAmount: true },
                where: { ...sessionScopeFilter, endedAt: { gte: todayStart } }
            }),
            // Weekly revenue
            prisma.session.aggregate({
                _sum: { totalAmount: true },
                where: { ...sessionScopeFilter, endedAt: { gte: oneWeekAgo } }
            }),
            // Monthly revenue
            prisma.session.aggregate({
                _sum: { totalAmount: true },
                where: { ...sessionScopeFilter, endedAt: { gte: monthStart } }
            }),
            prisma.session.count({
                where: {
                    status: { in: ['ACTIVE', 'PAUSED'] },
                    ...(req.user?.role === 'SUPER_ADMIN' ? {} : { branch: { organizationId } })
                }
            }),
            prisma.due.aggregate({
                _sum: { amount: true },
                where: {
                    status: 'PENDING',
                    session: req.user?.role !== 'SUPER_ADMIN' ? { branch: { organizationId } } : undefined
                }
            })
        ]);

        // Count today's completed sessions too
        const todaySessionCount = await prisma.session.count({
            where: { ...sessionScopeFilter, endedAt: { gte: todayStart } }
        });

        res.json({
            today_earnings: Number(todaySessions._sum.totalAmount || 0),
            weekly_earnings: Number(weeklySessions._sum.totalAmount || 0),
            monthly_earnings: Number(monthlySessions._sum.totalAmount || 0),
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

        // Prisma groupBy (aggregating revenue by table)
        const revenueAggregation = await prisma.session.groupBy({
            by: ['tableId'],
            _sum: { totalAmount: true },
            where: {
                status: 'COMPLETED',
                branch: req.user?.role === 'SUPER_ADMIN' ? undefined : { organizationId }
            }
        });

        // Map table names
        const enrichedData = await Promise.all(revenueAggregation.map(async (agg) => {
            const table = await prisma.table.findUnique({ where: { id: agg.tableId } });
            return {
                table_id: agg.tableId,
                table_name: table?.nameOrNumber || agg.tableId,
                revenue: Number(agg._sum.totalAmount || 0)
            };
        }));

        res.json(enrichedData);
    } catch (err) {
        console.error('Dashboard Revenue Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
