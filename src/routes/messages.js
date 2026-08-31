import express from 'express';
import { 
  getAllMessages, 
  getUnreadCount, 
  getMessageById, 
  replyToMessage, 
  deleteMessage,
  bulkDeleteMessages
} from '../controllers/messages.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), getAllMessages);
router.get('/unread/count', authorize('ADMIN', 'SUPER_ADMIN'), getUnreadCount);
router.get('/:id', authorize('ADMIN', 'SUPER_ADMIN'), getMessageById);
router.post('/:id/reply', authorize('ADMIN', 'SUPER_ADMIN'), replyToMessage);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), deleteMessage);
router.post('/bulk-delete', authorize('ADMIN', 'SUPER_ADMIN'), bulkDeleteMessages);

export default router;