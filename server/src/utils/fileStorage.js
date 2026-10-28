const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Disk Storage Engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `${randomName}${ext}`);
  },
});

// File filter: jpeg, png, webp only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

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
    fileSize: 5 * 1024 * 1024, // 5 MB per file
  },
});

/**
 * Storage Helper Service
 * Enables seamless swap to Cloudinary or AWS S3 in future
 */
class FileStorageHelper {
  /**
   * Convert local stored file to a public URL
   */
  static getPublicUrl(filename) {
    return `/uploads/${filename}`;
  }

  /**
   * Delete photo file from storage
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
    }
  }
}

module.exports = {
  upload,
  FileStorageHelper,
  UPLOADS_DIR,
};
