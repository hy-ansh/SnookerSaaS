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
exports.upsertPricingForBranch = exports.getPricingForBranch = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const crypto_1 = require("crypto");
/**
 * GET /pricing/:branchId
 * Returns the pricing rule for a branch (or a default if not configured yet).
 */
const getPricingForBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branchId = String(req.params.branchId);
        const rule = yield prisma_1.default.pricingRule.findFirst({ where: { branchId } });
        // Return the rule or a sensible default so the modal pre-fills correctly
        res.json(rule !== null && rule !== void 0 ? rule : { branchId, hourlyRate: 100, dayOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '23:59' });
    }
    catch (err) {
        console.error('GetPricing Error:', err);
        res.status(500).json({ error: 'Failed to fetch pricing rule' });
    }
});
exports.getPricingForBranch = getPricingForBranch;
/**
 * PUT /pricing/:branchId
 * Creates or updates the pricing rule for a branch.
 * Body: { hourlyRate: number, peakHourRate?: number }
 * dayOfWeek / startTime / endTime use all-day defaults when not supplied.
 */
const upsertPricingForBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const branchId = String(req.params.branchId);
        const { hourlyRate, peakHourRate } = req.body;
        if (!hourlyRate || isNaN(Number(hourlyRate)) || Number(hourlyRate) <= 0) {
            res.status(400).json({ error: 'A valid hourlyRate (> 0) is required' });
            return;
        }
        // Verify the branch belongs to the current user's org
        const branch = yield prisma_1.default.branch.findUnique({ where: { id: branchId } });
        if (!branch) {
            res.status(404).json({ error: 'Branch not found' });
            return;
        }
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.storeId) !== branch.organizationId) {
            res.status(403).json({ error: 'Forbidden: Branch does not belong to your organization' });
            return;
        }
        const existing = yield prisma_1.default.pricingRule.findFirst({ where: { branchId } });
        const rule = existing
            ? yield prisma_1.default.pricingRule.update({
                where: { id: existing.id },
                data: {
                    hourlyRate: Number(hourlyRate),
                    // peakHourRate is not in the schema — just update the standard rate
                },
            })
            : yield prisma_1.default.pricingRule.create({
                data: {
                    id: (0, crypto_1.randomUUID)(),
                    branchId,
                    hourlyRate: Number(hourlyRate),
                    // Required schema fields — all-day / all-week defaults
                    dayOfWeek: { set: [0, 1, 2, 3, 4, 5, 6] },
                    startTime: '00:00',
                    endTime: '23:59',
                },
            });
        res.json({ message: 'Pricing rule saved', rule });
    }
    catch (err) {
        console.error('UpsertPricing Error:', err);
        res.status(500).json({ error: (_c = err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : 'Failed to save pricing rule' });
    }
});
exports.upsertPricingForBranch = upsertPricingForBranch;
