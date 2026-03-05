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
exports.getBranches = exports.deleteBranch = exports.updateBranch = exports.createBranch = exports.getBranchesForOwner = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
/**
 * GET /branches
 * Returns branches scoped to the current user's organization (or all for SUPER_ADMIN).
 * Includes table count per branch.
 */
const getBranchesForOwner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const branches = yield prisma_1.default.branch.findMany({
            where: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'SUPER_ADMIN' ? {} : { organizationId: organizationId },
            include: {
                _count: { select: { tables: true, sessions: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(branches);
    }
    catch (err) {
        console.error('Error fetching branches:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getBranchesForOwner = getBranchesForOwner;
/**
 * POST /branches
 * Creates a new branch under the current user's organization.
 */
const createBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId) {
            res.status(403).json({ error: 'Forbidden: Organization context required' });
            return;
        }
        const { name, address } = req.body;
        if (!(name === null || name === void 0 ? void 0 : name.trim())) {
            res.status(400).json({ error: 'Branch name is required' });
            return;
        }
        const branch = yield prisma_1.default.branch.create({
            data: { name: String(name).trim(), address: (address === null || address === void 0 ? void 0 : address.trim()) || null, organizationId },
            include: { _count: { select: { tables: true, sessions: true } } }
        });
        res.status(201).json(branch);
    }
    catch (err) {
        console.error('Error creating branch:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.createBranch = createBranch;
/**
 * PUT /branches/:id
 * Updates branch name and/or address.
 */
const updateBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const existing = yield prisma_1.default.branch.findFirst({
            where: { id: String(id), organizationId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Branch not found' });
            return;
        }
        const { name, address } = req.body;
        const updated = yield prisma_1.default.branch.update({
            where: { id: String(id) },
            data: Object.assign(Object.assign({}, ((name === null || name === void 0 ? void 0 : name.trim()) && { name: String(name).trim() })), (address !== undefined && { address: (address === null || address === void 0 ? void 0 : address.trim()) || null })),
            include: { _count: { select: { tables: true, sessions: true } } }
        });
        res.json(updated);
    }
    catch (err) {
        console.error('Error updating branch:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateBranch = updateBranch;
/**
 * DELETE /branches/:id
 * Deletes a branch only if it has no active sessions and no tables.
 */
const deleteBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const existing = yield prisma_1.default.branch.findFirst({
            where: { id: String(id), organizationId },
            include: {
                _count: { select: { tables: true } },
                sessions: { where: { status: { in: ['ACTIVE', 'PAUSED'] } }, take: 1 }
            }
        });
        if (!existing) {
            res.status(404).json({ error: 'Branch not found' });
            return;
        }
        if (existing.sessions.length > 0) {
            res.status(409).json({ error: 'Cannot delete branch with active sessions. End all sessions first.' });
            return;
        }
        if (existing._count.tables > 0) {
            res.status(409).json({ error: `Cannot delete branch — it has ${existing._count.tables} table(s). Remove all tables first.` });
            return;
        }
        yield prisma_1.default.branch.delete({ where: { id: String(id) } });
        res.json({ message: 'Branch deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting branch:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deleteBranch = deleteBranch;
// Legacy export kept for backward compat with old routes
exports.getBranches = exports.getBranchesForOwner;
