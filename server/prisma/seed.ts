/**
 * Comprehensive Seed Script for CueManager SaaS
 * Covers all Prisma models for full end-to-end testing.
 *
 * Run with: npx ts-node --transpile-only prisma/seed.ts
 */

// Load .env FIRST before any Prisma imports
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient, TableStatus, PaymentMethod, PaymentStatus, SessionStatus, WalletTxnType, DueStatus, MatchStatus, OrderStatus, ExpenseCategory, AlertSeverity, SubStatus, InvoiceStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────────────
// Helper UUIDs — deterministic so re-running is idempotent
// ────────────────────────────────────────────────────────────────
const IDs = {
    // Subscription Plans
    planStarter: 'plan-starter-0000-0000-000000000001',
    planPro: 'plan-pro-000000-0000-000000000002',
    planEnterprise: 'plan-enterprise-0000-000000000003',

    // Organizations
    org1: 'org-royalcue-0000-0000-000000000001',
    org2: 'org-elitesnook-000-0000-000000000002',

    // Branches
    branch1: 'branch-royalcue-main-0000-000000000001',
    branch2: 'branch-royalcue-east-0000-000000000002',
    branch3: 'branch-elitesnook-main-000-000000000003',

    // Roles (per org)
    roleAdminOrg1: 'role-admin-org1-00000-000000000001',
    roleOwnerOrg1: 'role-owner-org1-00000-000000000001',
    roleStaffOrg1: 'role-staff-org1-00000-000000000001',
    rolePlayerOrg1: 'role-player-org1-0000-000000000001',
    roleAdminOrg2: 'role-admin-org2-00000-000000000002',
    roleOwnerOrg2: 'role-owner-org2-00000-000000000002',
    roleStaffOrg2: 'role-staff-org2-00000-000000000002',
    rolePlayerOrg2: 'role-player-org2-0000-000000000002',

    // Users
    userAdmin: 'user-superadmin-0000-0000-000000000001',
    userOwner1: 'user-owner1-000000-0000-000000000001',
    userOwner2: 'user-owner2-000000-0000-000000000002',
    userStaff1: 'user-staff1-000000-0000-000000000001',
    userStaff2: 'user-staff2-000000-0000-000000000002',
    userPlayer1: 'user-player1-00000-0000-000000000001',
    userPlayer2: 'user-player2-00000-0000-000000000002',
    userPlayer3: 'user-player3-00000-0000-000000000003',

    // Tables
    table1: 'table-1-branch1-0000-0000-000000000001',
    table2: 'table-2-branch1-0000-0000-000000000002',
    table3: 'table-3-branch1-0000-0000-000000000003',
    table4: 'table-4-branch1-0000-0000-000000000004',
    table5: 'table-5-branch1-0000-0000-000000000005',
    table6: 'table-6-branch2-0000-0000-000000000006',
    table7: 'table-7-branch2-0000-0000-000000000007',

    // Sessions
    session1: 'session-completed-0001-0000-000000000001',
    session2: 'session-completed-0002-0000-000000000002',
    session3: 'session-completed-0003-0000-000000000003',
    session4: 'session-active-00001-0000-000000000004',

    // Pricing
    pricing1: 'pricing-branch1-0000-0000-000000000001',
    pricing2: 'pricing-branch2-0000-0000-000000000002',
    pricing3: 'pricing-branch3-0000-0000-000000000003',

    // Inventory
    inv1: 'inv-coke-00000000-0000-0000-000000000001',
    inv2: 'inv-water-0000000-0000-0000-000000000002',
    inv3: 'inv-chips-0000000-0000-0000-000000000003',
    inv4: 'inv-cue-chalk-00-0000-0000-000000000004',
    inv5: 'inv-cue-tip-000-0000-0000-000000000005',

    // Subscriptions
    sub1: 'sub-org1-00000000-0000-0000-000000000001',
    sub2: 'sub-org2-00000000-0000-0000-000000000002',
};

