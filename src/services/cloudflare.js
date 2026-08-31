import axios from 'axios';
import FormData from 'form-data';

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

export const uploadToCloudflare = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          ...formData.getHeaders(),
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.errors?.[0]?.message || 'Cloudflare upload failed');
    }

    const result = response.data.result;
    const imageId = result.id;
    const variants = result.variants || [];

    // Get the public URL (use the first variant or construct it)
    const url = variants.find(v => v.includes('public')) || variants[0] || 
                `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_ID}/${imageId}`;

    return {
      id: imageId,
      url: url,
      filename: result.filename,
      uploadedAt: result.uploaded,
    };
  } catch (error) {
    console.error('Cloudflare upload error:', error);
    throw error;
  }
};