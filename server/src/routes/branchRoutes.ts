import { Router } from 'express';
import { getBranchesForOwner, createBranch, updateBranch, deleteBranch } from '../controllers/branchController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// All authenticated users can list branches their org owns
router.get('/', getBranchesForOwner);

// CRUD mutations: owner/admin only
router.post('/', authorize(['STORE_OWNER', 'SUPER_ADMIN']), createBranch);
router.put('/:id', authorize(['STORE_OWNER', 'SUPER_ADMIN']), updateBranch);
router.delete('/:id', authorize(['STORE_OWNER', 'SUPER_ADMIN']), deleteBranch);

export default router;
