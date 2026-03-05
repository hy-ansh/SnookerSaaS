"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET summary is available to owners + admins (read-only)
router.get('/summary', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN', 'STAFF']), paymentController_1.getPaymentSummary);
// Mutation routes require staff+ role
router.post('/', (0, auth_1.authorize)(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), paymentController_1.processPayments);
router.post('/wallet/add', (0, auth_1.authorize)(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), paymentController_1.addWalletFunds);
router.post('/dues/add', (0, auth_1.authorize)(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), paymentController_1.addDues);
exports.default = router;
