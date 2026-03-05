import { Router } from 'express';
import { createOrganization, getOrganization } from '../controllers/organizationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Only Authenticated Users can interact with Organizations
router.use(authenticate);

// Creation
router.post('/', createOrganization);

// Getting Org Details (Requires STORE_OWNER or ADMIN)
router.get('/:orgId', authorize(['STORE_OWNER', 'ADMIN']), getOrganization);

export default router;
