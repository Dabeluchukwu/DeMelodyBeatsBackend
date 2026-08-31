import prisma from '../lib/prisma.js';
import { uploadToR2, deleteFromR2, getKeyFromUrl } from '../services/r2.js';

// ===== PHOTO CONTROLLERS =====

// Get all photos
export const getAllPhotos = async (req, res) => {
  try {
    const photos = await prisma.photo.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
    });
    res.json({ success: true, data: photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch photos' });
  }
};

// Create a photo (Admin only)
export const createPhoto = async (req, res) => {
  try {
    const { title, description, imageUrl, thumbnail, category, date, order, isPublished } = req.body;
    
    if (!title || !imageUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and imageUrl are required' 
      });
    }
    
    const photo = await prisma.photo.create({
      data: {
        title,
        description,
        imageUrl,
        thumbnail,
        category,
        date: date ? new Date(date) : new Date(),
        order: order || 0,
        isPublished: isPublished !== undefined ? isPublished : true,
        createdById: req.user.id,
      },
    });
    
    res.status(201).json({ success: true, data: photo });
  } catch (error) {
    console.error('Error creating photo:', error);
    res.status(500).json({ success: false, message: 'Failed to create photo' });
  }
};

// Delete a photo (Admin only)
export const deletePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingPhoto = await prisma.photo.findUnique({
      where: { id },
    });
    
    if (!existingPhoto) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    
    // Delete from R2 if image exists
    if (existingPhoto.imageUrl) {
      const key = getKeyFromUrl(existingPhoto.imageUrl);
      if (key) {
        try {
          await deleteFromR2(key);
        } catch (r2Error) {
          console.error('Failed to delete from R2:', r2Error);
          // Continue with database deletion even if R2 delete fails
        }
      }
    }
    
    await prisma.photo.delete({
      where: { id },
    });
    
    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ success: false, message: 'Failed to delete photo' });
  }
};

// Bulk delete photos (Admin only)
export const bulkDeletePhotos = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No photo IDs provided' 
      });
    }

    // Check if all photos exist
    const existingPhotos = await prisma.photo.findMany({
      where: {
        id: { in: ids },
      },
    });

    if (existingPhotos.length !== ids.length) {
      const foundIds = existingPhotos.map(p => p.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));
      return res.status(404).json({ 
        success: false, 
        message: `Some photos not found: ${missingIds.join(', ')}` 
      });
    }

    // Delete images from R2
    for (const photo of existingPhotos) {
      if (photo.imageUrl) {
        const key = getKeyFromUrl(photo.imageUrl);
        if (key) {
          try {
            await deleteFromR2(key);
          } catch (r2Error) {
            console.error('Failed to delete from R2:', r2Error);
          }
        }
      }
    }

    // Delete all photos
    const result = await prisma.photo.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    // Log the bulk deletion
    await prisma.auditLog.create({
      data: {
        action: 'BULK_DELETE',
        entity: 'Photo',
        entityId: ids.join(','),
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        changes: JSON.stringify({ deletedCount: result.count, ids }),
      },
    });

    res.json({ 
      success: true, 
      message: `${result.count} photos deleted successfully`,
      data: { deletedCount: result.count }
    });
  } catch (error) {
    console.error('Error bulk deleting photos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to bulk delete photos' 
    });
  }
};

// ===== R2 IMAGE UPLOAD CONTROLLER =====

// Upload image to R2 (Admin only)
export const uploadImage = async (req, res) => {
  try {
    console.log('Upload request received');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.' 
      });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        success: false, 
        message: 'File size must be less than 5MB' 
      });
    }

    // Upload to R2
    const result = await uploadToR2(req.file, 'shows');

    console.log('Upload successful:', result);

    res.json({ 
      success: true, 
      data: { 
        url: result.url,
        key: result.key,
        filename: result.filename,
      } 
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to upload image',
    });
  }
};

// Delete image from R2 (Admin only)
export const deleteImage = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'Image URL is required' 
      });
    }

    const key = getKeyFromUrl(url);
    if (!key) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid image URL' 
      });
    }

    await deleteFromR2(key);

    res.json({ 
      success: true, 
      message: 'Image deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete image',
    });
  }
};

// ===== VIDEO CONTROLLERS =====

// Get all videos
export const getAllVideos = async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
    });
    res.json({ success: true, data: videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch videos' });
  }
};

// Create a video (Admin only)
export const createVideo = async (req, res) => {
  try {
    const { title, description, videoId, thumbnail, category, date, order, isPublished } = req.body;
    
    if (!title || !videoId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and videoId are required' 
      });
    }
    
    const video = await prisma.video.create({
      data: {
        title,
        description,
        videoId,
        thumbnail,
        category,
        date: date ? new Date(date) : new Date(),
        order: order || 0,
        isPublished: isPublished !== undefined ? isPublished : true,
        createdById: req.user.id,
      },
    });
    
    res.status(201).json({ success: true, data: video });
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ success: false, message: 'Failed to create video' });
  }
};

// Delete a video (Admin only)
export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingVideo = await prisma.video.findUnique({
      where: { id },
    });
    
    if (!existingVideo) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    
    // Delete thumbnail from R2 if it exists
    if (existingVideo.thumbnail) {
      const key = getKeyFromUrl(existingVideo.thumbnail);
      if (key) {
        try {
          await deleteFromR2(key);
        } catch (r2Error) {
          console.error('Failed to delete thumbnail from R2:', r2Error);
        }
      }
    }
    
    await prisma.video.delete({
      where: { id },
    });
    
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ success: false, message: 'Failed to delete video' });
  }
};

// Bulk delete videos (Admin only)
export const bulkDeleteVideos = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No video IDs provided' 
      });
    }

    // Check if all videos exist
    const existingVideos = await prisma.video.findMany({
      where: {
        id: { in: ids },
      },
    });

    if (existingVideos.length !== ids.length) {
      const foundIds = existingVideos.map(v => v.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));
      return res.status(404).json({ 
        success: false, 
        message: `Some videos not found: ${missingIds.join(', ')}` 
      });
    }

    // Delete thumbnails from R2 if they exist
    for (const video of existingVideos) {
      if (video.thumbnail) {
        const key = getKeyFromUrl(video.thumbnail);
        if (key) {
          try {
            await deleteFromR2(key);
          } catch (r2Error) {
            console.error('Failed to delete thumbnail from R2:', r2Error);
          }
        }
      }
    }

    // Delete all videos
    const result = await prisma.video.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    // Log the bulk deletion
    await prisma.auditLog.create({
      data: {
        action: 'BULK_DELETE',
        entity: 'Video',
        entityId: ids.join(','),
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        changes: JSON.stringify({ deletedCount: result.count, ids }),
      },
    });

    res.json({ 
      success: true, 
      message: `${result.count} videos deleted successfully`,
      data: { deletedCount: result.count }
    });
  } catch (error) {
    console.error('Error bulk deleting videos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to bulk delete videos' 
    });
  }
};