"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.get('/me', authController_1.getMe); // no authenticate middleware — validates JWT internally
// Admin/Owner endpoint to spawn new users without losing current session
router.post('/create-user', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN', 'STORE_OWNER']), authController_1.createUser);
exports.default = router;
