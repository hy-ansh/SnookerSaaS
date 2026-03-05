/**
 * setup-db.ts
 * Runs each SQL CREATE statement individually — Prisma doesn't support multi-statement raw queries.
 * Run with: npx ts-node prisma/setup-db.ts
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const statements: string[] = [
    // Enums (safe: error = already exists, which we ignore via DO $$ BEGIN)
    `DO $$ BEGIN CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'PLAYING', 'RESERVED', 'MAINTENANCE'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'WALLET'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "WalletTxnType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'SESSION_PAYMENT', 'REFUND'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "DueStatus" AS ENUM ('PENDING', 'SETTLED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ONGOING', 'COMPLETED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "OrderStatus" AS ENUM ('COMPLETED', 'CANCELLED', 'REFUNDED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "ExpenseCategory" AS ENUM ('MAINTENANCE', 'UTILITIES', 'SUPPLIES', 'SALARIES', 'MISC'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "SubStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN null; END $$`,

    // Tables
    `CREATE TABLE IF NOT EXISTS "Organization" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        "subscriptionTier" TEXT DEFAULT 'FREE_TRIAL',
        "featureFlags" JSONB,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3)
    )`,

    `CREATE TABLE IF NOT EXISTS "Branch" (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT REFERENCES "Organization"(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS "Role" (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT REFERENCES "Organization"(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        permissions TEXT[]
    )`,

    `CREATE TABLE IF NOT EXISTS "User" (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        "fullName" TEXT,
        "roleId" TEXT REFERENCES "Role"(id),
        "organizationId" TEXT REFERENCES "Organization"(id),
        "branchId" TEXT REFERENCES "Branch"(id)
    )`,

    `CREATE TABLE IF NOT EXISTS "Table" (
        id TEXT PRIMARY KEY,
        "branchId" TEXT REFERENCES "Branch"(id) ON DELETE CASCADE,
        "nameOrNumber" TEXT NOT NULL,
        status "TableStatus" DEFAULT 'AVAILABLE'
    )`,

    `CREATE TABLE IF NOT EXISTS "Session" (
        id TEXT PRIMARY KEY,
        "tableId" TEXT REFERENCES "Table"(id) ON DELETE CASCADE,
        "branchId" TEXT REFERENCES "Branch"(id) ON DELETE CASCADE,
        status "SessionStatus" DEFAULT 'ACTIVE',
        "startedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "endedAt" TIMESTAMP(3),
        "hourlyRateApplied" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "pausedDurationSecs" INTEGER DEFAULT 0,
        "durationMinutes" INTEGER,
        "totalAmount" DECIMAL(10,2)
    )`,

    `CREATE TABLE IF NOT EXISTS "SessionPause" (
        id TEXT PRIMARY KEY,
        "sessionId" TEXT REFERENCES "Session"(id) ON DELETE CASCADE,
        "pausedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "resumedAt" TIMESTAMP(3)
    )`,

    `CREATE TABLE IF NOT EXISTS "SessionPlayer" (
        "sessionId" TEXT REFERENCES "Session"(id) ON DELETE CASCADE,
        "playerId" TEXT REFERENCES "User"(id) ON DELETE CASCADE,
        "splitPct" DECIMAL(5,2) DEFAULT 100,
        PRIMARY KEY ("sessionId", "playerId")
    )`,

    `CREATE TABLE IF NOT EXISTS "PricingRule" (
        id TEXT PRIMARY KEY,
        "branchId" TEXT REFERENCES "Branch"(id) ON DELETE CASCADE,
        "dayOfWeek" INTEGER[],
        "startTime" TEXT NOT NULL,
        "endTime" TEXT NOT NULL,
        "hourlyRate" DECIMAL(10,2) NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS "Payment" (
        id TEXT PRIMARY KEY,
        "idempotencyKey" TEXT UNIQUE,
        "sessionId" TEXT REFERENCES "Session"(id),
        "payerId" TEXT REFERENCES "User"(id),
        amount DECIMAL(10,2) NOT NULL,
        method "PaymentMethod" NOT NULL,
        status "PaymentStatus" DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "WalletTransaction" (
        id TEXT PRIMARY KEY,
        "playerId" TEXT REFERENCES "User"(id),
        amount DECIMAL(10,2) NOT NULL,
        type "WalletTxnType" NOT NULL,
        "referenceId" TEXT,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "Due" (
        id TEXT PRIMARY KEY,
        "sessionId" TEXT REFERENCES "Session"(id),
        "playerId" TEXT REFERENCES "User"(id),
        amount DECIMAL(10,2) NOT NULL,
        status "DueStatus" DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "LedgerEntry" (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT REFERENCES "Organization"(id) ON DELETE CASCADE,
        "accountId" TEXT NOT NULL,
        debit DECIMAL(10,2) DEFAULT 0,
        credit DECIMAL(10,2) DEFAULT 0,
        "referenceType" TEXT NOT NULL,
        "referenceId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "PlayerProfile" (
        id TEXT PRIMARY KEY,
        "userId" TEXT UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
        nickname TEXT,
        "eloRating" INTEGER DEFAULT 1200,
        "matchesPlayed" INTEGER DEFAULT 0,
        "matchesWon" INTEGER DEFAULT 0,
        "walletBalance" DECIMAL(10,2) DEFAULT 0.00
    )`,

    `CREATE TABLE IF NOT EXISTS "Match" (
        id TEXT PRIMARY KEY,
        "sessionId" TEXT REFERENCES "Session"(id),
        "playerAId" TEXT REFERENCES "User"(id),
        "playerBId" TEXT REFERENCES "User"(id),
        "winnerId" TEXT REFERENCES "User"(id),
        "scoreA" INTEGER DEFAULT 0,
        "scoreB" INTEGER DEFAULT 0,
        status "MatchStatus" DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "InventoryItem" (
        id TEXT PRIMARY KEY,
        "branchId" TEXT REFERENCES "Branch"(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        sku TEXT,
        price DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2),
        "stockQuantity" INTEGER DEFAULT 0,
        "reorderLevel" INTEGER DEFAULT 10,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3)
    )`,

    `CREATE TABLE IF NOT EXISTS "Order" (
        id TEXT PRIMARY KEY,
        "branchId" TEXT REFERENCES "Branch"(id) ON DELETE CASCADE,
        "sessionId" TEXT REFERENCES "Session"(id),
        "playerId" TEXT REFERENCES "User"(id),
        "totalAmount" DECIMAL(10,2) NOT NULL,
        status "OrderStatus" DEFAULT 'COMPLETED',
        "paymentMethod" "PaymentMethod" DEFAULT 'CASH',
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "OrderItem" (
        id TEXT PRIMARY KEY,
        "orderId" TEXT REFERENCES "Order"(id) ON DELETE CASCADE,
        "inventoryItemId" TEXT REFERENCES "InventoryItem"(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        "unitPrice" DECIMAL(10,2) NOT NULL,
        "totalPrice" DECIMAL(10,2) NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS "ShiftReconciliation" (
        id TEXT PRIMARY KEY,
        "branchId" TEXT REFERENCES "Branch"(id) ON DELETE CASCADE,
        "staffId" TEXT REFERENCES "User"(id),
        "openedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "closedAt" TIMESTAMP(3),
        "openingCash" DECIMAL(10,2) NOT NULL,
        "expectedCash" DECIMAL(10,2),
        "actualCash" DECIMAL(10,2),
        discrepancy DECIMAL(10,2),
        notes TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS "Expense" (
        id TEXT PRIMARY KEY,
        "branchId" TEXT REFERENCES "Branch"(id) ON DELETE CASCADE,
        "recordedById" TEXT REFERENCES "User"(id),
        amount DECIMAL(10,2) NOT NULL,
        category "ExpenseCategory" NOT NULL,
        description TEXT,
        "receiptUrl" TEXT,
        "incurredAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "AssetMaintenance" (
        id TEXT PRIMARY KEY,
        "branchId" TEXT REFERENCES "Branch"(id) ON DELETE CASCADE,
        "assetName" TEXT NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        "performedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "nextDueDate" TIMESTAMP(3)
    )`,

    `CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        features JSONB NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS "Subscription" (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT UNIQUE REFERENCES "Organization"(id) ON DELETE CASCADE,
        "planId" TEXT REFERENCES "SubscriptionPlan"(id) ON DELETE CASCADE,
        status "SubStatus" DEFAULT 'ACTIVE',
        "currentPeriodStart" TIMESTAMP(3) NOT NULL,
        "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
        "cancelAtPeriodEnd" BOOLEAN DEFAULT FALSE
    )`,

    `CREATE TABLE IF NOT EXISTS "Invoice" (
        id TEXT PRIMARY KEY,
        "subscriptionId" TEXT REFERENCES "Subscription"(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        status "InvoiceStatus" DEFAULT 'OPEN',
        "dueDate" TIMESTAMP(3) NOT NULL,
        "paidAt" TIMESTAMP(3)
    )`,

    `CREATE TABLE IF NOT EXISTS "FraudAlert" (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT REFERENCES "Organization"(id) ON DELETE CASCADE,
        "branchId" TEXT REFERENCES "Branch"(id) ON DELETE CASCADE,
        severity "AlertSeverity" DEFAULT 'LOW',
        description TEXT NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )`,
];

async function main() {
    console.log('🚀 Creating DB schema — running', statements.length, 'statements...\n');
    let passed = 0;
    let failed = 0;

    for (const stmt of statements) {
        const label = stmt.trim().split('\n')[0].substring(0, 80);
        try {
            await prisma.$executeRawUnsafe(stmt);
            console.log('✅', label);
            passed++;
        } catch (e: any) {
            console.error('❌', label);
            console.error('   Error:', e.message?.split('\n')[0]);
            failed++;
        }
    }

    console.log(`\n🏁 Done — ${passed} OK, ${failed} failed`);
    await prisma.$disconnect();
}

main();
