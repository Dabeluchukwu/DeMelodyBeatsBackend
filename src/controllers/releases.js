import prisma from '../lib/prisma.js';

// Get all releases (public)
export const getAllReleases = async (req, res) => {
  try {
    const releases = await prisma.release.findMany({
      include: {
        songs: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { releaseDate: 'desc' },
    });
    res.json({ success: true, data: releases });
  } catch (error) {
    console.error('Error fetching releases:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch releases' });
  }
};

// Get featured release (public)
export const getFeaturedRelease = async (req, res) => {
  try {
    const release = await prisma.release.findFirst({
      where: { isFeatured: true },
      include: {
        songs: {
          orderBy: { order: 'asc' },
        },
      },
    });
    res.json({ success: true, data: release });
  } catch (error) {
    console.error('Error fetching featured release:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch featured release' });
  }
};

// Get a single release by ID (public)
export const getReleaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const release = await prisma.release.findUnique({
      where: { id },
      include: {
        songs: {
          orderBy: { order: 'asc' },
        },
      },
    });
    
    if (!release) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }
    
    res.json({ success: true, data: release });
  } catch (error) {
    console.error('Error fetching release:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch release' });
  }
};

// Create a new release (Admin only)
export const createRelease = async (req, res) => {
  try {
    const { 
      title, 
      type, 
      releaseDate, 
      coverArt, 
      description, 
      tracklist, 
      spotifyUrl, 
      appleMusicUrl, 
      bandcampUrl, 
      youtubeUrl, 
      purchaseUrl, 
      isFeatured,
      songs 
    } = req.body;
    
    if (!title || !type || !releaseDate || !coverArt) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: title, type, releaseDate, coverArt' 
      });
    }
    
    const release = await prisma.release.create({
      data: {
        title,
        type,
        releaseDate: new Date(releaseDate),
        coverArt,
        description,
        tracklist: tracklist || [],
        spotifyUrl,
        appleMusicUrl,
        bandcampUrl,
        youtubeUrl,
        purchaseUrl,
        isFeatured: isFeatured || false,
        createdById: req.user.id, // ← Add this
        songs: {
          create: songs || [],
        },
      },
      include: {
        songs: true,
      },
    });
    
    res.status(201).json({ success: true, data: release });
  } catch (error) {
    console.error('Error creating release:', error);
    res.status(500).json({ success: false, message: 'Failed to create release' });
  }
};

// Update a release (Admin only)
export const updateRelease = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      type, 
      releaseDate, 
      coverArt, 
      description, 
      tracklist, 
      spotifyUrl, 
      appleMusicUrl, 
      bandcampUrl, 
      youtubeUrl, 
      purchaseUrl, 
      isFeatured 
    } = req.body;
    
    const existingRelease = await prisma.release.findUnique({
      where: { id },
    });
    
    if (!existingRelease) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }
    
    const updatedRelease = await prisma.release.update({
      where: { id },
      data: {
        title: title || existingRelease.title,
        type: type || existingRelease.type,
        releaseDate: releaseDate ? new Date(releaseDate) : existingRelease.releaseDate,
        coverArt: coverArt || existingRelease.coverArt,
        description: description !== undefined ? description : existingRelease.description,
        tracklist: tracklist || existingRelease.tracklist,
        spotifyUrl: spotifyUrl !== undefined ? spotifyUrl : existingRelease.spotifyUrl,
        appleMusicUrl: appleMusicUrl !== undefined ? appleMusicUrl : existingRelease.appleMusicUrl,
        bandcampUrl: bandcampUrl !== undefined ? bandcampUrl : existingRelease.bandcampUrl,
        youtubeUrl: youtubeUrl !== undefined ? youtubeUrl : existingRelease.youtubeUrl,
        purchaseUrl: purchaseUrl !== undefined ? purchaseUrl : existingRelease.purchaseUrl,
        isFeatured: isFeatured !== undefined ? isFeatured : existingRelease.isFeatured,
        updatedById: req.user.id, // ← Add this
      },
      include: {
        songs: true,
      },
    });
    
    res.json({ success: true, data: updatedRelease });
  } catch (error) {
    console.error('Error updating release:', error);
    res.status(500).json({ success: false, message: 'Failed to update release' });
  }
};

