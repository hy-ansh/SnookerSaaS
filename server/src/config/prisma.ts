import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// If Render provides a DATABASE_URL but it uses the broken Supavisor pooler, override it.
// Otherwise, use DIRECT_URL or fallback to the known working direct connection.
let dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.includes('pooler.supabase.com')) {
    dbUrl = process.env.DIRECT_URL || "postgresql://postgres:xGyLKr2ggHICUG1R@db.xuqynbvzldxazemylpko.supabase.co:5432/postgres?connection_limit=10";
} else if (!dbUrl) {
    dbUrl = process.env.DIRECT_URL || "postgresql://postgres:xGyLKr2ggHICUG1R@db.xuqynbvzldxazemylpko.supabase.co:5432/postgres?connection_limit=10";
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
