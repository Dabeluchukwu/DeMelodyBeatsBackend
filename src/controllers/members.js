import prisma from '../lib/prisma.js';
import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'demelodybeats@gmail.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'De Melody Beats';


// Get all members (public)
export const getAllMembers = async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch members' });
  }
};

// Get a single member by ID (public)
export const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await prisma.member.findUnique({
      where: { id },
    });
    
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    res.json({ success: true, data: member });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch member' });
  }
};

// Create a new member (Admin only)
export const createMember = async (req, res) => {
  try {
    const { name, role, bio, image, socialLinks, order, isActive, isFounder } = req.body;
    
    if (!name || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: name, role' 
      });
    }
    
    const parsedOrder = order ? parseInt(order) : 0;
    
    const member = await prisma.member.create({
      data: {
        name,
        role,
        bio: bio || '',
        image: image || '',
        socialLinks: socialLinks || {},
        order: parsedOrder,
        isActive: isActive !== undefined ? isActive : true,
        isFounder: isFounder || false,
        createdById: req.user.id,
      },
    });
    
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({ success: false, message: 'Failed to create member' });
  }
};

// Update a member (Admin only)
export const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, bio, image, socialLinks, order, isActive, isFounder } = req.body;
    
    const existingMember = await prisma.member.findUnique({
      where: { id },
    });
    
    if (!existingMember) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    const parsedOrder = order !== undefined ? parseInt(order) : existingMember.order;
    
    const updatedMember = await prisma.member.update({
      where: { id },
      data: {
        name: name || existingMember.name,
        role: role || existingMember.role,
        bio: bio !== undefined ? bio : existingMember.bio,
        image: image !== undefined ? image : existingMember.image,
        socialLinks: socialLinks || existingMember.socialLinks,
        order: parsedOrder,
        isActive: isActive !== undefined ? isActive : existingMember.isActive,
        isFounder: isFounder !== undefined ? isFounder : existingMember.isFounder,
        updatedById: req.user.id,
      },
    });
    
    res.json({ success: true, data: updatedMember });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ success: false, message: 'Failed to update member' });
  }
};

// Delete a member (Admin only)
export const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingMember = await prisma.member.findUnique({
      where: { id },
    });
    
    if (!existingMember) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    await prisma.member.delete({
      where: { id },
    });
    
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ success: false, message: 'Failed to delete member' });
  }
};

// Bulk delete members (Admin only)
export const bulkDeleteMembers = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No member IDs provided' 
      });
    }

    // Check if all members exist
    const existingMembers = await prisma.member.findMany({
      where: {
        id: { in: ids },
      },
    });

    if (existingMembers.length !== ids.length) {
      const foundIds = existingMembers.map(m => m.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));
      return res.status(404).json({ 
        success: false, 
        message: `Some members not found: ${missingIds.join(', ')}` 
      });
    }

    // Delete all members
    const result = await prisma.member.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    // Log the bulk deletion
    await prisma.auditLog.create({
      data: {
        action: 'BULK_DELETE',
        entity: 'Member',
        entityId: ids.join(','),
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        changes: JSON.stringify({ deletedCount: result.count, ids }),
      },
    });

    res.json({ 
      success: true, 
      message: `${result.count} members deleted successfully`,
      data: { deletedCount: result.count }
    });
  } catch (error) {
    console.error('Error bulk deleting members:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to bulk delete members' 
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