// Delete a release (Admin only)
export const deleteRelease = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingRelease = await prisma.release.findUnique({
      where: { id },
      include: {
        songs: true,
      },
    });
    
    if (!existingRelease) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }
    
    // Delete associated songs first
    await prisma.song.deleteMany({
      where: { releaseId: id },
    });
    
    // Then delete the release
    await prisma.release.delete({
      where: { id },
    });
    
    res.json({ success: true, message: 'Release deleted successfully' });
  } catch (error) {
    console.error('Error deleting release:', error);
    res.status(500).json({ success: false, message: 'Failed to delete release' });
  }
};

// Bulk delete releases (Admin only)
export const bulkDeleteReleases = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No release IDs provided' 
      });
    }

    // Check if all releases exist
    const existingReleases = await prisma.release.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        songs: true,
      },
    });

    if (existingReleases.length !== ids.length) {
      const foundIds = existingReleases.map(r => r.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));
      return res.status(404).json({ 
        success: false, 
        message: `Some releases not found: ${missingIds.join(', ')}` 
      });
    }

    // Delete all songs for these releases first
    for (const release of existingReleases) {
      if (release.songs && release.songs.length > 0) {
        await prisma.song.deleteMany({
          where: {
            releaseId: release.id,
          },
        });
      }
    }

    // Delete all releases
    const result = await prisma.release.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    // Log the bulk deletion
    await prisma.auditLog.create({
      data: {
        action: 'BULK_DELETE',
        entity: 'Release',
        entityId: ids.join(','),
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        changes: JSON.stringify({ deletedCount: result.count, ids }),
      },
    });

    res.json({ 
      success: true, 
      message: `${result.count} releases deleted successfully`,
      data: { deletedCount: result.count }
    });
  } catch (error) {
    console.error('Error bulk deleting releases:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to bulk delete releases' 
    });
  }
};


// Add a song to a release (Admin only)
export const addSong = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, duration, lyrics, isExplicit, order } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required field: title' 
      });
    }
    
    const release = await prisma.release.findUnique({
      where: { id },
    });
    
    if (!release) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }
    
    const song = await prisma.song.create({
      data: {
        title,
        duration,
        lyrics,
        isExplicit: isExplicit || false,
        order: order || 0,
        releaseId: id,
      },
    });
    
    res.status(201).json({ success: true, data: song });
  } catch (error) {
    console.error('Error adding song:', error);
    res.status(500).json({ success: false, message: 'Failed to add song' });
  }
};

// Update a song (Admin only)
export const updateSong = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, duration, lyrics, isExplicit, order } = req.body;
    
    const existingSong = await prisma.song.findUnique({
      where: { id },
    });
    
    if (!existingSong) {
      return res.status(404).json({ success: false, message: 'Song not found' });
    }
    
    const updatedSong = await prisma.song.update({
      where: { id },
      data: {
        title: title || existingSong.title,
        duration: duration !== undefined ? duration : existingSong.duration,
        lyrics: lyrics !== undefined ? lyrics : existingSong.lyrics,
        isExplicit: isExplicit !== undefined ? isExplicit : existingSong.isExplicit,
        order: order !== undefined ? order : existingSong.order,
      },
    });
    
    res.json({ success: true, data: updatedSong });
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ success: false, message: 'Failed to update song' });
  }
};

// Delete a song (Admin only)
export const deleteSong = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingSong = await prisma.song.findUnique({
      where: { id },
    });
    
    if (!existingSong) {
      return res.status(404).json({ success: false, message: 'Song not found' });
    }
    
    await prisma.song.delete({
      where: { id },
    });
    
    res.json({ success: true, message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ success: false, message: 'Failed to delete song' });
  }
};