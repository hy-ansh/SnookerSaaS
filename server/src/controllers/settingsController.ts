import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getAppSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        let settings = await prisma.appUpdateSettings.findUnique({
            where: { id: 'global' }
        });

        // Initialize if not present
        if (!settings) {
            settings = await prisma.appUpdateSettings.create({
                data: {
                    id: 'global',
                    latestVersion: '1.0.0',
                    minRequiredVersion: '1.0.0',
                    showUpdateModal: false,
                    updateMessage: 'A new version is available. Please update to continue.',
                    actionUrl: null
                }
            });
        }

        res.json(settings);
    } catch (err) {
        console.error('getAppSettings error:', err);
        res.status(500).json({ error: 'Failed to fetch app settings' });
    }
};

export const updateAppSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        // Enforce SUPER_ADMIN role (assuming only they can do this right now)
        if (req.user?.role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Forbidden: Requires SUPER_ADMIN' });
            return;
        }

        const {
            latestVersion,
            minRequiredVersion,
            showUpdateModal,
            updateMessage,
            actionUrl
        } = req.body;

        const settings = await prisma.appUpdateSettings.upsert({
            where: { id: 'global' },
            create: {
                id: 'global',
                latestVersion: latestVersion ?? '1.0.0',
                minRequiredVersion: minRequiredVersion ?? '1.0.0',
                showUpdateModal: showUpdateModal ?? false,
                updateMessage: updateMessage ?? 'A new version is available. Please update to continue.',
                actionUrl: actionUrl || null
            },
            update: {
                latestVersion,
                minRequiredVersion,
                showUpdateModal,
                updateMessage,
                actionUrl
            }
        });

        res.json({ message: 'Settings updated successfully', settings });
    } catch (err) {
        console.error('updateAppSettings error:', err);
        res.status(500).json({ error: 'Failed to update app settings' });
    }
};
