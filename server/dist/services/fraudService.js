"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFraudDetectionSweep = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
/**
 * Sweeps recently completed or cancelled sessions to look for anomalies.
 * If found, generates a Fraud Alert for the Super Admin.
 */
const runFraudDetectionSweep = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[FraudService] Running background sweep...');
        // 1. Look for High Cancellation Rates (Ghosted Revenue)
        // Let's get all cancelled sessions in the last 24h grouped by branch
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const recentCancellations = yield prisma_1.default.session.findMany({
            where: {
                status: 'CANCELLED',
                startedAt: { gte: yesterday }
            },
            include: { branch: true }
        });
        // Group by organization
        const orgCancellationCounts = {};
        recentCancellations.forEach(session => {
            const orgId = session.branch.organizationId;
            if (!orgCancellationCounts[orgId]) {
                orgCancellationCounts[orgId] = { count: 0, branchId: session.branchId };
            }
            orgCancellationCounts[orgId].count += 1;
        });
        // If an org cancels more than 5 sessions in 24h, flag it
        for (const orgId in orgCancellationCounts) {
            if (orgCancellationCounts[orgId].count >= 5) {
                // Check if alert already exists today to prevent spam
                const existingAlert = yield prisma_1.default.fraudAlert.findFirst({
                    where: {
                        organizationId: orgId,
                        description: { contains: 'High number of session cancellations' },
                        createdAt: { gte: yesterday }
                    }
                });
                if (!existingAlert) {
                    yield prisma_1.default.fraudAlert.create({
                        data: {
                            organizationId: orgId,
                            branchId: orgCancellationCounts[orgId].branchId,
                            severity: client_1.AlertSeverity.HIGH,
                            description: `High number of session cancellations (${orgCancellationCounts[orgId].count} in 24h). Potential ghosted revenue.`
                        }
                    });
                    console.log(`[FraudService] High alert generated for Org: ${orgId}`);
                }
            }
        }
        // Add additional checks here:
        // 2. High number of zero-dollar manual settlements
        // 3. Excessive pause durations
        console.log('[FraudService] Sweep complete.');
    }
    catch (error) {
        console.error('[FraudService] Error during sweep:', error);
    }
});
exports.runFraudDetectionSweep = runFraudDetectionSweep;
