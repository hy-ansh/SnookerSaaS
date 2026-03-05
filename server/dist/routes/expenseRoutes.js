"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const expenseController_1 = require("../controllers/expenseController");
const auth_1 = require("../middleware/auth");
const requireFeature_1 = require("../middleware/requireFeature");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Staff and Owners can view and record expenses if plan includes accounting
router.post('/', (0, auth_1.authorize)(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), (0, requireFeature_1.requireFeature)('accounting'), expenseController_1.recordExpense);
router.get('/', (0, auth_1.authorize)(['STAFF', 'STORE_OWNER', 'SUPER_ADMIN']), (0, requireFeature_1.requireFeature)('accounting'), expenseController_1.getExpenses);
exports.default = router;
