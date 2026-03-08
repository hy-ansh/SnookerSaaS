import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// If a pooler URL is provided, we IGNORE it and force the Direct URL.
// The Supabase Supavisor pooler is currently throwing 500/unreachable errors.
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
