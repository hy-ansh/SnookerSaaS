import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getAssetMaintenance = async (req: Request, res: Response): Promise<void> => {
    try {
        let branchId = req.user?.branchId;
        const orgId = req.user?.storeId;

        if (!branchId && orgId) {
            const fb = await prisma.branch.findFirst({ where: { organizationId: orgId } });
            if (fb) branchId = fb.id;
        }

        if (!branchId) {
            res.status(403).json({ error: 'No branch associated with user' });
            return;
        }

        const assets = await prisma.assetMaintenance.findMany({
            where: { branchId },
            orderBy: { performedAt: 'desc' }
        });

        res.json(assets);
    } catch (error) {
        console.error('Error fetching asset maintenance:', error);
        res.status(500).json({ error: 'Failed to fetch asset maintenance records' });
    }
};

export const createAssetMaintenance = async (req: Request, res: Response): Promise<void> => {
    try {
        let branchId = req.user?.branchId;
        const orgId = req.user?.storeId;

        if (!orgId) {
            res.status(403).json({ error: 'No org associated with user' });
            return;
        }

        if (!branchId) {
            const firstBranch = await prisma.branch.findFirst({ where: { organizationId: orgId } });
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

        const result = await prisma.$transaction(async (tx) => {
            const maintenance = await tx.assetMaintenance.create({
                data: {
                    branchId,
                    assetName,
                    cost,
                    nextDueDate: nextDueDate ? new Date(nextDueDate) : null
                }
            });

            // Also record it as an expense in the ledger
            await tx.ledgerEntry.create({
                data: {
                    organizationId: orgId,
                    accountId: 'AssetMaintenanceExpense',
                    debit: cost,
                    referenceType: 'ASSET_MAINTENANCE',
                    referenceId: maintenance.id
                }
            });

            // Log it in the expense table
            if (req.user?.id) {
                await tx.expense.create({
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
        });

        res.json(result);
    } catch (error) {
        console.error('Error recording asset maintenance:', error);
        res.status(500).json({ error: 'Failed to add record' });
    }
};
