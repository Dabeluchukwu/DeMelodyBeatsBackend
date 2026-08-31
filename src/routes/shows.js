import express from 'express';
import { 
  getAllShows, 
  getUpcomingShows, 
  getShowById, 
  createShow, 
  updateShow, 
  deleteShow,
  bulkDeleteShows  // ← Add this import
} from '../controllers/shows.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllShows);
router.get('/upcoming', getUpcomingShows);
router.get('/:id', getShowById);

// Admin only routes
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createShow);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateShow);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteShow);
router.post('/bulk-delete', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), bulkDeleteShows); // ← Add this

export default router;