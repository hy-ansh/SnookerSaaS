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
exports.authorize = exports.authenticate = void 0;
const supabase_1 = require("../config/supabase");
const prisma_1 = __importDefault(require("../config/prisma"));
/**
 * Verifies the JWT Access Token and loads the user profile from the DB.
 * If a valid Supabase user has no DB record yet (e.g. created outside the
 * register flow), we auto-create a minimal User row so the request proceeds.
 */
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid Authorization header' });
            return;
        }
        const token = authHeader.split(' ')[1];
        // 1. Verify token with Supabase
        const { data: { user }, error } = yield supabase_1.supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            res.status(401).json({ error: 'Unauthorized: Invalid token' });
            return;
        }
        const email = (_a = user.email) !== null && _a !== void 0 ? _a : '';
        // 2. Try to find the user's DB record
        let userRecord = yield prisma_1.default.user.findUnique({
            where: { email },
            include: { role: true }
        });
        // 3. Auto-provision: if the Supabase user exists but has no DB row
        //    (e.g. created directly in Supabase dashboard), create one now.
        if (!userRecord) {
            const meta = (_b = user.user_metadata) !== null && _b !== void 0 ? _b : {};
            const roleName = (_c = meta.role) !== null && _c !== void 0 ? _c : 'PLAYER';
            // Find a matching Role record in any org, or leave roleId null
            const roleRecord = yield prisma_1.default.role.findFirst({
                where: { name: roleName }
            });
            userRecord = yield prisma_1.default.user.create({
                data: {
                    id: user.id,
                    email,
                    fullName: (_e = (_d = meta.full_name) !== null && _d !== void 0 ? _d : meta.name) !== null && _e !== void 0 ? _e : null,
                    roleId: (_f = roleRecord === null || roleRecord === void 0 ? void 0 : roleRecord.id) !== null && _f !== void 0 ? _f : null,
                    organizationId: (_g = roleRecord === null || roleRecord === void 0 ? void 0 : roleRecord.organizationId) !== null && _g !== void 0 ? _g : null,
                },
                include: { role: true }
            });
            console.log(`[auth] Auto-provisioned DB user for ${email} (role: ${roleName})`);
        }
        // Derive organizationId from branch if missing (common for Staff users)
        let derivedOrgId = userRecord.organizationId;
        if (!derivedOrgId && userRecord.branchId) {
            const branch = yield prisma_1.default.branch.findUnique({
                where: { id: userRecord.branchId },
                select: { organizationId: true }
            });
            if (branch) {
                derivedOrgId = branch.organizationId;
            }
        }
        req.user = {
            id: user.id,
            email,
            role: (_j = (_h = userRecord.role) === null || _h === void 0 ? void 0 : _h.name) !== null && _j !== void 0 ? _j : 'PLAYER',
            storeId: derivedOrgId !== null && derivedOrgId !== void 0 ? derivedOrgId : undefined,
            branchId: (_k = userRecord.branchId) !== null && _k !== void 0 ? _k : undefined,
        };
        next();
    }
    catch (err) {
        console.error('Authentication Error:', err);
        res.status(500).json({ error: 'Internal Server Error during authentication' });
    }
});
exports.authenticate = authenticate;
/**
 * Role-Based Access Control (RBAC) middleware.
 * @param allowedRoles Array of roles that are permitted to access the route.
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized: No user context found' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
