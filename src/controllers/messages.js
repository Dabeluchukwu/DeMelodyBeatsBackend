import prisma from '../lib/prisma.js';
import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'demelodybeats@gmail.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'De Melody Beats';

// Get all messages (Admin only)
export const getAllMessages = async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

// Get unread count (Admin only)
export const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.message.count({
      where: { isRead: false },
    });
    res.json({ success: true, data: { unread: count } });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
};

// Get a single message by ID (Admin only)
export const getMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        repliedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    // Mark as read if not already
    if (!message.isRead) {
      await prisma.message.update({
        where: { id },
        data: { isRead: true },
      });
    }
    
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch message' });
  }
};

// Reply to a message (Admin only)
export const replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const adminId = req.user.id;
    
    if (!reply) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reply message is required' 
      });
    }
    
    const message = await prisma.message.findUnique({
      where: { id },
    });
    
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    // Send the reply email
    await sendReplyEmail(message.email, message.name, reply, message.subject);
    
    // Update the message with the admin who replied AND the reply content
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        isReplied: true,
        repliedAt: new Date(),
        isRead: true,
        repliedById: adminId,
        reply: reply, // ← Save the reply content
      },
      include: {
        repliedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    
    res.json({ 
      success: true, 
      data: updatedMessage,
      message: 'Reply sent successfully!' 
    });
  } catch (error) {
    console.error('Error replying to message:', error);
    res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
};

// Delete a message (Admin only)
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingMessage = await prisma.message.findUnique({
      where: { id },
    });
    
    if (!existingMessage) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    await prisma.message.delete({
      where: { id },
    });
    
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
};

// Bulk delete messages (Admin only)
export const bulkDeleteMessages = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No message IDs provided' 
      });
    }
    
    // Check if all messages exist
    const existingMessages = await prisma.message.findMany({
      where: {
        id: { in: ids },
      },
    });

    if (existingMessages.length !== ids.length) {
      const foundIds = existingMessages.map(m => m.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));
      return res.status(404).json({ 
        success: false, 
        message: `Some messages not found: ${missingIds.join(', ')}` 
      });
    }
    
    const result = await prisma.message.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    // Log the bulk deletion
    await prisma.auditLog.create({
      data: {
        action: 'BULK_DELETE',
        entity: 'Message',
        entityId: ids.join(','),
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        changes: JSON.stringify({ deletedCount: result.count, ids }),
      },
    });
    
    res.json({ 
      success: true, 
      message: `${result.count} messages deleted successfully`,
      data: { deletedCount: result.count }
    });
  } catch (error) {
    console.error('Error bulk deleting messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to bulk delete messages' 
    });
  }
};

// Send reply email helper
const sendReplyEmail = async (toEmail, toName, reply, subject) => {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [{ email: toEmail }],
        subject: `Re: ${subject || 'Your message to De Melody Beats'}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reply from De Melody Beats</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #F28C28; }
              .header h1 { color: #1A1A1A; font-size: 28px; margin: 0; }
              .header h1 span { color: #F28C28; }
              .content { padding: 30px 0; }
              .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #888; font-size: 12px; }
              .reply-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #F28C28; margin: 20px 0; }
              .slogan { color: #F2C230; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>De <span>Melody</span> Beats</h1>
              <p style="color: #F2C230; font-style: italic;">More Than Music</p>
            </div>
            <div class="content">
              <h2>Hello ${toName || 'there'},</h2>
              <p>Thank you for reaching out to us. Here's our response:</p>
              <div class="reply-box">
                <p style="white-space: pre-wrap;">${reply}</p>
              </div>
              <p>If you have any further questions, feel free to reply to this email.</p>
              <p>Stay blessed,</p>
              <p><strong>The De Melody Beats Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} De Melody Beats. All rights reserved.</p>
              <p><span class="slogan">More Than Music</span></p>
            </div>
          </body>
          </html>
        `,
      },
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Reply email sent to:', toEmail);
    return response.data;
  } catch (error) {
    console.error('Error sending reply email:', error.response?.data || error.message);
    throw error;
  }
};