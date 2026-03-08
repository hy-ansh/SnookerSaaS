import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (dbUrl && dbUrl.includes('pooler.supabase.com') && !dbUrl.includes('pgbouncer=true')) {
    const separator = dbUrl.includes('?') ? '&' : '?';
    dbUrl = `${dbUrl}${separator}pgbouncer=true`;
}

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: ['error'],
        datasources: {
            db: {
                url: dbUrl,
            },
        },
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
