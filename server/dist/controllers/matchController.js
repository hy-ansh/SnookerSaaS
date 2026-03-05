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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerStats = exports.endMatch = exports.createMatch = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const eloService_1 = require("../services/eloService");
const createMatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { playerAId, playerBId, sessionId } = req.body;
        // Ensure both profiles exist
        for (const pid of [playerAId, playerBId]) {
            let profile = yield prisma_1.default.playerProfile.findUnique({ where: { userId: pid } });
            if (!profile) {
                yield prisma_1.default.playerProfile.create({ data: { userId: pid } });
            }
        }
        const match = yield prisma_1.default.match.create({
            data: {
                playerAId,
                playerBId,
                sessionId,
                status: 'PENDING'
            }
        });
        res.status(201).json(match);
    }
    catch (error) {
        console.error('Error creating match:', error);
        res.status(500).json({ error: 'Failed to create match' });
    }
});
exports.createMatch = createMatch;
const endMatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const { scoreA, scoreB } = req.body;
        const match = yield prisma_1.default.match.findUnique({ where: { id } });
        if (!match) {
            res.status(404).json({ error: 'Match not found' });
            return;
        }
        if (match.status === 'COMPLETED') {
            res.status(400).json({ error: 'Match already completed' });
            return;
        }
        let winnerId = null;
        if (scoreA > scoreB)
            winnerId = match.playerAId;
        else if (scoreB > scoreA)
            winnerId = match.playerBId;
        // Transaction to ensure atomicity for match completion and ELO updates
        const updatedMatch = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const m = yield tx.match.update({
                where: { id },
                data: {
                    scoreA,
                    scoreB,
                    winnerId,
                    status: 'COMPLETED'
                }
            });
            const profileA = yield tx.playerProfile.findUnique({ where: { userId: match.playerAId } });
            const profileB = yield tx.playerProfile.findUnique({ where: { userId: match.playerBId } });
            if (profileA && profileB) {
                const { newRatingA, newRatingB } = (0, eloService_1.calculateElo)(profileA.eloRating, profileB.eloRating, scoreA, scoreB);
                yield tx.playerProfile.update({
                    where: { userId: match.playerAId },
                    data: {
                        eloRating: newRatingA,
                        matchesPlayed: { increment: 1 },
                        matchesWon: winnerId === match.playerAId ? { increment: 1 } : undefined
                    }
                });
                yield tx.playerProfile.update({
                    where: { userId: match.playerBId },
                    data: {
                        eloRating: newRatingB,
                        matchesPlayed: { increment: 1 },
                        matchesWon: winnerId === match.playerBId ? { increment: 1 } : undefined
                    }
                });
            }
            return m;
        }));
        res.json(updatedMatch);
    }
    catch (error) {
        console.error('Error ending match:', error);
        res.status(500).json({ error: 'Failed to end match' });
    }
});
exports.endMatch = endMatch;
const getPlayerStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        const profile = yield prisma_1.default.playerProfile.findUnique({
            where: { userId },
            include: { user: { select: { fullName: true, email: true } } }
        });
        if (!profile) {
            res.status(404).json({ error: 'Profile not found or no matches played yet.' });
            return;
        }
        res.json(profile);
    }
    catch (error) {
        console.error('Error getting player stats:', error);
        res.status(500).json({ error: 'Failed to fetch player stats' });
    }
});
exports.getPlayerStats = getPlayerStats;
