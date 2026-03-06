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
exports.login = exports.register = exports.createUser = exports.getMe = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_1 = require("../config/supabase");
const prisma_1 = __importDefault(require("../config/prisma"));
// ─── GET /auth/me ─────────────────────────────────────────────────────────────
// Returns the enriched profile (DB role, orgId, branchId) for the current JWT user.
// Called by AuthContext on every login to get the real DB role.
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    try {
        const authHeader = req.headers.authorization;
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
            res.status(401).json({ error: 'Missing token' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = yield supabase_1.supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        const record = yield prisma_1.default.user.findUnique({
            where: { email: user.email },
            include: { role: true, organization: true }
        });
        if (!record) {
            // User authenticated in Supabase but no DB record yet — return metadata only
            const meta = user.user_metadata;
            res.json({
                id: user.id,
                email: user.email,
                fullName: (_a = meta === null || meta === void 0 ? void 0 : meta.full_name) !== null && _a !== void 0 ? _a : null,
                role: (_b = meta === null || meta === void 0 ? void 0 : meta.role) !== null && _b !== void 0 ? _b : 'PLAYER',
                organizationId: null,
                organizationName: null,
                orgIsActive: true,
                branchId: null,
                allowedPaymentMethods: ['CASH', 'UPI', 'CARD', 'WALLET'],
            });
            return;
        }
        res.json({
            id: user.id,
            email: record.email,
            fullName: record.fullName,
            role: (_d = (_c = record.role) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : 'PLAYER',
            organizationId: (_e = record.organizationId) !== null && _e !== void 0 ? _e : null,
            organizationName: (_g = (_f = record.organization) === null || _f === void 0 ? void 0 : _f.name) !== null && _g !== void 0 ? _g : null,
            orgIsActive: (_j = (_h = record.organization) === null || _h === void 0 ? void 0 : _h.isActive) !== null && _j !== void 0 ? _j : true,
            orgCreatedAt: (_m = (_l = (_k = record.organization) === null || _k === void 0 ? void 0 : _k.createdAt) === null || _l === void 0 ? void 0 : _l.toISOString()) !== null && _m !== void 0 ? _m : null,
            branchId: (_o = record.branchId) !== null && _o !== void 0 ? _o : null,
            allowedPaymentMethods: (_q = (_p = record.organization) === null || _p === void 0 ? void 0 : _p.allowedPaymentMethods) !== null && _q !== void 0 ? _q : ['CASH', 'UPI', 'CARD', 'WALLET'],
        });
    }
    catch (err) {
        console.error('GetMe Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.getMe = getMe;
// ─── POST /auth/create-user ───────────────────────────────────────────────────
// Admin/Owner programmatic user creation via Supabase Admin API.
// This creates a user WITHOUT logging out the current active Admin session.
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, full_name, role, branch_id } = req.body;
        const requestingUser = req.user;
        if (!email || !password || !full_name || !role) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Security limits:
        // Owners can only create STAFF or PLAYER.
        if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'STORE_OWNER') {
            res.status(403).json({ error: 'Cannot create administrative roles via this endpoint' });
            return;
        }
        const orgId = requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.storeId;
        if (!orgId) {
            res.status(403).json({ error: 'Organization context missing' });
            return;
        }
        // Verify branch if provided
        if (branch_id) {
            const branch = yield prisma_1.default.branch.findFirst({
                where: { id: branch_id, organizationId: orgId }
            });
            if (!branch) {
                res.status(403).json({ error: 'Invalid branch or does not belong to your organization' });
                return;
            }
        }
        // 1. Create in Supabase Auth bypassing standard signup flow
        const { data: adminData, error: adminError } = yield supabase_1.supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                role
            }
        });
        if (adminError || !adminData.user) {
            res.status(400).json({ error: (adminError === null || adminError === void 0 ? void 0 : adminError.message) || 'Failed to create auth user' });
            return;
        }
        // 2. Resolve Role ID
        const roleRecord = yield prisma_1.default.role.findFirst({
            where: { name: role, organizationId: orgId }
        });
        // 3. Create strictly scoped Prisma Record
        const newUser = yield prisma_1.default.user.create({
            data: {
                id: adminData.user.id,
                email: email,
                fullName: full_name,
                roleId: (roleRecord === null || roleRecord === void 0 ? void 0 : roleRecord.id) || null,
                organizationId: orgId,
                branchId: branch_id || null
            }
        });
        // 4. Create PlayerProfile if creating a player
        if (role === 'PLAYER') {
            yield prisma_1.default.playerProfile.create({
                data: {
                    userId: newUser.id,
                    nickname: full_name.split(' ')[0]
                }
            });
        }
        res.status(201).json({ message: 'User created successfully', user: newUser });
    }
    catch (err) {
        console.error('Create User Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.createUser = createUser;
// ─── POST /auth/register ──────────────────────────────────────────────────────
// Creates Supabase auth user + DB User record in one atomic flow.
// For STORE_OWNER: also creates an Organization + STORE_OWNER Role + Branch.
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, full_name, role, organization_name, branch_name } = req.body;
    try {
        if (!email || !password || !full_name) {
            res.status(400).json({ error: 'Email, password, and full_name are required' });
            return;
        }
        const assignedRole = ['ADMIN', 'STORE_OWNER', 'STAFF', 'PLAYER'].includes(role)
            ? role : 'PLAYER';
        // 1. Create Supabase auth user
        const { data, error } = yield supabase_1.supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role: assignedRole }
        });
        if (error) {
            res.status(400).json({ error: error.message });
            return;
        }
        const supabaseId = data.user.id;
        // 2. DB setup depends on role
        if (assignedRole === 'STORE_OWNER') {
            // Create org → role → branch → user
            const orgName = (organization_name === null || organization_name === void 0 ? void 0 : organization_name.trim()) || `${full_name}'s Snooker Hall`;
            const branchNameStr = (branch_name === null || branch_name === void 0 ? void 0 : branch_name.trim()) || 'Main Branch';
            const org = yield prisma_1.default.organization.create({
                data: { id: supabaseId + '-org', name: orgName, subscriptionTier: 'FREE_TRIAL' }
            });
            const ownerRole = yield prisma_1.default.role.create({
                data: { id: supabaseId + '-role-owner', organizationId: org.id, name: 'STORE_OWNER', permissions: ['VIEW_ANALYTICS', 'MANAGE_STAFF', 'VIEW_PAYMENTS', 'EDIT_PRICING', 'MANAGE_TABLES', 'MANAGE_BRANCHES'] }
            });
            // Also seed other standard roles
            yield prisma_1.default.role.createMany({
                data: [
                    { id: supabaseId + '-role-staff', organizationId: org.id, name: 'STAFF', permissions: ['START_SESSION', 'END_SESSION', 'PAUSE_SESSION', 'CREATE_ORDER'] },
                    { id: supabaseId + '-role-player', organizationId: org.id, name: 'PLAYER', permissions: ['VIEW_OWN_PROFILE', 'VIEW_MATCHES', 'VIEW_WALLET'] },
                ],
                skipDuplicates: true
            });
            const branch = yield prisma_1.default.branch.create({
                data: { id: supabaseId + '-branch', organizationId: org.id, name: branchNameStr }
            });
            yield prisma_1.default.user.upsert({
                where: { email },
                create: { id: supabaseId, email, fullName: full_name, roleId: ownerRole.id, organizationId: org.id },
                update: { fullName: full_name, roleId: ownerRole.id, organizationId: org.id }
            });
            res.status(201).json({
                message: 'Store Owner registered successfully',
                role: assignedRole,
                organizationId: org.id,
                branchId: branch.id,
            });
        }
        else {
            // PLAYER or STAFF — just create a user record
            // Find a PLAYER role from any org, or create without one for now
            yield prisma_1.default.user.upsert({
                where: { email },
                create: { id: supabaseId, email, fullName: full_name },
                update: { fullName: full_name }
            });
            res.status(201).json({ message: 'User registered successfully', role: assignedRole });
        }
    }
    catch (err) {
        console.error('Registration Error:', err);
        if (err.code === 'P2002') {
            res.status(409).json({ error: 'An account with this email already exists' });
        }
        else {
            res.status(500).json({ error: 'Internal server error during registration' });
        }
    }
});
exports.register = register;
// ─── POST /auth/login ─────────────────────────────────────────────────────────
// Not needed by the frontend (Supabase client handles sign-in directly),
// but kept for REST API / testing purposes.
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        if (!supabaseAnonKey) {
            res.status(500).json({ error: 'Supabase Anon Key is missing from server config' });
            return;
        }
        const client = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
        const { data, error } = yield client.auth.signInWithPassword({ email, password });
        if (error) {
            res.status(401).json({ error: error.message });
            return;
        }
        res.status(200).json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.user,
        });
    }
    catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});
exports.login = login;
