import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getPlayerHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const playerId = req.user?.id;

    const history = await prisma.sessionPlayer.findMany({
      where: { playerId },
      include: {
        session: {
          include: {
            table: true,
            branch: true,
            players: { include: { player: { select: { id: true, fullName: true, email: true } } } },
            payments: { select: { payerId: true, method: true, status: true, amount: true } },
            dues: { select: { playerId: true, amount: true, status: true } },
          }
        }
      },
      orderBy: {
        session: { startedAt: 'desc' }
      },
      take: 50
    });

    res.json({ history });
  } catch (err) {
    console.error('Get Player History Error:', err);
    res.status(500).json({ error: 'Internal server error while fetching history' });
  }
};

export const getPlayerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawPlayerId = req.params.playerId || req.user?.id;
    const playerId = Array.isArray(rawPlayerId) ? rawPlayerId[0] : rawPlayerId;

    if (!playerId) {
      res.status(400).json({ error: 'Player ID required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: playerId },
      include: { profile: true, dues: { where: { status: 'PENDING' } } }
    });

    if (!user) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    const userProfile: any = user.profile;
    const pendingDues = (user.dues || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);

    // Count sessions this player was part of
    const sessionCount = await prisma.sessionPlayer.count({ where: { playerId } });
    const wonSessions = await prisma.sessionPlayer.count({
      where: {
        playerId,
        session: {
          winnerIds: { has: playerId },
          status: 'COMPLETED'
        }
      }
    });

    const stats = {
      user: { fullName: user.fullName, email: user.email },
      matchesPlayed: userProfile?.matchesPlayed || sessionCount,
      matchesWon: userProfile?.matchesWon || wonSessions,
      eloRating: userProfile?.eloRating || 1200,
      walletBalance: userProfile?.walletBalance || 0,
      pendingDues,
    };

    res.json(stats);
  } catch (err) {
    console.error('Get Player Stats Error:', err);
    res.status(500).json({ error: 'Internal server error while fetching stats' });
  }
};

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.storeId;

    const profiles = await prisma.playerProfile.findMany({
      where: organizationId ? { user: { organizationId } } : undefined,
      orderBy: { eloRating: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, fullName: true, email: true } }
      }
    });

    const ranked = profiles.map((p, idx) => {
      const winRate = p.matchesPlayed > 0
        ? Math.round((p.matchesWon / p.matchesPlayed) * 100)
        : 0;
      return {
        rank: idx + 1,
        id: p.userId,
        name: p.user?.fullName || p.user?.email || 'Unknown',
        elo: p.eloRating,
        winRate,
        matchesPlayed: p.matchesPlayed,
        matchesWon: p.matchesWon,
        walletBalance: Number(p.walletBalance),
        trend: 'same' as const
      };
    });

    res.json(ranked);
  } catch (err) {
    console.error('Get Leaderboard Error:', err);
    res.status(500).json({ error: 'Internal server error while fetching leaderboard' });
  }
};

export const getPlayerAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.storeId;
    if (!organizationId && req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Sessions in scope
    const baseScopeFilter = {
      status: 'COMPLETED' as const,
      branch: req.user?.role === 'SUPER_ADMIN' ? undefined : { organizationId }
    };

    const [todaySessions, monthSessions, topPlayers] = await Promise.all([
      prisma.session.findMany({
        where: { ...baseScopeFilter, endedAt: { gte: todayStart } },
        include: { players: { include: { player: { select: { id: true, fullName: true, email: true } } } } }
      }),
      prisma.session.findMany({
        where: { ...baseScopeFilter, endedAt: { gte: monthStart } },
        include: { players: { include: { player: { select: { id: true, fullName: true, email: true } } } } }
      }),
      // Top players by session wins
      prisma.playerProfile.findMany({
        where: organizationId ? { user: { organizationId } } : undefined,
        orderBy: { matchesWon: 'desc' },
        take: 10,
        include: { user: { select: { id: true, fullName: true, email: true } } }
      })
    ]);

    // Compute winner stats from today and monthly sessions
    const computeWinMap = (sessions: any[]) => {
      const wins: Record<string, { name: string; wins: number; sessions: number }> = {};
      for (const s of sessions) {
        const winnerIds: string[] = s.winnerIds || [];
        for (const sp of s.players || []) {
          const pid = sp.playerId;
          const name = sp.player?.fullName || 'Unknown';
          if (!wins[pid]) wins[pid] = { name, wins: 0, sessions: 0 };
          wins[pid].sessions += 1;
          if (winnerIds.includes(pid)) wins[pid].wins += 1;
        }
      }
      return Object.entries(wins)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.wins - a.wins);
    };

    const todayRevenue = todaySessions.reduce((s, sess) => s + Number(sess.totalAmount || 0), 0);
    const monthRevenue = monthSessions.reduce((s, sess) => s + Number(sess.totalAmount || 0), 0);

    res.json({
      today: {
        sessions: todaySessions.length,
        revenue: todayRevenue,
        winners: computeWinMap(todaySessions).slice(0, 5),
        uniquePlayers: new Set(todaySessions.flatMap(s => (s.players || []).map((p: any) => p.playerId))).size,
      },
      monthly: {
        sessions: monthSessions.length,
        revenue: monthRevenue,
        winners: computeWinMap(monthSessions).slice(0, 10),
        uniquePlayers: new Set(monthSessions.flatMap(s => (s.players || []).map((p: any) => p.playerId))).size,
      },
      leaderboard: topPlayers.map((p, i) => ({
        rank: i + 1,
        id: p.userId,
        name: p.user?.fullName || p.user?.email || 'Unknown',
        wins: p.matchesWon,
        played: p.matchesPlayed,
        winRate: p.matchesPlayed > 0 ? Math.round((p.matchesWon / p.matchesPlayed) * 100) : 0,
        elo: p.eloRating,
      }))
    });
  } catch (err) {
    console.error('Get Player Analytics Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
