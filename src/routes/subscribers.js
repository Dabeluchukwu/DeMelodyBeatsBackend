import express from 'express';
import { 
  subscribe, 
  getAllSubscribers, 
  getSubscriberStats, 
  deleteSubscriber,
  bulkDeleteSubscribers,
  verifySubscriber
} from '../controllers/subscribers.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/', subscribe);
router.get('/verify/:email', verifySubscriber); 

// Admin only routes
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getAllSubscribers);
router.get('/stats', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getSubscriberStats);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteSubscriber);
router.post('/bulk-delete', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), bulkDeleteSubscribers);

export default router;