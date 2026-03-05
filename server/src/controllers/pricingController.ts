import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { randomUUID } from 'crypto';

/**
 * GET /pricing/:branchId
 * Returns the pricing rule for a branch (or a default if not configured yet).
 */
export const getPricingForBranch = async (req: Request, res: Response): Promise<void> => {
    try {
        const branchId = String(req.params.branchId);
        const rule = await prisma.pricingRule.findFirst({ where: { branchId } });
        // Return the rule or a sensible default so the modal pre-fills correctly
        res.json(rule ?? { branchId, hourlyRate: 100, dayOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '23:59' });
    } catch (err) {
        console.error('GetPricing Error:', err);
        res.status(500).json({ error: 'Failed to fetch pricing rule' });
    }
};

/**
 * PUT /pricing/:branchId
 * Creates or updates the pricing rule for a branch.
 * Body: { hourlyRate: number, peakHourRate?: number }
 * dayOfWeek / startTime / endTime use all-day defaults when not supplied.
 */
export const upsertPricingForBranch = async (req: Request, res: Response): Promise<void> => {
    try {
        const branchId = String(req.params.branchId);
        const { hourlyRate, peakHourRate } = req.body;

        if (!hourlyRate || isNaN(Number(hourlyRate)) || Number(hourlyRate) <= 0) {
            res.status(400).json({ error: 'A valid hourlyRate (> 0) is required' });
            return;
        }

        // Verify the branch belongs to the current user's org
        const branch = await prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch) { res.status(404).json({ error: 'Branch not found' }); return; }

        if (req.user?.role !== 'ADMIN' && req.user?.storeId !== branch.organizationId) {
            res.status(403).json({ error: 'Forbidden: Branch does not belong to your organization' });
            return;
        }

        const existing = await prisma.pricingRule.findFirst({ where: { branchId } });

        const rule = existing
            ? await prisma.pricingRule.update({
                where: { id: existing.id },
                data: {
                    hourlyRate: Number(hourlyRate),
                    // peakHourRate is not in the schema — just update the standard rate
                },
            })
            : await prisma.pricingRule.create({
                data: {
                    id: randomUUID(),
                    branchId,
                    hourlyRate: Number(hourlyRate),
                    // Required schema fields — all-day / all-week defaults
                    dayOfWeek: { set: [0, 1, 2, 3, 4, 5, 6] },
                    startTime: '00:00',
                    endTime: '23:59',
                },
            });

        res.json({ message: 'Pricing rule saved', rule });
    } catch (err: any) {
        console.error('UpsertPricing Error:', err);
        res.status(500).json({ error: err?.message ?? 'Failed to save pricing rule' });
    }
};
