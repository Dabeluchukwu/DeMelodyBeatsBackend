import express from 'express';
import { 
  getAllMembers, 
  getMemberById, 
  createMember, 
  updateMember, 
  deleteMember,
  bulkDeleteMembers
} from '../controllers/members.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllMembers);
router.get('/:id', getMemberById);

// Admin only routes
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createMember);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateMember);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteMember);
router.post('/bulk-delete', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), bulkDeleteMembers);

export default router;