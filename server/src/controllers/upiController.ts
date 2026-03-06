import { Request, Response } from 'express';
import prisma from '../config/prisma';

/**
 * GET /upi/config
 * Returns the UPI config for the current user's organization.
 */
export const getUpiConfig = async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = req.user?.storeId;
        if (!orgId) { res.status(403).json({ error: 'Forbidden' }); return; }

        const config = await prisma.upiConfig.findUnique({
            where: { organizationId: orgId }
        });

        res.json(config || null);
    } catch (err) {
        console.error('Get UPI Config Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * PUT /upi/config
 * Save or update UPI configuration for the org.
 */
export const saveUpiConfig = async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = req.user?.storeId;
        if (!orgId) { res.status(403).json({ error: 'Forbidden' }); return; }

        const { upiId, merchantName } = req.body;
        if (!upiId || !merchantName) {
            res.status(400).json({ error: 'upiId and merchantName are required' });
            return;
        }

        const config = await prisma.upiConfig.upsert({
            where: { organizationId: orgId },
            update: { upiId, merchantName },
            create: { organizationId: orgId, upiId, merchantName }
        });

        res.json({ message: 'UPI config saved', config });
    } catch (err) {
        console.error('Save UPI Config Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /upi/qr?amount=X
 * Returns UPI deep-link string for QR code generation.
 * The frontend can use any JS QR library to render this.
 */
export const generateQrData = async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = req.user?.storeId;
        if (!orgId) { res.status(403).json({ error: 'Forbidden' }); return; }

        const amount = Number(req.query.amount);
        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'A positive amount is required' });
            return;
        }

        const config = await prisma.upiConfig.findUnique({
            where: { organizationId: orgId }
        });

        if (!config) {
            res.status(404).json({ error: 'UPI not configured. Please set up UPI details first.' });
            return;
        }

        // UPI deep-link format (works with Google Pay, PhonePe, Paytm, etc.)
        const upiLink = `upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=${encodeURIComponent(config.merchantName)}&am=${amount.toFixed(2)}&cu=INR`;

        res.json({
            upiLink,
            upiId: config.upiId,
            merchantName: config.merchantName,
            amount
        });
    } catch (err) {
        console.error('Generate QR Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
