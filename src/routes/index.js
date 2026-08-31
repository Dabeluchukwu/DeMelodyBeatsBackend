import express from 'express';
import authRoutes from './auth.js';
import showRoutes from './shows.js';
import memberRoutes from './members.js';
import releaseRoutes from './releases.js';
import subscriberRoutes from './subscribers.js';
import contactRoutes from './contact.js';
import mediaRoutes from './media.js';
import messageRoutes from './messages.js'; 

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'De Melody Beats API'
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/shows', showRoutes);
router.use('/members', memberRoutes);
router.use('/releases', releaseRoutes);
router.use('/subscribers', subscriberRoutes);
router.use('/contact', contactRoutes);
router.use('/media', mediaRoutes);
router.use('/messages', messageRoutes); 

export default router;