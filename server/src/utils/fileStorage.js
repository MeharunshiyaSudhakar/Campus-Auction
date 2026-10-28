const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
sharp.cache(false); // Disable sharp internal file cache to prevent Windows EBUSY file locks
const IMAGE_CONFIG = require('../config/imageConfig');

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Memory storage for fast processing with Sharp before writing to disk
const storage = multer.memoryStorage();

// File filter: jpeg, png, webp only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = IMAGE_CONFIG.ALLOWED_MIME_TYPES;
  const allowedExts = IMAGE_CONFIG.ALLOWED_EXTENSIONS;

  const ext = path.extname(file.originalname).toLowerCase();
  const mimeValid = allowedMimeTypes.includes(file.mimetype);
  const extValid = allowedExts.includes(ext);

  if (mimeValid && extValid) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    error.statusCode = 400;
    cb(error, false);
  }
};

// Multer instance with 5MB limit per file, up to 6 photos
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: IMAGE_CONFIG.MAX_FILE_SIZE_BYTES, // 5 MB per file
  },
});

/**
 * Storage Helper Service
 * Manages sharp processing, auto-rotation, 1:1 square crop, webp conversion & thumbnails
 */
class FileStorageHelper {
  /**
   * Convert local stored file to a public URL
   */
  static getPublicUrl(filename) {
    return `/uploads/${filename}`;
  }

  /**
   * Process an image buffer or file through Sharp:
   * 1. Auto-rotate based on EXIF orientation (.rotate())
   * 2. Resize and center-crop to 1080x1080 with fit 'cover'
   * 3. Strip EXIF metadata for privacy (GPS, camera info)
   * 4. Save as WebP at quality 82
   * 5. Generate 400x400 square thumbnail as WebP
   * 
   * @param {Buffer|string} input - Image buffer or disk path
   * @returns {Promise<{filename: string, thumbFilename: string, url: string, thumbnailUrl: string}>}
   */
  static async processImage(input) {
    const randomName = crypto.randomBytes(16).toString('hex');
    const mainFilename = `${randomName}.webp`;
    const thumbFilename = `${randomName}-thumb.webp`;
    const mainFilePath = path.join(UPLOADS_DIR, mainFilename);
    const thumbFilePath = path.join(UPLOADS_DIR, thumbFilename);

    // 1. Process 1080x1080 Main Image
    // Note: Sharp strips all metadata by default unless .withMetadata() is explicitly invoked.
    await sharp(input)
      .rotate() // Auto-orient based on EXIF
      .resize(IMAGE_CONFIG.IMAGE_SIZE, IMAGE_CONFIG.IMAGE_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: IMAGE_CONFIG.IMAGE_QUALITY })
      .toFile(mainFilePath);

    // 2. Process 400x400 Thumbnail
    await sharp(input)
      .rotate() // Auto-orient based on EXIF
      .resize(IMAGE_CONFIG.THUMBNAIL_SIZE, IMAGE_CONFIG.THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: IMAGE_CONFIG.IMAGE_QUALITY })
      .toFile(thumbFilePath);

    return {
      filename: mainFilename,
      thumbFilename,
      url: `/uploads/${mainFilename}`,
      thumbnailUrl: `/uploads/${thumbFilename}`,
    };
  }

  /**
   * Process all uploaded multer files
   * @param {Array} files - Multer req.files array
   */
  static async processUploadedFiles(files) {
    const results = [];
    for (const file of files) {
      const input = file.buffer || (file.path && fs.existsSync(file.path) ? file.path : null);
      if (!input) {
        throw new Error('Could not access uploaded image data');
      }

      const processed = await this.processImage(input);
      file.processedUrl = processed.url;
      file.filename = processed.filename; // Provide filename for legacy compatibility
      results.push(processed);

      // Clean up temporary disk file if disk storage was used
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch {}
      }
    }
    return results;
  }

  /**
   * Delete photo file and its thumbnail from storage
   */
  static deleteFile(photoUrl) {
    if (!photoUrl || typeof photoUrl !== 'string') return;

    // Only delete local /uploads/ files
    if (photoUrl.startsWith('/uploads/')) {
      const filename = path.basename(photoUrl);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn(`[FileStorage] Could not delete file ${filePath}: ${err.message}`);
        }
      }

      // Also delete companion thumbnail if this was the main file
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      if (!base.endsWith('-thumb')) {
        const thumbPath = path.join(UPLOADS_DIR, `${base}-thumb.webp`);
        if (fs.existsSync(thumbPath)) {
          try {
            fs.unlinkSync(thumbPath);
          } catch {}
        }
      }
    }
  }
}

module.exports = {
  upload,
  FileStorageHelper,
  UPLOADS_DIR,
};
