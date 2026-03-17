import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import prisma from '../config/prisma';

// Extend Express Request to include user context
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                storeId?: string;
                branchId?: string;
            };
        }
    }
}

/**
 * Verifies the JWT Access Token and loads the user profile from the DB.
 * If a valid Supabase user has no DB record yet (e.g. created outside the
 * register flow), we auto-create a minimal User row so the request proceeds.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid Authorization header' });
            return;
        }

        const token = authHeader.split(' ')[1];

        // 1. Verify token with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            console.error(`[auth] Supabase token verification failed:`, error?.message || 'No user returned');
            res.status(401).json({ error: 'Unauthorized: Invalid token' });
            return;
        }

        const email = user.email ?? '';

        // 2. Try to find the user's DB record by email first, then by id
        let userRecord = await prisma.user.findUnique({
            where: { email },
            include: { role: true }
        });

        // Also try to find by Supabase user id in case email doesn't match
        if (!userRecord) {
            userRecord = await prisma.user.findUnique({
                where: { id: user.id },
                include: { role: true }
            });
            // We intentionally do NOT auto-update the email here. 
            // Supabase normalizes to lowercase, but the DB might have uppercase (e.g. Staff@gmail).
            // Attempting to update it might fail due to unique constraints or other issues.
        }

        // 3. Auto-provision: if the Supabase user exists but has no DB row
        //    (e.g. created directly in Supabase dashboard), create one now.
        if (!userRecord) {
            const meta = user.user_metadata ?? {};
            const roleName: string = meta.role ?? 'PLAYER';

            // Find a matching Role record in any org, or leave roleId null
            const roleRecord = await prisma.role.findFirst({
                where: { name: roleName }
            });

            try {
                userRecord = await prisma.user.create({
                    data: {
                        id: user.id,
                        email,
                        fullName: meta.full_name ?? meta.name ?? null,
                        roleId: roleRecord?.id ?? null,
                        organizationId: roleRecord?.organizationId ?? null,
                    },
                    include: { role: true }
                });
                console.log(`[auth] Auto-provisioned DB user for ${email} (role: ${roleName})`);
            } catch (provisionErr: any) {
                // If creation fails (e.g. unique constraint), try finding again
                console.warn(`[auth] Auto-provision failed for ${email}, retrying lookup:`, provisionErr.message);
                userRecord = await prisma.user.findFirst({
                    where: { OR: [{ email }, { id: user.id }] },
                    include: { role: true }
                });
                if (!userRecord) {
                    throw provisionErr; // genuinely failed
                }
            }
        }

        // Derive organizationId from branch if missing (common for Staff users)
        let derivedOrgId = userRecord.organizationId;
        if (!derivedOrgId && userRecord.branchId) {
            const branch = await prisma.branch.findUnique({
                where: { id: userRecord.branchId },
                select: { organizationId: true }
            });
            if (branch) {
                derivedOrgId = branch.organizationId;
            }
        }

        // If still no orgId and role record has one, use that
        if (!derivedOrgId && userRecord.role?.organizationId) {
            derivedOrgId = userRecord.role.organizationId;
        }

        req.user = {
            id: user.id,
            email,
            role: userRecord.role?.name ?? 'PLAYER',
            storeId: derivedOrgId ?? undefined,
            branchId: userRecord.branchId ?? undefined,
        };

        next();
    } catch (err: any) {
        console.error('Authentication Error:', err?.message || err);
        console.error('Authentication Error Stack:', err?.stack);
        res.status(500).json({ error: 'Internal Server Error during authentication' });
    }
};

/**
 * Role-Based Access Control (RBAC) middleware.
 * @param allowedRoles Array of roles that are permitted to access the route.
 */
export const authorize = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
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