// ────────────────────────────────────────────────────────────────
// SUPABASE AUTH USERS SETUP (Creates Supabase users if SUPABASE_URL set)
// ────────────────────────────────────────────────────────────────
const demoUsers = [
    { email: 'admin@cuemanager.demo', password: 'Demo@123!', fullName: 'Super Admin', role: 'ADMIN' },
    { email: 'owner1@cuemanager.demo', password: 'Demo@123!', fullName: 'Raj Sharma', role: 'STORE_OWNER' },
    { email: 'staff1@cuemanager.demo', password: 'Demo@123!', fullName: 'Vikram Patel', role: 'STAFF' },
    { email: 'staff2@cuemanager.demo', password: 'Demo@123!', fullName: 'Arjun Mehta', role: 'STAFF' },
    { email: 'player1@cuemanager.demo', password: 'Demo@123!', fullName: 'Rahul Kumar', role: 'PLAYER' },
    { email: 'player2@cuemanager.demo', password: 'Demo@123!', fullName: 'Priya Singh', role: 'PLAYER' },
    { email: 'player3@cuemanager.demo', password: 'Demo@123!', fullName: 'Aakash Nair', role: 'PLAYER' },
    { email: 'owner2@cuemanager.demo', password: 'Demo@123!', fullName: 'Sunil Joshi', role: 'STORE_OWNER' },
];

