"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasBranchAccess = exports.requireBranchScope = void 0;
/**
 * Middleware that ensures the user belongs to the specified branch or is an ADMIN.
 * Looks for branchId in params, body, or query.
 */
const requireBranchScope = (req, res, next) => {
    var _a, _b;
    // If Admin, bypass
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'ADMIN') {
        next();
        return;
    }
    // Try to find the requested branchId from params, body, or query
    const requestedBranchId = req.params.branchId || req.body.branch_id || req.query.branch_id;
    if (requestedBranchId) {
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.branchId) !== requestedBranchId) {
            res.status(403).json({ error: 'Forbidden: You do not have access to this branch' });
            return;
        }
    }
    // If no branchId is explicitly requested in the route parameters, 
    // we assume the controller will handle the resource-level branch check.
    next();
};
exports.requireBranchScope = requireBranchScope;
/**
 * Utility function to be used inside controllers after fetching a resource.
 */
const hasBranchAccess = (userBranchId, resourceBranchId, role) => {
    if (role === 'ADMIN')
        return true;
    return userBranchId === resourceBranchId;
};
exports.hasBranchAccess = hasBranchAccess;
