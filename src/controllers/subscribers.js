import prisma from '../lib/prisma.js';
import { sendWelcomeEmail } from '../services/email.js';

// Subscribe a new user (public)
export const subscribe = async (req, res) => {
  try {
    const { email, firstName, city, country } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    // Check if already subscribed
    const existing = await prisma.subscriber.findUnique({
      where: { email },
    });
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already subscribed' 
      });
    }
    
    const subscriber = await prisma.subscriber.create({
      data: {
        email,
        firstName,
        city,
        country,
        verified: false,
      },
    });
    
    // Send welcome email
    try {
      await sendWelcomeEmail(email, firstName);
      console.log('Welcome email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }
    
    res.status(201).json({ 
      success: true, 
      data: subscriber,
      message: 'Subscribed successfully! Please check your email to confirm.' 
    });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ success: false, message: 'Failed to subscribe' });
  }
};

// Get all subscribers (Admin only)
export const getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: subscribers });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscribers' });
  }
};

// Get subscriber stats (Admin only)
export const getSubscriberStats = async (req, res) => {
  try {
    const total = await prisma.subscriber.count();
    const verified = await prisma.subscriber.count({ where: { verified: true } });
    const unverified = await prisma.subscriber.count({ where: { verified: false } });
    
    res.json({ 
      success: true, 
      data: { total, verified, unverified } 
    });
  } catch (error) {
    console.error('Error fetching subscriber stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// Delete a subscriber (Admin only)
export const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.subscriber.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Subscriber not found' });
    }
    
    await prisma.subscriber.delete({
      where: { id },
    });
    
    res.json({ success: true, message: 'Subscriber deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ success: false, message: 'Failed to delete subscriber' });
  }
};

// Bulk delete subscribers (Admin only)
export const bulkDeleteSubscribers = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No subscriber IDs provided' 
      });
    }

    const result = await prisma.subscriber.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    // Log the bulk deletion
    await prisma.auditLog.create({
      data: {
        action: 'BULK_DELETE',
        entity: 'Subscriber',
        entityId: ids.join(','),
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        changes: JSON.stringify({ deletedCount: result.count, ids }),
      },
    });

    res.json({ 
      success: true, 
      message: `${result.count} subscribers deleted successfully`,
      data: { deletedCount: result.count }
    });
  } catch (error) {
    console.error('Error bulk deleting subscribers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to bulk delete subscribers' 
    });
  }
};

// Verify subscriber (public - from email link)
export const verifySubscriber = async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    console.log('Verifying email:', email);
    
    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });
    
    if (!subscriber) {
      return res.status(404).json({ success: false, message: 'Subscriber not found' });
    }
    
    if (subscriber.verified) {
      return res.json({ success: true, message: 'Email already verified' });
    }
    
    await prisma.subscriber.update({
      where: { email },
      data: { verified: true },
    });
    
    console.log('Email verified successfully:', email);
    
    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    console.error('Error verifying subscriber:', error);
    res.status(500).json({ success: false, message: 'Failed to verify' });
  }
};