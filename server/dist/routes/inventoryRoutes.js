"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventoryController_1 = require("../controllers/inventoryController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Store Owners + Staff can view inventory and create orders
router.get('/', inventoryController_1.getInventoryItems);
router.post('/orders', inventoryController_1.createOrder);
// Only Store Owners can add new stock/items
router.post('/', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), inventoryController_1.addInventoryItem);
router.patch('/:id/stock', (0, auth_1.authorize)(['STORE_OWNER', 'SUPER_ADMIN']), inventoryController_1.updateStock);
exports.default = router;
