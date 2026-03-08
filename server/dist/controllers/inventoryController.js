"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = exports.updateStock = exports.addInventoryItem = exports.getInventoryItems = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
// ========== INVENTORY MANAGEMENT ==========
const getInventoryItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        let branchId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.branchId;
        const orgId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.storeId;
        if (!branchId && orgId) {
            const fb = yield prisma_1.default.branch.findFirst({ where: { organizationId: orgId } });
            if (fb)
                branchId = fb.id;
        }
        if (!branchId && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Branch ID required' });
            return;
        }
        const items = yield prisma_1.default.inventoryItem.findMany({
            where: branchId ? { branchId } : undefined,
            orderBy: { category: 'asc' }
        });
        res.json(items);
    }
    catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getInventoryItems = getInventoryItems;
const addInventoryItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'STORE_OWNER' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Unauthorized to add inventory' });
            return;
        }
        const { name, category, sku, price, cost, stockQuantity, reorderLevel } = req.body;
        // Owners may not have a branchId — fall back to first branch in their org
        let branchId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.branchId;
        const orgId = (_d = req.user) === null || _d === void 0 ? void 0 : _d.storeId;
        if (!branchId && orgId) {
            const fb = yield prisma_1.default.branch.findFirst({ where: { organizationId: orgId } });
            if (fb)
                branchId = fb.id;
        }
        if (!branchId) {
            res.status(400).json({ error: 'No branch found for this organization' });
            return;
        }
        if (!name || !category || price === undefined) {
            res.status(400).json({ error: 'name, category and price are required' });
            return;
        }
        const item = yield prisma_1.default.inventoryItem.create({
            data: {
                branchId,
                name,
                category,
                sku: sku || null,
                price: Number(price),
                cost: cost ? Number(cost) : null,
                stockQuantity: Number(stockQuantity) || 0,
                reorderLevel: Number(reorderLevel) || 10
            }
        });
        res.status(201).json(item);
    }
    catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.addInventoryItem = addInventoryItem;
const updateStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { quantityChange } = req.body; // positive to add, negative to deduct
        const item = yield prisma_1.default.inventoryItem.update({
            where: { id },
            data: {
                stockQuantity: {
                    increment: Number(quantityChange)
                }
            }
        });
        res.json(item);
    }
    catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateStock = updateStock;
// ========== POINT OF SALE (POS) ==========
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { sessionId, playerId, items, paymentMethod } = req.body;
        let branchId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.branchId;
        const orgId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.storeId;
        if (!branchId && orgId) {
            const fb = yield prisma_1.default.branch.findFirst({ where: { organizationId: orgId } });
            if (fb)
                branchId = fb.id;
        }
        if (!branchId) {
            res.status(400).json({ error: 'Branch ID missing' });
            return;
        }
        if (!items || !items.length) {
            res.status(400).json({ error: 'Order must contain items' });
            return;
        }
        // Calculate total and deduct stock inside a transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            let totalAmount = 0;
            const orderItemsData = [];
            for (const itemReq of items) {
                if (itemReq.quantity <= 0) {
                    throw new Error(`Quantity must be greater than zero for item ${itemReq.inventoryItemId}`);
                }
                const inventoryItem = yield tx.inventoryItem.findUnique({ where: { id: itemReq.inventoryItemId } });
                if (!inventoryItem) {
                    throw new Error(`Item ${itemReq.inventoryItemId} not found`);
                }
                if (inventoryItem.stockQuantity < itemReq.quantity) {
                    throw new Error(`Insufficient stock for ${inventoryItem.name}`);
                }
                // Deduct stock
                yield tx.inventoryItem.update({
                    where: { id: inventoryItem.id },
                    data: { stockQuantity: { decrement: itemReq.quantity } }
                });
                const lineTotal = Number(inventoryItem.price) * itemReq.quantity;
                totalAmount += lineTotal;
                orderItemsData.push({
                    inventoryItemId: inventoryItem.id,
                    quantity: itemReq.quantity,
                    unitPrice: inventoryItem.price,
                    totalPrice: lineTotal
                });
            }
            // Create Order
            const order = yield tx.order.create({
                data: {
                    branchId,
                    sessionId: sessionId || null,
                    playerId: playerId || null,
                    totalAmount,
                    paymentMethod: (paymentMethod === 'DUES' ? 'CASH' : paymentMethod) || 'CASH',
                    status: 'COMPLETED',
                    items: {
                        create: orderItemsData
                    }
                },
                include: { items: true }
            });
            // If paid by CASH/UPI directly at POS, write to Ledger + create Payment record
            if (paymentMethod !== 'WALLET' && paymentMethod !== 'DUES') {
                const branch = yield tx.branch.findUnique({ where: { id: branchId } });
                if (branch) {
                    yield tx.ledgerEntry.create({
                        data: {
                            organizationId: branch.organizationId,
                            accountId: paymentMethod === 'CASH' ? 'CashInHand' : 'BankReconciled',
                            debit: totalAmount,
                            credit: 0,
                            referenceType: 'POS_ORDER',
                            referenceId: order.id
                        }
                    });
                    yield tx.ledgerEntry.create({
                        data: {
                            organizationId: branch.organizationId,
                            accountId: 'Revenue_Canteen',
                            debit: 0,
                            credit: totalAmount,
                            referenceType: 'POS_ORDER',
                            referenceId: order.id
                        }
                    });
                    // Create a Payment record so revenue shows on the Revenue Dashboard
                    if (playerId) {
                        yield tx.payment.create({
                            data: {
                                payerId: playerId,
                                amount: totalAmount,
                                method: paymentMethod,
                                status: 'SUCCESS'
                            }
                        });
                    }
                }
            }
            else if (paymentMethod === 'WALLET') {
                if (!playerId) {
                    throw new Error('Player ID required for wallet payments');
                }
                const dbTransactions = yield tx.walletTransaction.findMany({ where: { playerId } });
                const balance = dbTransactions.reduce((acc, t) => acc + Number(t.amount), 0);
                if (balance < totalAmount) {
                    throw new Error('Insufficient wallet balance');
                }
                yield tx.walletTransaction.create({
                    data: {
                        playerId,
                        amount: -totalAmount,
                        type: 'SESSION_PAYMENT',
                        referenceId: order.id
                    }
                });
            }
            else if (paymentMethod === 'DUES') {
                if (!playerId) {
                    throw new Error('Player ID required for dues');
                }
                yield tx.due.create({
                    data: {
                        playerId,
                        sessionId: sessionId || null,
                        amount: totalAmount,
                        status: 'PENDING'
                    }
                });
            }
            return order;
        }));
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error creating POS order:', error);
        res.status(400).json({ error: error.message || 'Failed to process order' });
    }
});
exports.createOrder = createOrder;
