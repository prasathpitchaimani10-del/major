import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const isCloudinaryConfigured = Boolean(
  cloudName &&
    apiKey &&
    apiSecret &&
    cloudName !== 'your_cloud_name' &&
    apiKey !== 'your_cloudinary_api_key'
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export interface UploadedMediaResult {
  url: string;
  publicId: string;
  resourceType: 'image' | 'video';
  format: string;
}

export const uploadToCloudinary = async (
  fileSource: string,
  folder = 'krono_products',
  resourceType: 'image' | 'video' = 'image'
): Promise<UploadedMediaResult> => {
  if (isCloudinaryConfigured) {
    const result = await cloudinary.uploader.upload(fileSource, {
      folder,
      resource_type: resourceType,
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType,
      format: result.format || 'jpg',
    };
  }

  // Fallback for local sandbox without live Cloudinary credentials
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return {
    url: fileSource,
    publicId: `${folder}/media_${timestamp}_${randomSuffix}`,
    resourceType,
    format: resourceType === 'video' ? 'mp4' : 'jpg',
  };
};

export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<boolean> => {
  if (!publicId) return false;
  if (isCloudinaryConfigured) {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return true;
  }
  return true;
};

export default cloudinary;
