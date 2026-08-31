import express from 'express';
import { 
  login, 
  getMe, 
  changePassword, 
   updateProfile,
  getAllUsers, 
  createUser, 
  deleteUser, 
  updateUserRole,
  bulkDeleteUsers,
  getAuditLogs
} from '../controllers/auth.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public
router.post('/login', login);

// Authenticated
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword); 
router.put('/update-profile', authenticate, updateProfile);

// Super Admin only
router.get('/users', authenticate, requireSuperAdmin, getAllUsers);
router.post('/users', authenticate, requireSuperAdmin, createUser);
router.delete('/users/:id', authenticate, requireSuperAdmin, deleteUser);
router.put('/users/:id/role', authenticate, requireSuperAdmin, updateUserRole);
router.post('/users/bulk-delete', authenticate, requireSuperAdmin, bulkDeleteUsers);
router.get('/audit-logs', authenticate, requireSuperAdmin, getAuditLogs);

export default router;