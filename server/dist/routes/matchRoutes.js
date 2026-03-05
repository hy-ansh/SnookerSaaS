"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matchController_1 = require("../controllers/matchController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Secure all match routes behind authentication
router.use(auth_1.authenticate);
router.post('/', matchController_1.createMatch);
router.post('/:id/end', matchController_1.endMatch);
router.get('/player/:userId/stats', matchController_1.getPlayerStats);
exports.default = router;
