"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const playerController_1 = require("../controllers/playerController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Any authenticated user can check their own history / leaderboard
router.use(auth_1.authenticate);
router.get('/leaderboard', playerController_1.getLeaderboard);
router.get('/history', playerController_1.getPlayerHistory);
router.get('/stats', playerController_1.getPlayerStats);
router.get('/stats/:playerId', playerController_1.getPlayerStats);
router.get('/analytics', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN', 'STAFF']), playerController_1.getPlayerAnalytics);
exports.default = router;
