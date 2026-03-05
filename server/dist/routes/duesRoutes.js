"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const duesController_1 = require("../controllers/duesController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Player can view own dues (no owner restriction)
router.get('/my', duesController_1.getMyDues);
// Staff/Owner restricted endpoints
router.get('/', (0, auth_1.authorize)(['STORE_OWNER', 'STAFF', 'SUPER_ADMIN']), duesController_1.getStoreDues);
router.post('/settle/:playerId', (0, auth_1.authorize)(['STORE_OWNER', 'STAFF', 'SUPER_ADMIN']), duesController_1.settlePlayerDues);
router.post('/settle-one/:dueId', (0, auth_1.authorize)(['STORE_OWNER', 'STAFF', 'SUPER_ADMIN']), duesController_1.settleSpecificDue);
exports.default = router;
