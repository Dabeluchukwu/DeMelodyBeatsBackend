import prisma from '../lib/prisma.js';

// Get all shows (public)
export const getAllShows = async (req, res) => {
  try {
    const shows = await prisma.show.findMany({
      orderBy: { date: 'asc' },
    });
    res.json({ success: true, data: shows });
  } catch (error) {
    console.error('Error fetching shows:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shows' });
  }
};

// Get upcoming shows only (public)
export const getUpcomingShows = async (req, res) => {
  try {
    const shows = await prisma.show.findMany({
      where: {
        date: { gte: new Date() },
        isPast: false,
      },
      orderBy: { date: 'asc' },
    });
    res.json({ success: true, data: shows });
  } catch (error) {
    console.error('Error fetching upcoming shows:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming shows' });
  }
};

// Get a single show by ID (public)
export const getShowById = async (req, res) => {
  try {
    const { id } = req.params;
    const show = await prisma.show.findUnique({
      where: { id },
    });
    
    if (!show) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }
    
    res.json({ success: true, data: show });
  } catch (error) {
    console.error('Error fetching show:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch show' });
  }
};

// Create a new show (Admin only)
export const createShow = async (req, res) => {
  try {
    const { 
      title, 
      venue, 
      city, 
      state, 
      country, 
      date, 
      doorsTime, 
      ageRestriction, 
      ticketUrl, 
      posterImage, 
      supportActs 
    } = req.body;
    
    if (!title || !venue || !city || !country || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: title, venue, city, country, date' 
      });
    }
    
    const show = await prisma.show.create({
      data: {
        title,
        venue,
        city,
        state,
        country,
        date: new Date(date),
        doorsTime,
        ageRestriction,
        ticketUrl,
        posterImage,
        supportActs: supportActs || [],
        createdById: req.user.id, // ← Add this
      },
    });
    
    res.status(201).json({ success: true, data: show });
  } catch (error) {
    console.error('Error creating show:', error);
    res.status(500).json({ success: false, message: 'Failed to create show' });
  }
};

// Update a show (Admin only)
export const updateShow = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      venue, 
      city, 
      state, 
      country, 
      date, 
      doorsTime, 
      ageRestriction, 
      ticketUrl, 
      posterImage, 
      supportActs, 
      isPast 
    } = req.body;
    
    const existingShow = await prisma.show.findUnique({
      where: { id },
    });
    
    if (!existingShow) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }
    
    const updatedShow = await prisma.show.update({
      where: { id },
      data: {
        title: title || existingShow.title,
        venue: venue || existingShow.venue,
        city: city || existingShow.city,
        state: state !== undefined ? state : existingShow.state,
        country: country || existingShow.country,
        date: date ? new Date(date) : existingShow.date,
        doorsTime: doorsTime !== undefined ? doorsTime : existingShow.doorsTime,
        ageRestriction: ageRestriction !== undefined ? ageRestriction : existingShow.ageRestriction,
        ticketUrl: ticketUrl !== undefined ? ticketUrl : existingShow.ticketUrl,
        posterImage: posterImage !== undefined ? posterImage : existingShow.posterImage,
        supportActs: supportActs || existingShow.supportActs,
        isPast: isPast !== undefined ? isPast : existingShow.isPast,
        updatedById: req.user.id, // ← Add this - tracks who updated it
      },
    });
    
    res.json({ success: true, data: updatedShow });
  } catch (error) {
    console.error('Error updating show:', error);
    res.status(500).json({ success: false, message: 'Failed to update show' });
  }
};

// Delete a show (Admin only)
export const deleteShow = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingShow = await prisma.show.findUnique({
      where: { id },
    });
    
    if (!existingShow) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }
    
    await prisma.show.delete({
      where: { id },
    });
    
    res.json({ success: true, message: 'Show deleted successfully' });
  } catch (error) {
    console.error('Error deleting show:', error);
    res.status(500).json({ success: false, message: 'Failed to delete show' });
  }
};


// Bulk delete shows (Admin only)
export const bulkDeleteShows = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No show IDs provided' 
      });
    }

    // Check if all shows exist
    const existingShows = await prisma.show.findMany({
      where: {
        id: { in: ids },
      },
    });

    if (existingShows.length !== ids.length) {
      const foundIds = existingShows.map(s => s.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));
      return res.status(404).json({ 
        success: false, 
        message: `Some shows not found: ${missingIds.join(', ')}` 
      });
    }

    // Delete all shows
    const result = await prisma.show.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    // Log the bulk deletion
    await prisma.auditLog.create({
      data: {
        action: 'BULK_DELETE',
        entity: 'Show',
        entityId: ids.join(','),
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        changes: JSON.stringify({ deletedCount: result.count, ids }),
      },
    });

    res.json({ 
      success: true, 
      message: `${result.count} shows deleted successfully`,
      data: { deletedCount: result.count }
    });
  } catch (error) {
    console.error('Error bulk deleting shows:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to bulk delete shows' 
    });
  }
};