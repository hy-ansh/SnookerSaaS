import { Router } from 'express';
import { getTables, createTable, updateTable, deleteTable } from '../controllers/tableController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// All authenticated users can read tables
router.get('/', getTables);

// Only STORE_OWNER can create/update/delete tables
router.post('/', authorize(['STORE_OWNER', 'SUPER_ADMIN']), createTable);
router.put('/:id', authorize(['STORE_OWNER', 'SUPER_ADMIN']), updateTable);
router.delete('/:id', authorize(['STORE_OWNER', 'SUPER_ADMIN']), deleteTable);

export default router;
