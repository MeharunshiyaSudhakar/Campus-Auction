/**
 * Shared Image Configuration
 * Single source of truth for image sizing, ratios, and constraints in the client
 */
export const IMAGE_CONFIG = {
  IMAGE_RATIO: 1, // 1:1 Square
  IMAGE_SIZE: 1080, // 1080x1080
  THUMBNAIL_SIZE: 400, // 400x400
  IMAGE_QUALITY: 82,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
  MIN_PHOTOS: 2,
  MAX_PHOTOS: 6,
};

export const IMAGE_RATIO = IMAGE_CONFIG.IMAGE_RATIO;
export const IMAGE_SIZE = IMAGE_CONFIG.IMAGE_SIZE;
export const THUMBNAIL_SIZE = IMAGE_CONFIG.THUMBNAIL_SIZE;
export const MAX_FILE_SIZE_BYTES = IMAGE_CONFIG.MAX_FILE_SIZE_BYTES;
export const MIN_PHOTOS = IMAGE_CONFIG.MIN_PHOTOS;
export const MAX_PHOTOS = IMAGE_CONFIG.MAX_PHOTOS;

/**
 * Get thumbnail URL for a given image URL
 * Replaces .webp with -thumb.webp, or appends -thumb if local /uploads/
 */
export function getThumbnailUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('-thumb.')) return url;
  if (url.endsWith('.webp')) {
    return url.replace(/\.webp$/, '-thumb.webp');
  }
  // If extension is png/jpg/jpeg
  return url.replace(/\.(jpg|jpeg|png)$/i, '-thumb.webp');
}

export default IMAGE_CONFIG;
