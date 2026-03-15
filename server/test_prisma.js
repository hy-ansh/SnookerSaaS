const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const item = await prisma.inventoryItem.findFirst();
    const user = await prisma.user.findFirst({ where: { profile: { isNot: null } } });
    
    if (!item) throw new Error("No inventory item");
    if (!user) throw new Error("No user with profile");

    console.log("Running transaction with User:", user.id, "Branch:", item.branchId);

    const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
            data: {
                branchId: item.branchId,
                sessionId: null,
                playerId: user.id,
                totalAmount: Number(item.price) || 10,
                paymentMethod: 'CASH',
                status: 'COMPLETED',
                items: {
                    create: [{
                        inventoryItemId: item.id,
                        quantity: 1,
                        unitPrice: Number(item.price) || 10,
                        totalPrice: Number(item.price) || 10
                    }]
                }
            },
            include: { items: true }
        });

        await tx.payment.create({
            data: {
                payerId: user.id,
                amount: Number(item.price) || 10,
                method: 'CASH',
                status: 'SUCCESS'
            }
        });

        return order;
    });

    console.log("Transaction Success:", result);
  } catch (err) {
    console.error("FULL PRISMA ERROR:");
    console.error(err.message || err);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

run();
