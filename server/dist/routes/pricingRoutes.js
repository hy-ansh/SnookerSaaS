"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const pricingController_1 = require("../controllers/pricingController");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /pricing/:branchId — any staff/owner can read
router.get('/:branchId', pricingController_1.getPricingForBranch);
// PUT /pricing/:branchId — only owners/admins can change rates
router.put('/:branchId', (0, auth_1.authorize)(['STORE_OWNER', 'ADMIN']), pricingController_1.upsertPricingForBranch);
exports.default = router;
