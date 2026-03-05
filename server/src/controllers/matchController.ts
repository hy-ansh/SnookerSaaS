import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { calculateElo } from '../services/eloService';

export const createMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { playerAId, playerBId, sessionId } = req.body;

        // Ensure both profiles exist
        for (const pid of [playerAId, playerBId]) {
            let profile = await prisma.playerProfile.findUnique({ where: { userId: pid } });
            if (!profile) {
                await prisma.playerProfile.create({ data: { userId: pid } });
            }
        }

        const match = await prisma.match.create({
            data: {
                playerAId,
                playerBId,
                sessionId,
                status: 'PENDING'
            }
        });

        res.status(201).json(match);
    } catch (error) {
        console.error('Error creating match:', error);
        res.status(500).json({ error: 'Failed to create match' });
    }
};

export const endMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { scoreA, scoreB } = req.body;

        const match = await prisma.match.findUnique({ where: { id } });
        if (!match) {
            res.status(404).json({ error: 'Match not found' });
            return;
        }

        if (match.status === 'COMPLETED') {
            res.status(400).json({ error: 'Match already completed' });
            return;
        }

        let winnerId: string | null = null;
        if (scoreA > scoreB) winnerId = match.playerAId;
        else if (scoreB > scoreA) winnerId = match.playerBId;

        // Transaction to ensure atomicity for match completion and ELO updates
        const updatedMatch = await prisma.$transaction(async (tx) => {
            const m = await tx.match.update({
                where: { id },
                data: {
                    scoreA,
                    scoreB,
                    winnerId,
                    status: 'COMPLETED'
                }
            });

            const profileA = await tx.playerProfile.findUnique({ where: { userId: match.playerAId } });
            const profileB = await tx.playerProfile.findUnique({ where: { userId: match.playerBId } });

            if (profileA && profileB) {
                const { newRatingA, newRatingB } = calculateElo(profileA.eloRating, profileB.eloRating, scoreA, scoreB);

                await tx.playerProfile.update({
                    where: { userId: match.playerAId },
                    data: {
                        eloRating: newRatingA,
                        matchesPlayed: { increment: 1 },
                        matchesWon: winnerId === match.playerAId ? { increment: 1 } : undefined
                    }
                });

                await tx.playerProfile.update({
                    where: { userId: match.playerBId },
                    data: {
                        eloRating: newRatingB,
                        matchesPlayed: { increment: 1 },
                        matchesWon: winnerId === match.playerBId ? { increment: 1 } : undefined
                    }
                });
            }

            return m;
        });

        res.json(updatedMatch);
    } catch (error) {
        console.error('Error ending match:', error);
        res.status(500).json({ error: 'Failed to end match' });
    }
};

export const getPlayerStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.userId as string;
        const profile = await prisma.playerProfile.findUnique({
            where: { userId },
            include: { user: { select: { fullName: true, email: true } } }
        });

        if (!profile) {
            res.status(404).json({ error: 'Profile not found or no matches played yet.' });
            return;
        }

        res.json(profile);
    } catch (error) {
        console.error('Error getting player stats:', error);
        res.status(500).json({ error: 'Failed to fetch player stats' });
    }
};
