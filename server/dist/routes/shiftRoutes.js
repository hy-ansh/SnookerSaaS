"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shiftController_1 = require("../controllers/shiftController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Staff and Store Owners can open and close shifts
router.post('/open', (0, auth_1.authorize)(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), shiftController_1.openShift);
router.post('/:id/close', (0, auth_1.authorize)(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), shiftController_1.closeShift);
router.get('/', (0, auth_1.authorize)(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), shiftController_1.getShifts);
exports.default = router;
