import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that ensures the user belongs to the specified branch or is an ADMIN.
 * Looks for branchId in params, body, or query.
 */
export const requireBranchScope = (req: Request, res: Response, next: NextFunction): void => {
    // If Admin, bypass
    if (req.user?.role === 'ADMIN') {
        next();
        return;
    }

    // Try to find the requested branchId from params, body, or query
    const requestedBranchId = req.params.branchId || req.body.branch_id || req.query.branch_id;

    if (requestedBranchId) {
        if (req.user?.branchId !== requestedBranchId) {
            res.status(403).json({ error: 'Forbidden: You do not have access to this branch' });
            return;
        }
    }

    // If no branchId is explicitly requested in the route parameters, 
    // we assume the controller will handle the resource-level branch check.
    next();
};

/**
 * Utility function to be used inside controllers after fetching a resource.
 */
export const hasBranchAccess = (userBranchId: string | undefined, resourceBranchId: string, role: string | undefined): boolean => {
    if (role === 'ADMIN') return true;
    return userBranchId === resourceBranchId;
};
