import { getPaymentSummary } from './controllers/paymentController';
import prisma from './config/prisma';

const run = async () => {
    const req = {
        user: { role: 'SUPER_ADMIN' },
        query: { period: 'all' }
    } as any;

    const res = {
        json: (data: any) => {
            console.log(JSON.stringify(data, null, 2));
        },
        status: (code: number) => ({
            json: (err: any) => console.log(`Error ${code}:`, err)
        })
    } as any;

    await getPaymentSummary(req, res);
    await prisma.$disconnect();
};

run().catch(console.error);
