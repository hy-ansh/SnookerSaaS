import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getHeatmapAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;
        const branchId = req.user?.branchId;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const whereClause: any = { startedAt: { gte: thirtyDaysAgo } };
        if (organizationId && req.user?.role !== 'SUPER_ADMIN') {
            whereClause.branch = { organizationId };
        } else if (branchId && req.user?.role === 'STAFF') {
            whereClause.branchId = branchId;
        }

        const sessions = await prisma.session.findMany({
            where: whereClause,
            select: { startedAt: true, durationMinutes: true, endedAt: true }
        });

        // 7x24 matrix
        const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));
        sessions.forEach(session => {
            const d = session.startedAt instanceof Date ? session.startedAt : new Date(session.startedAt);
            heatmap[d.getDay()][d.getHours()] += 1;
        });

        res.json({ heatmap });
    } catch (error) {
        console.error('Error generating heatmap:', error);
        res.status(500).json({ error: 'Internal server error processing analytics' });
    }
};

export const getAnalyticsSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;

        if (!organizationId && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: No organization context' });
            return;
        }

        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';

        const period = req.query.period as string;
        let dateFilterQuery: any = {};
        if (period === '30d') {
            dateFilterQuery = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30) };
        } else if (period === '7d') {
            dateFilterQuery = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7) };
        } else {
            // "all" or default can just not have the gte if it's all time, actually the issue asks for "all time".
            // If it's all time, no gte. If nothing is specified, let's keep it 'all time' or whatever is asked.
            if (period === 'all') {
                dateFilterQuery = undefined;
            } else {
                dateFilterQuery = { gte: firstOfMonth };
            }
        }

        const dateFilter = dateFilterQuery ? { createdAt: dateFilterQuery } : {};
        const sessionDateFilter = dateFilterQuery ? { startedAt: dateFilterQuery } : {};

        const sessionFilter: any = isSuperAdmin
            ? { status: 'COMPLETED', ...sessionDateFilter }
            : { status: 'COMPLETED', branch: { organizationId }, ...sessionDateFilter };

        // ── Monthly revenue: actual payments received + POS orders ──
        // NO session.totalAmount — that causes double-counting when dues exist
        const [paymentRevAgg, posRevAgg] = await Promise.all([
            // All successful payments (includes session immediate + dues settlements + pos orders with players)
            // Include open-table payments (payerId null) scoped via session → branch → org
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: isSuperAdmin
                    ? { status: 'SUCCESS', ...dateFilter }
                    : { status: 'SUCCESS', ...dateFilter, OR: [{ payer: { organizationId } }, { payerId: null, session: { branch: { organizationId } } }] }
            }),
            prisma.order.aggregate({
                _sum: { totalAmount: true },
                where: isSuperAdmin
                    ? { playerId: null, status: 'COMPLETED', paymentMethod: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] }, ...dateFilter }
                    : { playerId: null, status: 'COMPLETED', paymentMethod: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] }, ...dateFilter, branch: { organizationId } }
            })
        ]);

        const monthlyRevenue =
            Number(paymentRevAgg._sum.amount || 0) +
            Number(posRevAgg._sum.totalAmount || 0);

        // ── Session stats ──
        const [completedSessions, activePlayers] = await Promise.all([
            prisma.session.findMany({
                where: sessionFilter,
                select: { durationMinutes: true, tableId: true, startedAt: true, endedAt: true }
            }),
            prisma.sessionPlayer.groupBy({
                by: ['playerId'],
                where: { session: sessionFilter },
                _count: { playerId: true }
            })
        ]);

        const totalSessions = completedSessions.length;
        const avgSessionMinutes = totalSessions > 0
            ? Math.round(completedSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / totalSessions)
            : 0;

        const tableIds = [...new Set(completedSessions.map(s => s.tableId))];
        const tableTurnoverRate = tableIds.length > 0
            ? Math.round((totalSessions / Math.max(tableIds.length, 1) / 30) * 10) / 10
            : 0;

        // ── Revenue trend: last 6 months (payments-based) ──
        const revenueTrend: { label: string; revenue: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
            const label = start.toLocaleString('default', { month: 'short', year: '2-digit' });

            const [pRev, oRev] = await Promise.all([
                prisma.payment.aggregate({
                    _sum: { amount: true },
                    where: isSuperAdmin
                        ? { status: 'SUCCESS', createdAt: { gte: start, lte: end } }
                        : { status: 'SUCCESS', createdAt: { gte: start, lte: end }, OR: [{ payer: { organizationId } }, { payerId: null, session: { branch: { organizationId } } }] }
                }),
                prisma.order.aggregate({
                    _sum: { totalAmount: true },
                    where: isSuperAdmin
                        ? { playerId: null, status: 'COMPLETED', paymentMethod: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] }, createdAt: { gte: start, lte: end } }
                        : { playerId: null, status: 'COMPLETED', paymentMethod: { in: ['CASH', 'UPI', 'CARD', 'WALLET'] }, createdAt: { gte: start, lte: end }, branch: { organizationId } }
                })
            ]);

            revenueTrend.push({
                label,
                revenue: Number(pRev._sum.amount || 0) + Number(oRev._sum.totalAmount || 0)
            });
        }

        res.json({
            monthlyRevenue,
            activePlayers: activePlayers.length,
            avgSessionMinutes,
            tableTurnoverRate,
            revenueTrend
        });
    } catch (error) {
        console.error('Error generating analytics summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getOperationalStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;
        const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';

        if (!organizationId && !isSuperAdmin) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const branchFilter = isSuperAdmin ? {} : { branch: { organizationId } };

        const [totalTables, occupiedSessions, todayPayments, recentSessions] = await Promise.all([
            // Total tables in this org
            prisma.table.count({
                where: isSuperAdmin ? {} : { branch: { organizationId } }
            }),
            // Currently active/paused sessions = occupied tables
            prisma.session.findMany({
                where: { status: { in: ['ACTIVE', 'PAUSED'] }, ...branchFilter },
                select: { tableId: true }
            }),
            // Today's revenue: actual payments received today (includes open-table payments)
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: isSuperAdmin
                    ? { status: 'SUCCESS', createdAt: { gte: todayStart } }
                    : { status: 'SUCCESS', createdAt: { gte: todayStart }, OR: [{ payer: { organizationId } }, { payerId: null, session: { branch: { organizationId } } }] }
            }),
            // Recent 8 sessions (any status) for the activity feed
            prisma.session.findMany({
                where: branchFilter,
                orderBy: { startedAt: 'desc' },
                take: 8,
                select: {
                    id: true,
                    status: true,
                    startedAt: true,
                    endedAt: true,
                    totalAmount: true,
                    table: { select: { nameOrNumber: true } },
                    players: { select: { playerId: true } }
                }
            })
        ]);

        const occupiedCount = new Set(occupiedSessions.map(s => s.tableId)).size;
        const occupancyPct = totalTables > 0
            ? Math.round((occupiedCount / totalTables) * 100)
            : 0;

        const todayRevenue = Number(todayPayments._sum.amount || 0);

        // Calculate revenue per hour for today (hours elapsed since midnight)
        const hoursElapsed = Math.max((now.getTime() - todayStart.getTime()) / (1000 * 60 * 60), 1);
        const revenuePerHour = Math.round(todayRevenue / hoursElapsed);

        // Map recent sessions to feed items
        const activityFeed = recentSessions.map(s => {
            const tableName = s.table?.nameOrNumber || 'Unknown Table';
            const playerCount = s.players.length;
            const amount = Number(s.totalAmount || 0);
            const minutesAgo = Math.round((now.getTime() - new Date(s.startedAt).getTime()) / 60000);

            let event = 'Session Started';
            let type: 'start' | 'end' | 'active' | 'paused' = 'start';
            if (s.status === 'COMPLETED') { event = 'Session Ended'; type = 'end'; }
            else if (s.status === 'PAUSED') { event = 'Session Paused'; type = 'paused'; }
            else { event = 'Session Active'; type = 'active'; }

            return {
                id: s.id,
                event,
                type,
                tableName,
                playerCount,
                amount,
                minutesAgo,
                status: s.status
            };
        });

        res.json({
            totalTables,
            occupiedTables: occupiedCount,
            occupancyPct,
            todayRevenue,
            revenuePerHour,
            activityFeed
        });
    } catch (error) {
        console.error('Error generating operational stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
