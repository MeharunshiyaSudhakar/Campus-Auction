/**
 * Shared Image Configuration
 * Single source of truth for image sizing and processing across the app
 */
const IMAGE_CONFIG = {
  IMAGE_RATIO: 1, // 1:1 Square Aspect Ratio
  IMAGE_SIZE: 1080, // Primary image dimensions: 1080x1080
  THUMBNAIL_SIZE: 400, // List/Card thumbnail dimensions: 400x400
  IMAGE_QUALITY: 82, // WebP compression quality
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB per file
  MIN_PHOTOS: 2,
  MAX_PHOTOS: 6,
};

module.exports = IMAGE_CONFIG;
