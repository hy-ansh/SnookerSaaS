import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that ensures the user belongs to the specified store or is an ADMIN.
 * Looks for storeId in params, body, or query.
 */
export const requireStoreScope = (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role === 'ADMIN') {
        next();
        return;
    }

    const requestedStoreId = req.params.storeId || req.body.store_id || req.query.store_id;

    if (requestedStoreId) {
        if (req.user?.storeId !== requestedStoreId) {
            res.status(403).json({ error: 'Forbidden: You do not have access to this store' });
            return;
        }
    }

    next();
};

/**
 * Utility function to be used inside controllers after fetching a resource.
 */
export const hasStoreAccess = (userStoreId: string | undefined, resourceStoreId: string, role: string | undefined): boolean => {
    if (role === 'ADMIN') return true;
    return userStoreId === resourceStoreId;
};
