import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

// Ensure pgbouncer=true is appended when using the Supabase pooler
if (dbUrl && dbUrl.includes('pooler.supabase.com')) {
    if (!dbUrl.includes('pgbouncer=true')) {
        const separator = dbUrl.includes('?') ? '&' : '?';
        dbUrl = `${dbUrl}${separator}pgbouncer=true`;
    }
    // Remove the strictly problematic connection_limit=1 from Supabase IPv4 URL config
    dbUrl = dbUrl.replace('connection_limit=1', 'connection_limit=10');
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
