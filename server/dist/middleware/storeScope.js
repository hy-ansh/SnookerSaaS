"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasStoreAccess = exports.requireStoreScope = void 0;
/**
 * Middleware that ensures the user belongs to the specified store or is an ADMIN.
 * Looks for storeId in params, body, or query.
 */
const requireStoreScope = (req, res, next) => {
    var _a, _b;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'ADMIN') {
        next();
        return;
    }
    const requestedStoreId = req.params.storeId || req.body.store_id || req.query.store_id;
    if (requestedStoreId) {
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.storeId) !== requestedStoreId) {
            res.status(403).json({ error: 'Forbidden: You do not have access to this store' });
            return;
        }
    }
    next();
};
exports.requireStoreScope = requireStoreScope;
/**
 * Utility function to be used inside controllers after fetching a resource.
 */
const hasStoreAccess = (userStoreId, resourceStoreId, role) => {
    if (role === 'ADMIN')
        return true;
    return userStoreId === resourceStoreId;
};
exports.hasStoreAccess = hasStoreAccess;
