import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

// Ensure pgbouncer=true is appended when using the Supabase pooler
if (dbUrl && dbUrl.includes('pooler.supabase.com')) {
    if (!dbUrl.includes('pgbouncer=true')) {
        const separator = dbUrl.includes('?') ? '&' : '?';
        dbUrl = `${dbUrl}${separator}pgbouncer=true`;
    }
    
    // Check if the user has explicitly set a connection limit in the URL
    // If not, we set it to a reasonable limit per PM2 instance (e.g., 5)
    // To avoid exhausting Supabase's global pool with multiple PM2 instances
    if (!dbUrl.includes('connection_limit=')) {
        const separator = dbUrl.includes('?') ? '&' : '?';
        dbUrl = `${dbUrl}${separator}connection_limit=5`;
    } else {
        // Remove the restrictive strictly connection_limit=1 if found
        dbUrl = dbUrl.replace('connection_limit=1', 'connection_limit=5');
    }
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
