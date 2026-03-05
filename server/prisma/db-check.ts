import prisma from '../src/config/prisma';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    console.log('DATABASE_URL prefix:', process.env.DATABASE_URL?.substring(0, 30));
    try {
        const count = await prisma.user.count();
        console.log('✅ User table exists. Row count:', count);
    } catch (e: any) {
        console.error('❌ User table error:', e.message, 'Code:', e.code);
    }
    try {
        const count = await prisma.branch.count();
        console.log('✅ Branch table exists. Row count:', count);
    } catch (e: any) {
        console.error('❌ Branch table error:', e.message, 'Code:', e.code);
    }
    try {
        const count = await prisma.organization.count();
        console.log('✅ Organization table exists. Row count:', count);
    } catch (e: any) {
        console.error('❌ Organization table error:', e.message, 'Code:', e.code);
    }
    await prisma.$disconnect();
}

main();
