"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tableController_1 = require("../controllers/tableController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// All authenticated users can read tables
router.get('/', tableController_1.getTables);
// Only STORE_OWNER can create/update/delete tables
router.post('/', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), tableController_1.createTable);
router.put('/:id', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), tableController_1.updateTable);
router.delete('/:id', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), tableController_1.deleteTable);
exports.default = router;
