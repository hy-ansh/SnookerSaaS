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
exports.deleteTable = exports.updateTable = exports.createTable = exports.getTables = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getTables = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: No organization context' });
            return;
        }
        const tables = yield prisma_1.default.table.findMany({
            where: {
                branch: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'SUPER_ADMIN' ? undefined : { organizationId }
            },
            include: {
                branch: { select: { id: true, name: true } }
            },
            orderBy: {
                nameOrNumber: 'asc'
            }
        });
        res.json(tables);
    }
    catch (err) {
        console.error('Error fetching tables:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getTables = getTables;
const createTable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId) {
            res.status(403).json({ error: 'Forbidden: Organization context required' });
            return;
        }
        const { nameOrNumber, branchId, customHourlyRate } = req.body;
        if (!nameOrNumber || !branchId) {
            res.status(400).json({ error: 'nameOrNumber and branchId are required' });
            return;
        }
        // Verify the branch belongs to this organization
        const branch = yield prisma_1.default.branch.findFirst({
            where: { id: branchId, organizationId }
        });
        if (!branch) {
            res.status(403).json({ error: 'Branch not found or does not belong to your organization' });
            return;
        }
        // ── Subscription Limit Check ──
        const subscription = yield prisma_1.default.subscription.findUnique({
            where: { organizationId },
            include: { plan: true }
        });
        if (subscription === null || subscription === void 0 ? void 0 : subscription.plan) {
            const maxTables = subscription.plan.maxTables || 0;
            if (maxTables > 0) {
                const currentCount = yield prisma_1.default.table.count({
                    where: { branch: { organizationId } }
                });
                if (currentCount >= maxTables) {
                    res.status(403).json({
                        error: `Your plan allows a maximum of ${maxTables} table(s). Upgrade to add more.`
                    });
                    return;
                }
            }
        }
        const table = yield prisma_1.default.table.create({
            data: Object.assign({ branchId: branchId, nameOrNumber: String(nameOrNumber), status: 'AVAILABLE' }, (customHourlyRate !== undefined ? { customHourlyRate: customHourlyRate === '' ? null : Number(customHourlyRate) } : {})),
            include: {
                branch: { select: { id: true, name: true } }
            }
        });
        res.status(201).json(table);
    }
    catch (err) {
        if (err.code === 'P2002') {
            res.status(409).json({ error: 'A table with this name/number already exists in this branch' });
            return;
        }
        console.error('Error creating table:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.createTable = createTable;
const updateTable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        // Ensure table belongs to this org
        const existing = yield prisma_1.default.table.findFirst({
            where: { id: String(id), branch: { organizationId } }
        });
        if (!existing) {
            res.status(404).json({ error: 'Table not found' });
            return;
        }
        if (existing.status === 'PLAYING') {
            res.status(409).json({ error: 'Cannot edit a table that is currently occupied' });
            return;
        }
        const { nameOrNumber, status, customHourlyRate } = req.body;
        const updated = yield prisma_1.default.table.update({
            where: { id: String(id) },
            data: Object.assign(Object.assign(Object.assign({}, (nameOrNumber && { nameOrNumber: String(nameOrNumber) })), (status && { status })), (customHourlyRate !== undefined ? { customHourlyRate: customHourlyRate === '' ? null : Number(customHourlyRate) } : {})),
            include: {
                branch: { select: { id: true, name: true } }
            }
        });
        res.json(updated);
    }
    catch (err) {
        console.error('Error updating table:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateTable = updateTable;
const deleteTable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        // Ensure table belongs to this org
        const existing = yield prisma_1.default.table.findFirst({
            where: { id: String(id), branch: { organizationId } }
        });
        if (!existing) {
            res.status(404).json({ error: 'Table not found' });
            return;
        }
        if (existing.status === 'PLAYING') {
            res.status(409).json({ error: 'Cannot delete an occupied table. End the active session first.' });
            return;
        }
        yield prisma_1.default.table.delete({ where: { id: String(id) } });
        res.json({ message: 'Table deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting table:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deleteTable = deleteTable;