async function main() {
    console.log('🌱 Starting comprehensive seed...\n');

    // ────────────────────────────────────────────────────────────
    // 1. SUBSCRIPTION PLANS
    // ────────────────────────────────────────────────────────────
    console.log('📦 Seeding Subscription Plans...');
    await prisma.subscriptionPlan.createMany({
        data: [
            { id: IDs.planStarter, name: 'STARTER', price: 999, features: { maxBranches: 1, canteenAccess: false, maxTables: 5, analyticsAccess: false } },
            { id: IDs.planPro, name: 'PRO', price: 2499, features: { maxBranches: 3, canteenAccess: true, maxTables: 15, analyticsAccess: true } },
            { id: IDs.planEnterprise, name: 'ENTERPRISE', price: 5999, features: { maxBranches: 999, canteenAccess: true, maxTables: 999, analyticsAccess: true, prioritySupport: true } },
        ],
        skipDuplicates: true,
    });
    console.log('  ✅ 3 Plans created');

    // ────────────────────────────────────────────────────────────
    // 2. ORGANIZATIONS
    // ────────────────────────────────────────────────────────────
    console.log('🏢 Seeding Organizations...');
    const org1 = await prisma.organization.upsert({
        where: { id: IDs.org1 },
        create: { id: IDs.org1, name: 'Royal Cue Palace', subscriptionTier: 'PRO', featureFlags: { canteenPOS: true, fraudDetection: true } },
        update: {},
    });

    const org2 = await prisma.organization.upsert({
        where: { id: IDs.org2 },
        create: { id: IDs.org2, name: 'Elite Snooker Arena', subscriptionTier: 'STARTER', featureFlags: { canteenPOS: false, fraudDetection: false } },
        update: {},
    });
    console.log('  ✅ 2 Organizations created');

    // ────────────────────────────────────────────────────────────
    // 3. BRANCHES
    // ────────────────────────────────────────────────────────────
    console.log('🏬 Seeding Branches...');
    const branch1 = await prisma.branch.upsert({
        where: { id: IDs.branch1 },
        create: { id: IDs.branch1, organizationId: IDs.org1, name: 'Royal Cue - Main Branch', address: '12 MG Road, Bangalore, Karnataka' },
        update: {},
    });

    const branch2 = await prisma.branch.upsert({
        where: { id: IDs.branch2 },
        create: { id: IDs.branch2, organizationId: IDs.org1, name: 'Royal Cue - East Wing', address: '45 Indiranagar, Bangalore, Karnataka' },
        update: {},
    });

    const branch3 = await prisma.branch.upsert({
        where: { id: IDs.branch3 },
        create: { id: IDs.branch3, organizationId: IDs.org2, name: 'Elite Snooker - Central', address: '78 Koramangala, Bangalore, Karnataka' },
        update: {},
    });
    console.log('  ✅ 3 Branches created');

    // ────────────────────────────────────────────────────────────
    // 4. ROLES
    // ────────────────────────────────────────────────────────────
    console.log('🔑 Seeding Roles...');
    await prisma.role.upsert({ where: { id: IDs.roleAdminOrg1 }, create: { id: IDs.roleAdminOrg1, organizationId: IDs.org1, name: 'ADMIN', permissions: ['*'] }, update: {} });
    await prisma.role.upsert({ where: { id: IDs.roleOwnerOrg1 }, create: { id: IDs.roleOwnerOrg1, organizationId: IDs.org1, name: 'STORE_OWNER', permissions: ['VIEW_ANALYTICS', 'MANAGE_STAFF', 'VIEW_PAYMENTS', 'EDIT_PRICING'] }, update: {} });
    await prisma.role.upsert({ where: { id: IDs.roleStaffOrg1 }, create: { id: IDs.roleStaffOrg1, organizationId: IDs.org1, name: 'STAFF', permissions: ['START_SESSION', 'END_SESSION', 'PAUSE_SESSION', 'CREATE_ORDER'] }, update: {} });
    await prisma.role.upsert({ where: { id: IDs.rolePlayerOrg1 }, create: { id: IDs.rolePlayerOrg1, organizationId: IDs.org1, name: 'PLAYER', permissions: ['VIEW_OWN_PROFILE', 'VIEW_MATCHES', 'VIEW_WALLET'] }, update: {} });
    await prisma.role.upsert({ where: { id: IDs.roleAdminOrg2 }, create: { id: IDs.roleAdminOrg2, organizationId: IDs.org2, name: 'ADMIN', permissions: ['*'] }, update: {} });
    await prisma.role.upsert({ where: { id: IDs.roleOwnerOrg2 }, create: { id: IDs.roleOwnerOrg2, organizationId: IDs.org2, name: 'STORE_OWNER', permissions: ['VIEW_ANALYTICS', 'MANAGE_STAFF', 'VIEW_PAYMENTS', 'EDIT_PRICING'] }, update: {} });
    await prisma.role.upsert({ where: { id: IDs.roleStaffOrg2 }, create: { id: IDs.roleStaffOrg2, organizationId: IDs.org2, name: 'STAFF', permissions: ['START_SESSION', 'END_SESSION', 'PAUSE_SESSION'] }, update: {} });
    await prisma.role.upsert({ where: { id: IDs.rolePlayerOrg2 }, create: { id: IDs.rolePlayerOrg2, organizationId: IDs.org2, name: 'PLAYER', permissions: ['VIEW_OWN_PROFILE', 'VIEW_MATCHES'] }, update: {} });
    console.log('  ✅ 8 Roles created');

    // ────────────────────────────────────────────────────────────
    // 5. USERS (DB records — Supabase auth must be separate)
    // ────────────────────────────────────────────────────────────
    console.log('👥 Seeding Users...');
    await prisma.user.upsert({ where: { id: IDs.userAdmin }, create: { id: IDs.userAdmin, email: 'admin@cuemanager.demo', fullName: 'Super Admin', roleId: IDs.roleAdminOrg1 }, update: { roleId: IDs.roleAdminOrg1 } });
    await prisma.user.upsert({ where: { id: IDs.userOwner1 }, create: { id: IDs.userOwner1, email: 'owner1@cuemanager.demo', fullName: 'Raj Sharma', roleId: IDs.roleOwnerOrg1, organizationId: IDs.org1 }, update: {} });
    await prisma.user.upsert({ where: { id: IDs.userOwner2 }, create: { id: IDs.userOwner2, email: 'owner2@cuemanager.demo', fullName: 'Sunil Joshi', roleId: IDs.roleOwnerOrg2, organizationId: IDs.org2 }, update: {} });
    await prisma.user.upsert({ where: { id: IDs.userStaff1 }, create: { id: IDs.userStaff1, email: 'staff1@cuemanager.demo', fullName: 'Vikram Patel', roleId: IDs.roleStaffOrg1, organizationId: IDs.org1, branchId: IDs.branch1 }, update: {} });
    await prisma.user.upsert({ where: { id: IDs.userStaff2 }, create: { id: IDs.userStaff2, email: 'staff2@cuemanager.demo', fullName: 'Arjun Mehta', roleId: IDs.roleStaffOrg1, organizationId: IDs.org1, branchId: IDs.branch2 }, update: {} });
    await prisma.user.upsert({ where: { id: IDs.userPlayer1 }, create: { id: IDs.userPlayer1, email: 'player1@cuemanager.demo', fullName: 'Rahul Kumar', roleId: IDs.rolePlayerOrg1, organizationId: IDs.org1 }, update: {} });
    await prisma.user.upsert({ where: { id: IDs.userPlayer2 }, create: { id: IDs.userPlayer2, email: 'player2@cuemanager.demo', fullName: 'Priya Singh', roleId: IDs.rolePlayerOrg1, organizationId: IDs.org1 }, update: {} });
    await prisma.user.upsert({ where: { id: IDs.userPlayer3 }, create: { id: IDs.userPlayer3, email: 'player3@cuemanager.demo', fullName: 'Aakash Nair', roleId: IDs.rolePlayerOrg1, organizationId: IDs.org1 }, update: {} });
    console.log('  ✅ 8 Users created');

    // ────────────────────────────────────────────────────────────
    // 6. PLAYER PROFILES
    // ────────────────────────────────────────────────────────────
    console.log('🎱 Seeding Player Profiles...');
    await prisma.playerProfile.upsert({ where: { userId: IDs.userPlayer1 }, create: { userId: IDs.userPlayer1, nickname: 'RK07', eloRating: 1420, matchesPlayed: 38, matchesWon: 22, walletBalance: 850.00 }, update: {} });
    await prisma.playerProfile.upsert({ where: { userId: IDs.userPlayer2 }, create: { userId: IDs.userPlayer2, nickname: 'PriyaCue', eloRating: 1350, matchesPlayed: 25, matchesWon: 14, walletBalance: 300.00 }, update: {} });
    await prisma.playerProfile.upsert({ where: { userId: IDs.userPlayer3 }, create: { userId: IDs.userPlayer3, nickname: 'AakashPro', eloRating: 1510, matchesPlayed: 52, matchesWon: 35, walletBalance: 1200.00 }, update: {} });
    console.log('  ✅ 3 Player Profiles created');

    // ────────────────────────────────────────────────────────────
    // 7. TABLES
    // ────────────────────────────────────────────────────────────
    console.log('🎯 Seeding Tables...');
    const tableStatus: { id: string; name: string; branchId: string; status: TableStatus }[] = [
        { id: IDs.table1, name: 'Table 1', branchId: IDs.branch1, status: 'PLAYING' },
        { id: IDs.table2, name: 'Table 2', branchId: IDs.branch1, status: 'AVAILABLE' },
        { id: IDs.table3, name: 'Table 3', branchId: IDs.branch1, status: 'AVAILABLE' },
        { id: IDs.table4, name: 'Table 4', branchId: IDs.branch1, status: 'RESERVED' },
        { id: IDs.table5, name: 'Table 5', branchId: IDs.branch1, status: 'MAINTENANCE' },
        { id: IDs.table6, name: 'Table 1', branchId: IDs.branch2, status: 'AVAILABLE' },
        { id: IDs.table7, name: 'Table 2', branchId: IDs.branch2, status: 'PLAYING' },
    ];
    for (const t of tableStatus) {
        await prisma.table.upsert({ where: { id: t.id }, create: { id: t.id, branchId: t.branchId, nameOrNumber: t.name, status: t.status }, update: { status: t.status } });
    }
    console.log('  ✅ 7 Tables created across 2 branches');

    // ────────────────────────────────────────────────────────────
    // 8. PRICING RULES
    // ────────────────────────────────────────────────────────────
    console.log('💰 Seeding Pricing Rules...');
    await prisma.pricingRule.upsert({ where: { id: IDs.pricing1 }, create: { id: IDs.pricing1, branchId: IDs.branch1, dayOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '23:59', hourlyRate: 150 }, update: {} });
    await prisma.pricingRule.upsert({ where: { id: IDs.pricing2 }, create: { id: IDs.pricing2, branchId: IDs.branch2, dayOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '23:59', hourlyRate: 120 }, update: {} });
    await prisma.pricingRule.upsert({ where: { id: IDs.pricing3 }, create: { id: IDs.pricing3, branchId: IDs.branch3, dayOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '23:59', hourlyRate: 100 }, update: {} });
    console.log('  ✅ 3 Pricing Rules created');

    // ────────────────────────────────────────────────────────────
    // 9. SESSIONS (Completed historical + 1 Active)
    // ────────────────────────────────────────────────────────────
    console.log('⏱️  Seeding Sessions...');
    const now = new Date();
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);
    const minsAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);

    // Completed session 1 (2 hrs ago)
    await prisma.session.upsert({
        where: { id: IDs.session1 },
        create: { id: IDs.session1, tableId: IDs.table2, branchId: IDs.branch1, status: 'COMPLETED', startedAt: hoursAgo(4), endedAt: hoursAgo(2), hourlyRateApplied: 150, durationMinutes: 120, totalAmount: 300, pausedDurationSecs: 0 },
        update: {},
    });

    // Completed session 2 (5 hrs ago, shorter)
    await prisma.session.upsert({
        where: { id: IDs.session2 },
        create: { id: IDs.session2, tableId: IDs.table3, branchId: IDs.branch1, status: 'COMPLETED', startedAt: hoursAgo(7), endedAt: hoursAgo(5), hourlyRateApplied: 150, durationMinutes: 90, totalAmount: 225, pausedDurationSecs: 0 },
        update: {},
    });

    // Completed session 3 (yesterday)
    await prisma.session.upsert({
        where: { id: IDs.session3 },
        create: { id: IDs.session3, tableId: IDs.table6, branchId: IDs.branch2, status: 'COMPLETED', startedAt: hoursAgo(26), endedAt: hoursAgo(24), hourlyRateApplied: 120, durationMinutes: 105, totalAmount: 210, pausedDurationSecs: 300 },
        update: {},
    });

    // ACTIVE session right now (for testing live session page)
    await prisma.session.upsert({
        where: { id: IDs.session4 },
        create: { id: IDs.session4, tableId: IDs.table1, branchId: IDs.branch1, status: 'ACTIVE', startedAt: minsAgo(45), hourlyRateApplied: 150, pausedDurationSecs: 0 },
        update: {},
    });
    console.log('  ✅ 4 Sessions created (3 completed + 1 active)');

    // ────────────────────────────────────────────────────────────
    // 10. SESSION PLAYERS
    // ────────────────────────────────────────────────────────────
    console.log('👤 Seeding Session Players...');
    try { await prisma.sessionPlayer.create({ data: { sessionId: IDs.session1, playerId: IDs.userPlayer1, splitPct: 50 } }); } catch (_) { }
    try { await prisma.sessionPlayer.create({ data: { sessionId: IDs.session1, playerId: IDs.userPlayer2, splitPct: 50 } }); } catch (_) { }
    try { await prisma.sessionPlayer.create({ data: { sessionId: IDs.session2, playerId: IDs.userPlayer3, splitPct: 100 } }); } catch (_) { }
    try { await prisma.sessionPlayer.create({ data: { sessionId: IDs.session4, playerId: IDs.userPlayer1, splitPct: 60 } }); } catch (_) { }
    try { await prisma.sessionPlayer.create({ data: { sessionId: IDs.session4, playerId: IDs.userPlayer2, splitPct: 40 } }); } catch (_) { }
    console.log('  ✅ Session Players linked');

    // ────────────────────────────────────────────────────────────
    // 11. PAYMENTS
    // ────────────────────────────────────────────────────────────
    console.log('💳 Seeding Payments...');
    await prisma.payment.createMany({
        data: [
            { sessionId: IDs.session1, payerId: IDs.userPlayer1, amount: 150, method: 'CASH', status: 'SUCCESS', idempotencyKey: 'pay-s1-p1' },
            { sessionId: IDs.session1, payerId: IDs.userPlayer2, amount: 150, method: 'UPI', status: 'SUCCESS', idempotencyKey: 'pay-s1-p2' },
            { sessionId: IDs.session2, payerId: IDs.userPlayer3, amount: 225, method: 'CARD', status: 'SUCCESS', idempotencyKey: 'pay-s2-p3' },
            { sessionId: IDs.session3, payerId: IDs.userPlayer1, amount: 210, method: 'WALLET', status: 'SUCCESS', idempotencyKey: 'pay-s3-p1' },
        ],
        skipDuplicates: true,
    });
    console.log('  ✅ 4 Payments created');

    // ────────────────────────────────────────────────────────────
    // 12. DUES
    // ────────────────────────────────────────────────────────────
    console.log('📋 Seeding Dues...');
    await prisma.due.createMany({
        data: [
            { playerId: IDs.userPlayer2, amount: 150, status: 'PENDING', sessionId: IDs.session2 },
            { playerId: IDs.userPlayer1, amount: 75, status: 'SETTLED', sessionId: IDs.session3 },
        ],
        skipDuplicates: true,
    });
    console.log('  ✅ 2 Dues created');

    // ────────────────────────────────────────────────────────────
    // 13. WALLET TRANSACTIONS
    // ────────────────────────────────────────────────────────────
    console.log('💵 Seeding Wallet Transactions...');
    await prisma.walletTransaction.createMany({
        data: [
            { playerId: IDs.userPlayer1, amount: 1000, type: 'DEPOSIT' },
            { playerId: IDs.userPlayer1, amount: -210, type: 'SESSION_PAYMENT', referenceId: IDs.session3 },
            { playerId: IDs.userPlayer2, amount: 500, type: 'DEPOSIT' },
            { playerId: IDs.userPlayer3, amount: 2000, type: 'DEPOSIT' },
            { playerId: IDs.userPlayer3, amount: -225, type: 'SESSION_PAYMENT', referenceId: IDs.session2 },
        ],
        skipDuplicates: false,
    });
    console.log('  ✅ 5 Wallet Transactions created');

    // ────────────────────────────────────────────────────────────
    // 14. MATCHES
    // ────────────────────────────────────────────────────────────
    console.log('🏆 Seeding Matches...');
    await prisma.match.createMany({
        data: [
            { sessionId: IDs.session1, playerAId: IDs.userPlayer1, playerBId: IDs.userPlayer2, winnerId: IDs.userPlayer1, scoreA: 3, scoreB: 1, status: 'COMPLETED' },
            { sessionId: IDs.session2, playerAId: IDs.userPlayer3, playerBId: IDs.userPlayer1, winnerId: IDs.userPlayer3, scoreA: 4, scoreB: 2, status: 'COMPLETED' },
            { playerAId: IDs.userPlayer1, playerBId: IDs.userPlayer3, status: 'PENDING' },
        ],
        skipDuplicates: false,
    });
    console.log('  ✅ 3 Matches created');

    // ────────────────────────────────────────────────────────────
    // 15. INVENTORY ITEMS
    // ────────────────────────────────────────────────────────────
    console.log('📦 Seeding Inventory Items...');
    await prisma.inventoryItem.upsert({ where: { id: IDs.inv1 }, create: { id: IDs.inv1, branchId: IDs.branch1, name: 'Coca Cola (330ml)', category: 'Beverages', price: 50, cost: 30, stockQuantity: 144, reorderLevel: 24 }, update: {} });
    await prisma.inventoryItem.upsert({ where: { id: IDs.inv2 }, create: { id: IDs.inv2, branchId: IDs.branch1, name: 'Mineral Water (1L)', category: 'Beverages', price: 30, cost: 15, stockQuantity: 96, reorderLevel: 20 }, update: {} });
    await prisma.inventoryItem.upsert({ where: { id: IDs.inv3 }, create: { id: IDs.inv3, branchId: IDs.branch1, name: 'Lays Chips (Classic)', category: 'Snacks', price: 20, cost: 12, stockQuantity: 60, reorderLevel: 15 }, update: {} });
    await prisma.inventoryItem.upsert({ where: { id: IDs.inv4 }, create: { id: IDs.inv4, branchId: IDs.branch1, name: 'Cue Chalk', category: 'Equipment', sku: 'CUE-CHALK-001', price: 80, cost: 40, stockQuantity: 50, reorderLevel: 10 }, update: {} });
    await prisma.inventoryItem.upsert({ where: { id: IDs.inv5 }, create: { id: IDs.inv5, branchId: IDs.branch1, name: 'Cue Tip (Standard)', category: 'Equipment', sku: 'CUE-TIP-001', price: 120, cost: 60, stockQuantity: 30, reorderLevel: 8 }, update: {} });
    console.log('  ✅ 5 Inventory Items created');

    // ────────────────────────────────────────────────────────────
    // 16. ORDERS (POS sales)
    // ────────────────────────────────────────────────────────────
    console.log('🛒 Seeding Orders...');
    const order1 = await prisma.order.create({
        data: {
            branchId: IDs.branch1,
            sessionId: IDs.session1,
            playerId: IDs.userPlayer1,
            totalAmount: 100,
            status: 'COMPLETED',
            paymentMethod: 'CASH',
            items: {
                create: [
                    { inventoryItemId: IDs.inv1, quantity: 2, unitPrice: 50, totalPrice: 100 },
                ],
            },
        },
    });

    const order2 = await prisma.order.create({
        data: {
            branchId: IDs.branch1,
            totalAmount: 70,
            status: 'COMPLETED',
            paymentMethod: 'UPI',
            items: {
                create: [
                    { inventoryItemId: IDs.inv2, quantity: 1, unitPrice: 30, totalPrice: 30 },
                    { inventoryItemId: IDs.inv3, quantity: 2, unitPrice: 20, totalPrice: 40 },
                ],
            },
        },
    });
    console.log('  ✅ 2 Orders with items created');

    // ────────────────────────────────────────────────────────────
    // 17. SHIFT RECONCILIATIONS
    // ────────────────────────────────────────────────────────────
    console.log('📊 Seeding Shift Reconciliations...');
    await prisma.shiftReconciliation.createMany({
        data: [
            { branchId: IDs.branch1, staffId: IDs.userStaff1, openedAt: hoursAgo(9), closedAt: hoursAgo(1), openingCash: 1000, expectedCash: 2500, actualCash: 2450, discrepancy: -50, notes: 'Minor discrepancy - under investigation' },
            { branchId: IDs.branch2, staffId: IDs.userStaff2, openedAt: hoursAgo(8), openingCash: 500 },
        ],
        skipDuplicates: false,
    });
    console.log('  ✅ 2 Shift Records created');

    // ────────────────────────────────────────────────────────────
    // 18. EXPENSES
    // ────────────────────────────────────────────────────────────
    console.log('💸 Seeding Expenses...');
    await prisma.expense.createMany({
        data: [
            { branchId: IDs.branch1, recordedById: IDs.userOwner1, amount: 5000, category: 'UTILITIES', description: 'Monthly electricity bill', incurredAt: hoursAgo(72) },
            { branchId: IDs.branch1, recordedById: IDs.userStaff1, amount: 800, category: 'SUPPLIES', description: 'Cue chalk and tips restocking', incurredAt: hoursAgo(48) },
            { branchId: IDs.branch2, recordedById: IDs.userOwner1, amount: 12000, category: 'SALARIES', description: 'Staff salary for February', incurredAt: hoursAgo(24) },
        ],
        skipDuplicates: false,
    });
    console.log('  ✅ 3 Expenses created');

    // ────────────────────────────────────────────────────────────
    // 19. ASSET MAINTENANCE
    // ────────────────────────────────────────────────────────────
    console.log('🔧 Seeding Asset Maintenance...');
    await prisma.assetMaintenance.createMany({
        data: [
            { branchId: IDs.branch1, assetName: 'Table 5 Cloth Replacement', cost: 3500, performedAt: hoursAgo(72), nextDueDate: new Date(now.getTime() + 90 * 24 * 3600 * 1000) },
            { branchId: IDs.branch1, assetName: 'AC Unit Servicing', cost: 1200, performedAt: hoursAgo(24), nextDueDate: new Date(now.getTime() + 30 * 24 * 3600 * 1000) },
            { branchId: IDs.branch2, assetName: 'Cue Rack Repair', cost: 400, performedAt: hoursAgo(120) },
        ],
        skipDuplicates: false,
    });
    console.log('  ✅ 3 Asset Maintenance records created');

    // ────────────────────────────────────────────────────────────
    // 20. LEDGER ENTRIES
    // ────────────────────────────────────────────────────────────
    console.log('📒 Seeding Ledger Entries...');
    await prisma.ledgerEntry.createMany({
        data: [
            { organizationId: IDs.org1, accountId: 'Revenue_Session', debit: 0, credit: 300, referenceType: 'SESSION', referenceId: IDs.session1 },
            { organizationId: IDs.org1, accountId: 'Revenue_Session', debit: 0, credit: 225, referenceType: 'SESSION', referenceId: IDs.session2 },
            { organizationId: IDs.org1, accountId: 'Revenue_Session', debit: 0, credit: 210, referenceType: 'SESSION', referenceId: IDs.session3 },
            { organizationId: IDs.org1, accountId: 'Expense_Utilities', debit: 5000, credit: 0, referenceType: 'EXPENSE', referenceId: 'exp-utilities-001' },
            { organizationId: IDs.org1, accountId: 'Expense_Supplies', debit: 800, credit: 0, referenceType: 'EXPENSE', referenceId: 'exp-supplies-001' },
        ],
        skipDuplicates: false,
    });
    console.log('  ✅ 5 Ledger Entries created');

    // ────────────────────────────────────────────────────────────
    // 21. SUBSCRIPTIONS + INVOICES
    // ────────────────────────────────────────────────────────────
    console.log('📜 Seeding Subscriptions...');
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const sub1 = await prisma.subscription.upsert({
        where: { id: IDs.sub1 },
        create: { id: IDs.sub1, organizationId: IDs.org1, planId: IDs.planPro, status: 'ACTIVE', currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
        update: {},
    });

    const sub2 = await prisma.subscription.upsert({
        where: { id: IDs.sub2 },
        create: { id: IDs.sub2, organizationId: IDs.org2, planId: IDs.planStarter, status: 'ACTIVE', currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
        update: {},
    });

    // Invoices for org1
    await prisma.invoice.createMany({
        data: [
            { subscriptionId: IDs.sub1, amount: 2499, status: 'PAID', dueDate: periodStart, paidAt: new Date(periodStart.getTime() + 2 * 24 * 3600 * 1000) },
            { subscriptionId: IDs.sub1, amount: 2499, status: 'OPEN', dueDate: periodEnd },
        ],
        skipDuplicates: false,
    });
    console.log('  ✅ 2 Subscriptions + 2 Invoices created');

    // ────────────────────────────────────────────────────────────
    // 22. FRAUD ALERTS
    // ────────────────────────────────────────────────────────────
    console.log('🚨 Seeding Fraud Alerts...');
    await prisma.fraudAlert.createMany({
        data: [
            { organizationId: IDs.org1, branchId: IDs.branch1, severity: 'HIGH', description: 'Multiple payment failures detected from the same device in under 10 minutes. Possible card testing.', resolved: false },
            { organizationId: IDs.org1, branchId: IDs.branch2, severity: 'MEDIUM', description: 'Shift reconciliation shows ₹50 cash discrepancy. Staff Arjun Mehta.', resolved: false },
            { organizationId: IDs.org2, severity: 'LOW', description: 'Unusual session duration detected (>8hrs). Possible forgotten session end.', resolved: true },
        ],
        skipDuplicates: false,
    });
    console.log('  ✅ 3 Fraud Alerts created');

    // ────────────────────────────────────────────────────────────
    // DONE
    // ────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('✅  SEED COMPLETE — Here are your demo login credentials:\n');
    console.log('Role            │ Email                          │ Password');
    console.log('────────────────┼────────────────────────────────┼──────────────');
    console.log('Super Admin     │ admin@cuemanager.demo          │ Demo@123!');
    console.log('Store Owner     │ owner1@cuemanager.demo         │ Demo@123!');
    console.log('Staff (Branch1) │ staff1@cuemanager.demo         │ Demo@123!');
    console.log('Staff (Branch2) │ staff2@cuemanager.demo         │ Demo@123!');
    console.log('Player 1        │ player1@cuemanager.demo        │ Demo@123!');
    console.log('Player 2        │ player2@cuemanager.demo        │ Demo@123!');
    console.log('Player 3        │ player3@cuemanager.demo        │ Demo@123!');
    console.log('═'.repeat(60));
    console.log('\n⚠️  IMPORTANT: You must also create these users in Supabase Auth:');
    console.log('   Go to: Supabase Dashboard → Authentication → Users → + Add User');
    console.log('   Set user_metadata.role = ADMIN / STORE_OWNER / STAFF / PLAYER');
    console.log('   OR run the createTestUsers script if you have one.\n');
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error('❌ Seed failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
