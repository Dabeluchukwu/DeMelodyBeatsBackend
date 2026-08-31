import express from 'express';
import { 
  getAllPhotos, 
  createPhoto, 
  deletePhoto,
  bulkDeletePhotos, // ← Add this import
  getAllVideos, 
  createVideo, 
  deleteVideo,
  bulkDeleteVideos, // ← Add this import
  uploadImage,
  deleteImage
} from '../controllers/media.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/photos', getAllPhotos);
router.get('/videos', getAllVideos);

// Upload/Delete image (Admin only)
router.post('/upload', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), uploadSingle, uploadImage);
router.delete('/image', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteImage);

// Admin only routes - Photos
router.post('/photos', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createPhoto);
router.delete('/photos/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deletePhoto);
router.post('/photos/bulk-delete', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), bulkDeletePhotos); // ← Add this

// Admin only routes - Videos
router.post('/videos', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createVideo);
router.delete('/videos/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteVideo);
router.post('/videos/bulk-delete', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), bulkDeleteVideos); // ← Add this

export default router;