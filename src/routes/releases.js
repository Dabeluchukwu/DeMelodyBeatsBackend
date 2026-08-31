import express from 'express';
import { 
  getAllReleases, 
  getFeaturedRelease, 
  getReleaseById, 
  createRelease, 
  updateRelease, 
  deleteRelease,
   bulkDeleteReleases,
  addSong,
  updateSong,
  deleteSong
} from '../controllers/releases.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllReleases);
router.get('/featured', getFeaturedRelease);
router.get('/:id', getReleaseById);

// Admin only routes
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createRelease);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateRelease);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteRelease);
router.post('/bulk-delete', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), bulkDeleteReleases);

// Song routes (nested under release)
router.post('/:id/songs', authenticate, authorize('ADMIN', 'EDITOR'), addSong);
router.put('/songs/:id', authenticate, authorize('ADMIN', 'EDITOR'), updateSong);
router.delete('/songs/:id', authenticate, authorize('ADMIN'), deleteSong);

export default router;