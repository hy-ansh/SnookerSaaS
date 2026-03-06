import { Request, Response } from 'express';
import prisma from '../config/prisma';

/**
 * GET /branches
 * Returns branches scoped to the current user's organization (or all for SUPER_ADMIN).
 * Includes table count per branch.
 */
export const getBranchesForOwner = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;
        if (!organizationId && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const branches = await prisma.branch.findMany({
            where: req.user?.role === 'SUPER_ADMIN' ? {} : { organizationId: organizationId! },
            include: {
                _count: { select: { tables: true, sessions: true } }
            },
            orderBy: { name: 'asc' }
        });

        res.json(branches);
    } catch (err) {
        console.error('Error fetching branches:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * POST /branches
 * Creates a new branch under the current user's organization.
 */
export const createBranch = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;

        if (!organizationId) {
            res.status(403).json({ error: 'Forbidden: Organization context required' });
            return;
        }

        const { name, address } = req.body;

        if (!name?.trim()) {
            res.status(400).json({ error: 'Branch name is required' });
            return;
        }

        // ── Subscription Limit Check ──
        const subscription = await prisma.subscription.findUnique({
            where: { organizationId },
            include: { plan: true }
        });
        if (subscription?.plan) {
            const maxBranches = subscription.plan.maxBranches || 0;
            if (maxBranches > 0) {
                const currentCount = await prisma.branch.count({ where: { organizationId } });
                if (currentCount >= maxBranches) {
                    res.status(403).json({
                        error: `Your plan allows a maximum of ${maxBranches} branch(es). Upgrade to add more.`
                    });
                    return;
                }
            }
        }

        const branch = await prisma.branch.create({
            data: { name: String(name).trim(), address: address?.trim() || null, organizationId },
            include: { _count: { select: { tables: true, sessions: true } } }
        });

        res.status(201).json(branch);
    } catch (err) {
        console.error('Error creating branch:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * PUT /branches/:id
 * Updates branch name and/or address.
 */
export const updateBranch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.storeId;

        if (!organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const existing = await prisma.branch.findFirst({
            where: { id: String(id), organizationId }
        });

        if (!existing) {
            res.status(404).json({ error: 'Branch not found' });
            return;
        }

        const { name, address } = req.body;

        const updated = await prisma.branch.update({
            where: { id: String(id) },
            data: {
                ...(name?.trim() && { name: String(name).trim() }),
                ...(address !== undefined && { address: address?.trim() || null })
            },
            include: { _count: { select: { tables: true, sessions: true } } }
        });

        res.json(updated);
    } catch (err) {
        console.error('Error updating branch:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * DELETE /branches/:id
 * Deletes a branch only if it has no active sessions and no tables.
 */
export const deleteBranch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.storeId;

        if (!organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const existing = await prisma.branch.findFirst({
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

        await prisma.branch.delete({ where: { id: String(id) } });
        res.json({ message: 'Branch deleted successfully' });
    } catch (err) {
        console.error('Error deleting branch:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Legacy export kept for backward compat with old routes
export const getBranches = getBranchesForOwner;
