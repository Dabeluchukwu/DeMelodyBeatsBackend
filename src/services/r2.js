import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
  forcePathStyle: true,
});

// Upload file to R2
export const uploadToR2 = async (file, folder = 'shows') => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = file.originalname.split('.').pop();
    const key = `${folder}/${timestamp}_${random}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
    });

    await r2Client.send(command);

    // Construct the public URL using R2_PUBLIC_URL
    let publicUrl;
    if (R2_PUBLIC_URL) {
      // Use the custom public URL
      publicUrl = `${R2_PUBLIC_URL}/${key}`;
    } else {
      // Fallback to the endpoint URL
      publicUrl = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
    }

    console.log('File uploaded to R2:', key);
    console.log('Public URL:', publicUrl);

    return {
      key: key,
      url: publicUrl,
      filename: file.originalname,
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload to R2: ${error.message}`);
  }
};

// Delete file from R2
export const deleteFromR2 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    console.log('File deleted from R2:', key);
    return true;
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error(`Failed to delete from R2: ${error.message}`);
  }
};

// Extract key from URL
export const getKeyFromUrl = (url) => {
  try {
    // If using R2_PUBLIC_URL format
    if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
      return url.replace(`${R2_PUBLIC_URL}/`, '');
    }
    
    // If using endpoint format
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Remove bucket name if present in path
    if (pathParts[1] === R2_BUCKET_NAME) {
      return pathParts.slice(2).join('/');
    }
    return pathParts.slice(1).join('/');
  } catch (error) {
    console.error('Error extracting key from URL:', error);
    return null;
  }
};