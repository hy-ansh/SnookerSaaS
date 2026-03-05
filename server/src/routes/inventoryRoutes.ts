import { Router } from 'express';
import { getInventoryItems, addInventoryItem, updateStock, createOrder } from '../controllers/inventoryController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Store Owners + Staff can view inventory and create orders
router.get('/', getInventoryItems);
router.post('/orders', createOrder);

// Only Store Owners can add new stock/items
router.post('/', authorize(['STORE_OWNER', 'SUPER_ADMIN']), addInventoryItem);
router.patch('/:id/stock', authorize(['STORE_OWNER', 'SUPER_ADMIN']), updateStock);

export default router;
