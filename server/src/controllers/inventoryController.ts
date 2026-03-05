import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ========== INVENTORY MANAGEMENT ==========

export const getInventoryItems = async (req: Request, res: Response): Promise<void> => {
    try {
        let branchId = req.user?.branchId;
        const orgId = req.user?.storeId;

        if (!branchId && orgId) {
            const fb = await prisma.branch.findFirst({ where: { organizationId: orgId } });
            if (fb) branchId = fb.id;
        }

        if (!branchId && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Branch ID required' });
            return;
        }

        const items = await prisma.inventoryItem.findMany({
            where: branchId ? { branchId } : undefined,
            orderBy: { category: 'asc' }
        });

        res.json(items);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const addInventoryItem = async (req: Request, res: Response): Promise<void> => {
    try {
        if (req.user?.role !== 'STORE_OWNER' && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Unauthorized to add inventory' });
            return;
        }

        const { name, category, sku, price, cost, stockQuantity, reorderLevel } = req.body;

        // Owners may not have a branchId — fall back to first branch in their org
        let branchId = req.user?.branchId;
        const orgId = req.user?.storeId;

        if (!branchId && orgId) {
            const fb = await prisma.branch.findFirst({ where: { organizationId: orgId } });
            if (fb) branchId = fb.id;
        }

        if (!branchId) {
            res.status(400).json({ error: 'No branch found for this organization' });
            return;
        }

        if (!name || !category || price === undefined) {
            res.status(400).json({ error: 'name, category and price are required' });
            return;
        }

        const item = await prisma.inventoryItem.create({
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
    } catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const { quantityChange } = req.body; // positive to add, negative to deduct

        const item = await prisma.inventoryItem.update({
            where: { id },
            data: {
                stockQuantity: {
                    increment: Number(quantityChange)
                }
            }
        });

        res.json(item);
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ========== POINT OF SALE (POS) ==========

export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId, playerId, items, paymentMethod } = req.body;
        let branchId = req.user?.branchId;
        const orgId = req.user?.storeId;

        if (!branchId && orgId) {
            const fb = await prisma.branch.findFirst({ where: { organizationId: orgId } });
            if (fb) branchId = fb.id;
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
        const result = await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const orderItemsData = [];

            for (const itemReq of items) {
                if (itemReq.quantity <= 0) {
                    throw new Error(`Quantity must be greater than zero for item ${itemReq.inventoryItemId}`);
                }

                const inventoryItem = await tx.inventoryItem.findUnique({ where: { id: itemReq.inventoryItemId } });

                if (!inventoryItem) {
                    throw new Error(`Item ${itemReq.inventoryItemId} not found`);
                }
                if (inventoryItem.stockQuantity < itemReq.quantity) {
                    throw new Error(`Insufficient stock for ${inventoryItem.name}`);
                }

                // Deduct stock
                await tx.inventoryItem.update({
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
            const order = await tx.order.create({
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
                const branch = await tx.branch.findUnique({ where: { id: branchId } });
                if (branch) {
                    await tx.ledgerEntry.create({
                        data: {
                            organizationId: branch.organizationId,
                            accountId: paymentMethod === 'CASH' ? 'CashInHand' : 'BankReconciled',
                            debit: totalAmount,
                            credit: 0,
                            referenceType: 'POS_ORDER',
                            referenceId: order.id
                        }
                    });

                    await tx.ledgerEntry.create({
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
                        await tx.payment.create({
                            data: {
                                payerId: playerId,
                                amount: totalAmount,
                                method: paymentMethod as any,
                                status: 'SUCCESS'
                            }
                        });
                    }
                }
            } else if (paymentMethod === 'WALLET') {
                if (!playerId) {
                    throw new Error('Player ID required for wallet payments');
                }

                const dbTransactions = await tx.walletTransaction.findMany({ where: { playerId } });
                const balance = dbTransactions.reduce((acc, t) => acc + Number(t.amount), 0);
                if (balance < totalAmount) {
                    throw new Error('Insufficient wallet balance');
                }

                await tx.walletTransaction.create({
                    data: {
                        playerId,
                        amount: -totalAmount,
                        type: 'SESSION_PAYMENT',
                        referenceId: order.id
                    }
                });
            } else if (paymentMethod === 'DUES') {
                if (!playerId) {
                    throw new Error('Player ID required for dues');
                }

                await tx.due.create({
                    data: {
                        playerId,
                        sessionId: sessionId || null,
                        amount: totalAmount,
                        status: 'PENDING'
                    }
                });
            }

            return order;
        });

        res.status(201).json(result);

    } catch (error: any) {
        console.error('Error creating POS order:', error);
        res.status(400).json({ error: error.message || 'Failed to process order' });
    }
};
