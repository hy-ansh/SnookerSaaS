"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upiController_1 = require("../controllers/upiController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Owner can configure and view UPI settings
router.get('/config', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), upiController_1.getUpiConfig);
router.put('/config', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), upiController_1.saveUpiConfig);
// Staff and Owner can generate QR codes for payments
router.get('/qr', (0, auth_1.authorize)(['STORE_OWNER', 'STAFF', 'SUPER_ADMIN']), upiController_1.generateQrData);
exports.default = router;
