"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const organizationController_1 = require("../controllers/organizationController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Only Authenticated Users can interact with Organizations
router.use(auth_1.authenticate);
// Creation
router.post('/', organizationController_1.createOrganization);
// Getting Org Details (Requires STORE_OWNER or ADMIN)
router.get('/:orgId', (0, auth_1.authorize)(['STORE_OWNER', 'ADMIN']), organizationController_1.getOrganization);
exports.default = router;
