import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const instructions = [
\`DO $$ BEGIN ALTER TABLE "SubscriptionPlan" ADD COLUMN "type" TEXT DEFAULT 'pro'; EXCEPTION WHEN duplicate_column THEN null; END $$\`,
\`DO $$ BEGIN ALTER TABLE "SubscriptionPlan" ADD COLUMN "billingCycle" TEXT DEFAULT 'monthly'; EXCEPTION WHEN duplicate_column THEN null; END $$\`,
\`DO $$ BEGIN ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxBranches" INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN null; END $$\`,
\`DO $$ BEGIN ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxTables" INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN null; END $$\`,
\`DO $$ BEGIN ALTER TABLE "SubscriptionPlan" ADD COLUMN "adsEnabled" BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN null; END $$\`,
\`DO $$ BEGIN ALTER TABLE "SubscriptionPlan" ADD COLUMN "isActive" BOOLEAN DEFAULT true; EXCEPTION WHEN duplicate_column THEN null; END $$\`,
\`DO $$ BEGIN ALTER TABLE "SubscriptionPlan" ADD COLUMN "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP; EXCEPTION WHEN duplicate_column THEN null; END $$\`,
\`CREATE TABLE IF NOT EXISTS "Advertisement" (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "redirectUrl" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    priority INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
)\`,
\`CREATE TABLE IF NOT EXISTS "AdPlacement" (
    id TEXT PRIMARY KEY,
    "advertisementId" TEXT REFERENCES "Advertisement"(id) ON DELETE CASCADE,
    "placementName" TEXT NOT NULL
)\`,
\`CREATE TABLE IF NOT EXISTS "AdPlanVisibility" (
    id TEXT PRIMARY KEY,
    "advertisementId" TEXT REFERENCES "Advertisement"(id) ON DELETE CASCADE,
    "planId" TEXT REFERENCES "SubscriptionPlan"(id) ON DELETE CASCADE
)\`,
\`CREATE TABLE IF NOT EXISTS "UpiConfig" (
    id TEXT PRIMARY KEY,
    "organizationId" TEXT UNIQUE REFERENCES "Organization"(id) ON DELETE CASCADE,
    "upiId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
)\`
];

async function main() {
    console.log('🚀 Running DB Update Script...');
    for(const sql of instructions) {
        try {
            await prisma.$executeRawUnsafe(sql);
            console.log('✅ Success: ' + sql.substring(0, 50) + '...');
        } catch (error) {
            console.error('❌ Failed: ' + sql.substring(0, 50) + '...', error);
        }
    }
    await prisma.$disconnect();
}

main();
