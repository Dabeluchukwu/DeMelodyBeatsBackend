import prisma from '../lib/prisma.js';
import { sendContactEmail } from '../services/email.js';

// Send contact message (public)
export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and message are required' 
      });
    }
    
    // Save message to database
    const savedMessage = await prisma.message.create({
      data: {
        name,
        email,
        subject,
        message,
        isRead: false,
        isReplied: false,
      },
    });
    
    // Send email notification to admin
    try {
      await sendContactEmail(name, email, subject, message);
      console.log('Contact email sent from:', email);
    } catch (emailError) {
      console.error('Failed to send contact email:', emailError);
      // Don't fail the request - message is saved in database
    }
    
    res.status(201).json({ 
      success: true, 
      data: savedMessage,
      message: 'Message sent successfully! We will get back to you soon.' 
    });
  } catch (error) {
    console.error('Error sending contact message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};