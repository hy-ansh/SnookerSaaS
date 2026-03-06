import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getTables = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;

        if (!organizationId && req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: No organization context' });
            return;
        }

        const tables = await prisma.table.findMany({
            where: {
                branch: req.user?.role === 'SUPER_ADMIN' ? undefined : { organizationId }
            },
            include: {
                branch: { select: { id: true, name: true } }
            },
            orderBy: {
                nameOrNumber: 'asc'
            }
        });

        res.json(tables);
    } catch (err) {
        console.error('Error fetching tables:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createTable = async (req: Request, res: Response): Promise<void> => {
    try {
        const organizationId = req.user?.storeId;

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
        const branch = await prisma.branch.findFirst({
            where: { id: branchId as string, organizationId }
        });

        if (!branch) {
            res.status(403).json({ error: 'Branch not found or does not belong to your organization' });
            return;
        }

        // ── Subscription Limit Check ──
        const subscription = await prisma.subscription.findUnique({
            where: { organizationId },
            include: { plan: true }
        });
        if (subscription?.plan) {
            const maxTables = subscription.plan.maxTables || 0;
            if (maxTables > 0) {
                const currentCount = await prisma.table.count({
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

        const table = await prisma.table.create({
            data: {
                branchId: branchId as string,
                nameOrNumber: String(nameOrNumber),
                status: 'AVAILABLE',
                ...(customHourlyRate !== undefined ? { customHourlyRate: customHourlyRate === '' ? null : Number(customHourlyRate) } : {})
            },
            include: {
                branch: { select: { id: true, name: true } }
            }
        });

        res.status(201).json(table);
    } catch (err: any) {
        if (err.code === 'P2002') {
            res.status(409).json({ error: 'A table with this name/number already exists in this branch' });
            return;
        }
        console.error('Error creating table:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateTable = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.storeId;

        if (!organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        // Ensure table belongs to this org
        const existing = await prisma.table.findFirst({
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

        const updated = await prisma.table.update({
            where: { id: String(id) },
            data: {
                ...(nameOrNumber && { nameOrNumber: String(nameOrNumber) }),
                ...(status && { status }),
                ...(customHourlyRate !== undefined ? { customHourlyRate: customHourlyRate === '' ? null : Number(customHourlyRate) } : {})
            },
            include: {
                branch: { select: { id: true, name: true } }
            }
        });

        res.json(updated);
    } catch (err) {
        console.error('Error updating table:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteTable = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.storeId;

        if (!organizationId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        // Ensure table belongs to this org
        const existing = await prisma.table.findFirst({
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

        await prisma.table.delete({ where: { id: String(id) } });

        res.json({ message: 'Table deleted successfully' });
    } catch (err) {
        console.error('Error deleting table:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
