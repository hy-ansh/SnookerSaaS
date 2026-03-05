"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const branchController_1 = require("../controllers/branchController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// All authenticated users can list branches their org owns
router.get('/', branchController_1.getBranchesForOwner);
// CRUD mutations: owner/admin only
router.post('/', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), branchController_1.createBranch);
router.put('/:id', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), branchController_1.updateBranch);
router.delete('/:id', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), branchController_1.deleteBranch);
exports.default = router;
