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
exports.createAssetMaintenance = exports.getAssetMaintenance = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getAssetMaintenance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let branchId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.branchId;
        const orgId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.storeId;
        if (!branchId && orgId) {
            const fb = yield prisma_1.default.branch.findFirst({ where: { organizationId: orgId } });
            if (fb)
                branchId = fb.id;
        }
        if (!branchId) {
            res.status(403).json({ error: 'No branch associated with user' });
            return;
        }
        const assets = yield prisma_1.default.assetMaintenance.findMany({
            where: { branchId },
            orderBy: { performedAt: 'desc' }
        });
        res.json(assets);
    }
    catch (error) {
        console.error('Error fetching asset maintenance:', error);
        res.status(500).json({ error: 'Failed to fetch asset maintenance records' });
    }
});
exports.getAssetMaintenance = getAssetMaintenance;
const createAssetMaintenance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let branchId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.branchId;
        const orgId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.storeId;
        if (!orgId) {
            res.status(403).json({ error: 'No org associated with user' });
            return;
        }
        if (!branchId) {
            const firstBranch = yield prisma_1.default.branch.findFirst({ where: { organizationId: orgId } });
            if (!firstBranch) {
                res.status(400).json({ error: 'No branches exist for this organization to link the record.' });
                return;
            }
            branchId = firstBranch.id;
        }
        const { assetName, cost, nextDueDate } = req.body;
        if (!assetName || cost === undefined) {
            res.status(400).json({ error: 'Asset name and cost are required' });
            return;
        }
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const maintenance = yield tx.assetMaintenance.create({
                data: {
                    branchId,
                    assetName,
                    cost,
                    nextDueDate: nextDueDate ? new Date(nextDueDate) : null
                }
            });
            // Also record it as an expense in the ledger
            yield tx.ledgerEntry.create({
                data: {
                    organizationId: orgId,
                    accountId: 'AssetMaintenanceExpense',
                    debit: cost,
                    referenceType: 'ASSET_MAINTENANCE',
                    referenceId: maintenance.id
                }
            });
            // Log it in the expense table
            if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) {
                yield tx.expense.create({
                    data: {
                        branchId,
                        recordedById: req.user.id,
                        amount: cost,
                        category: 'MAINTENANCE',
                        description: `Asset Maintenance: ${assetName}`
                    }
                });
            }
            return maintenance;
        }));
        res.json(result);
    }
    catch (error) {
        console.error('Error recording asset maintenance:', error);
        res.status(500).json({ error: 'Failed to add record' });
    }
});
exports.createAssetMaintenance = createAssetMaintenance;
