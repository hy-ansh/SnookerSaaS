import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../config/supabase';
import prisma from '../config/prisma';

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
// Returns the enriched profile (DB role, orgId, branchId) for the current JWT user.
// Called by AuthContext on every login to get the real DB role.
export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        const userContext = req.user;
        if (!userContext) {
            res.status(401).json({ error: 'Unauthorized: No user context' });
            return;
        }

        const email = userContext.email;

        const record = await prisma.user.findUnique({
            where: { email },
            include: { role: true, organization: true }
        });

        if (!record) {
            // User authenticated in Supabase but no DB record yet — return metadata only
            // Fallback since the authenticate middleware handles auto-provisioning
            // This acts as a safety net
            res.json({
                id: userContext.id,
                email: email,
                fullName: null,
                role: userContext.role,
                organizationId: null,
                organizationName: null,
                orgIsActive: true,
                branchId: null,
                allowedPaymentMethods: ['CASH', 'UPI', 'CARD', 'WALLET'],
            });
            return;
        }

        res.json({
            id: userContext.id,
            email: record.email,
            fullName: record.fullName,
            role: record.role?.name ?? 'PLAYER',
            organizationId: record.organizationId ?? null,
            organizationName: record.organization?.name ?? null,
            orgIsActive: record.organization?.isActive ?? true,
            orgCreatedAt: record.organization?.createdAt?.toISOString() ?? null,
            branchId: record.branchId ?? null,
            allowedPaymentMethods: record.organization?.allowedPaymentMethods ?? ['CASH', 'UPI', 'CARD', 'WALLET'],
        });
    } catch (err) {
        console.error('GetMe Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



// ─── POST /auth/create-user ───────────────────────────────────────────────────
// Admin/Owner programmatic user creation via Supabase Admin API.
// This creates a user WITHOUT logging out the current active Admin session.
export const createUser = async (req: Request, res: Response): Promise<void> => {
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

        const orgId = requestingUser?.storeId;
        if (!orgId) {
            res.status(403).json({ error: 'Organization context missing' });
            return;
        }

        // Verify branch if provided
        if (branch_id) {
            const branch = await prisma.branch.findFirst({
                where: { id: branch_id, organizationId: orgId }
            });
            if (!branch) {
                res.status(403).json({ error: 'Invalid branch or does not belong to your organization' });
                return;
            }
        }

        // 1. Create in Supabase Auth bypassing standard signup flow
        const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                role
            }
        });

        if (adminError || !adminData.user) {
            res.status(400).json({ error: adminError?.message || 'Failed to create auth user' });
            return;
        }

        // 2. Resolve Role ID
        const roleRecord = await prisma.role.findFirst({
            where: { name: role, organizationId: orgId }
        });

        // 3. Create strictly scoped Prisma Record
        const newUser = await prisma.user.create({
            data: {
                id: adminData.user.id,
                email: email,
                fullName: full_name,
                roleId: roleRecord?.id || null,
                organizationId: orgId,
                branchId: branch_id || null
            }
        });

        // 4. Create PlayerProfile if creating a player
        if (role === 'PLAYER') {
            await prisma.playerProfile.create({
                data: {
                    userId: newUser.id,
                    nickname: full_name.split(' ')[0]
                }
            });
        }

        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (err) {
        console.error('Create User Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── POST /auth/register ──────────────────────────────────────────────────────
// Creates Supabase auth user + DB User record in one atomic flow.
// For STORE_OWNER: also creates an Organization + STORE_OWNER Role + Branch.
export const register = async (req: Request, res: Response): Promise<void> => {
    const { email, password, full_name, role, organization_name, branch_name } = req.body;

    try {
        if (!email || !password || !full_name) {
            res.status(400).json({ error: 'Email, password, and full_name are required' });
            return;
        }

        const assignedRole = ['ADMIN', 'STORE_OWNER', 'STAFF', 'PLAYER'].includes(role)
            ? role : 'PLAYER';

        // 1. Create Supabase auth user
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role: assignedRole }
        });
        if (error) { res.status(400).json({ error: error.message }); return; }

        const supabaseId = data.user.id;

        // 2. DB setup depends on role
        if (assignedRole === 'STORE_OWNER') {
            // Create org → role → branch → user
            const orgName = organization_name?.trim() || `${full_name}'s Snooker Hall`;
            const branchNameStr = branch_name?.trim() || 'Main Branch';

            const org = await prisma.organization.create({
                data: { id: supabaseId + '-org', name: orgName, subscriptionTier: 'FREE_TRIAL' }
            });
            const ownerRole = await prisma.role.create({
                data: { id: supabaseId + '-role-owner', organizationId: org.id, name: 'STORE_OWNER', permissions: ['VIEW_ANALYTICS', 'MANAGE_STAFF', 'VIEW_PAYMENTS', 'EDIT_PRICING', 'MANAGE_TABLES', 'MANAGE_BRANCHES'] }
            });
            // Also seed other standard roles
            await prisma.role.createMany({
                data: [
                    { id: supabaseId + '-role-staff', organizationId: org.id, name: 'STAFF', permissions: ['START_SESSION', 'END_SESSION', 'PAUSE_SESSION', 'CREATE_ORDER'] },
                    { id: supabaseId + '-role-player', organizationId: org.id, name: 'PLAYER', permissions: ['VIEW_OWN_PROFILE', 'VIEW_MATCHES', 'VIEW_WALLET'] },
                ],
                skipDuplicates: true
            });
            const branch = await prisma.branch.create({
                data: { id: supabaseId + '-branch', organizationId: org.id, name: branchNameStr }
            });
            await prisma.user.upsert({
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
        } else {
            // PLAYER or STAFF — just create a user record
            // Find a PLAYER role from any org, or create without one for now
            await prisma.user.upsert({
                where: { email },
                create: { id: supabaseId, email, fullName: full_name },
                update: { fullName: full_name }
            });

            res.status(201).json({ message: 'User registered successfully', role: assignedRole });
        }
    } catch (err: any) {
        console.error('Registration Error:', err);
        if (err.code === 'P2002') {
            res.status(409).json({ error: 'An account with this email already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error during registration' });
        }
    }
};

// ─── POST /auth/login ─────────────────────────────────────────────────────────
// Not needed by the frontend (Supabase client handles sign-in directly),
// but kept for REST API / testing purposes.
export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
        if (!supabaseAnonKey) {
            res.status(500).json({ error: 'Supabase Anon Key is missing from server config' });
            return;
        }
        const client = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) { res.status(401).json({ error: error.message }); return; }
        res.status(200).json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.user,
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal server error during login' });
    }
};
