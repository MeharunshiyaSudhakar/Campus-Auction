require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const sharp = require('sharp');
sharp.cache(false);
const IMAGE_CONFIG = require('../src/config/imageConfig');
const { UPLOADS_DIR } = require('../src/utils/fileStorage');
const Listing = require('../src/models/Listing');
const SellDraft = require('../src/models/SellDraft');

/**
 * Migration Script: Reprocess all existing photos to uniform 1:1 square ratio (1080x1080)
 * Generates 400x400 square thumbnails, strips metadata, converts to WebP, and updates database records.
 * 
 * Idempotent: safe to run multiple times without duplicating or corrupting data.
 */
async function migrateImages() {
  console.log('========================================================');
  console.log('🔄 Starting Image Migration: 1:1 Square Pipeline');
  console.log('========================================================\n');

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(`[Migration] Uploads dir does not exist at ${UPLOADS_DIR}. Creating...`);
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // 1. Process files in UPLOADS_DIR
  const files = fs.readdirSync(UPLOADS_DIR);
  console.log(`[Migration] Scanning ${files.length} files in ${UPLOADS_DIR}...`);

  let processedCount = 0;
  let skippedCount = 0;
  const urlMap = {}; // oldUrl -> newUrl

  for (const file of files) {
    // Skip existing companion thumbnails
    if (file.includes('-thumb.')) continue;

    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;

    const baseName = path.basename(file, ext);
    const originalPath = path.join(UPLOADS_DIR, file);
    const targetMainFilename = `${baseName}.webp`;
    const targetThumbFilename = `${baseName}-thumb.webp`;
    const targetMainPath = path.join(UPLOADS_DIR, targetMainFilename);
    const targetThumbPath = path.join(UPLOADS_DIR, targetThumbFilename);

    try {
      const metadata = await sharp(originalPath).metadata();

      // Check if already 1080x1080 webp with companion thumbnail (idempotency check)
      const isAlreadyTargetSpec =
        ext === '.webp' &&
        metadata.width === IMAGE_CONFIG.IMAGE_SIZE &&
        metadata.height === IMAGE_CONFIG.IMAGE_SIZE &&
        fs.existsSync(targetThumbPath);

      if (isAlreadyTargetSpec) {
        skippedCount++;
        urlMap[`/uploads/${file}`] = `/uploads/${targetMainFilename}`;
        continue;
      }

      console.log(`[Migration] Reprocessing ${file} (${metadata.width}x${metadata.height}) -> 1080x1080 1:1 webp...`);

      // Read source image buffer
      const buffer = fs.readFileSync(originalPath);

      // Temporary paths to allow safe in-place replacement
      const tempMainPath = path.join(UPLOADS_DIR, `temp_${targetMainFilename}`);
      const tempThumbPath = path.join(UPLOADS_DIR, `temp_${targetThumbFilename}`);

      // 1. Full 1080x1080
      await sharp(buffer)
        .rotate()
        .resize(IMAGE_CONFIG.IMAGE_SIZE, IMAGE_CONFIG.IMAGE_SIZE, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: IMAGE_CONFIG.IMAGE_QUALITY })
        .toFile(tempMainPath);

      // 2. 400x400 Thumbnail
      await sharp(buffer)
        .rotate()
        .resize(IMAGE_CONFIG.THUMBNAIL_SIZE, IMAGE_CONFIG.THUMBNAIL_SIZE, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: IMAGE_CONFIG.IMAGE_QUALITY })
        .toFile(tempThumbPath);

      // Remove old file if it had a different extension
      if (ext !== '.webp' && fs.existsSync(originalPath)) {
        try { fs.unlinkSync(originalPath); } catch {}
      }

      // Rename temp files to target paths
      if (fs.existsSync(targetMainPath)) {
        try { fs.unlinkSync(targetMainPath); } catch {}
      }
      fs.renameSync(tempMainPath, targetMainPath);

      if (fs.existsSync(targetThumbPath)) {
        try { fs.unlinkSync(targetThumbPath); } catch {}
      }
      fs.renameSync(tempThumbPath, targetThumbPath);

      urlMap[`/uploads/${file}`] = `/uploads/${targetMainFilename}`;
      processedCount++;
    } catch (fileErr) {
      console.warn(`[Migration] Warning processing ${file}: ${fileErr.message}`);
    }
  }

  console.log(`\n[Migration] File processing complete: ${processedCount} reprocessed, ${skippedCount} already 1:1 square.\n`);

  // 2. Update Database Records
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_auction';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log('[Migration] Connected to MongoDB for URL reference updates.');
    }

    // A. Update Listings
    const listings = await Listing.find({});
    let updatedListings = 0;

    for (const listing of listings) {
      let changed = false;
      const newPhotos = [];
      const newThumbs = [];

      for (const p of listing.photos || []) {
        let finalP = p;
        if (p.startsWith('/uploads/')) {
          const mapped = urlMap[p] || (p.endsWith('.webp') ? p : p.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
          finalP = mapped;
        }
        newPhotos.push(finalP);

        // Generate matching thumbnail URL
        if (finalP.startsWith('/uploads/')) {
          const base = finalP.replace(/\.webp$/, '');
          newThumbs.push(`${base}-thumb.webp`);
        } else {
          newThumbs.push(finalP);
        }
      }

      if (JSON.stringify(newPhotos) !== JSON.stringify(listing.photos) || !listing.photoThumbnails?.length) {
        listing.photos = newPhotos;
        listing.photoThumbnails = newThumbs;
        await listing.save();
        updatedListings++;
        changed = true;
      }
    }

    // B. Update Drafts
    const drafts = await SellDraft.find({});
    let updatedDrafts = 0;

    for (const draft of drafts) {
      if (draft.answers?.photos && Array.isArray(draft.answers.photos)) {
        const newDraftPhotos = [];
        const newDraftThumbs = [];

        for (const p of draft.answers.photos) {
          let finalP = p;
          if (p.startsWith('/uploads/')) {
            const mapped = urlMap[p] || (p.endsWith('.webp') ? p : p.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
            finalP = mapped;
          }
          newDraftPhotos.push(finalP);
          if (finalP.startsWith('/uploads/')) {
            const base = finalP.replace(/\.webp$/, '');
            newDraftThumbs.push(`${base}-thumb.webp`);
          } else {
            newDraftThumbs.push(finalP);
          }
        }

        draft.answers.photos = newDraftPhotos;
        draft.answers.photoThumbnails = newDraftThumbs;
        draft.markModified('answers');
        await draft.save();
        updatedDrafts++;
      }
    }

    console.log(`[Migration] Database updated: ${updatedListings} listings, ${updatedDrafts} drafts.`);
  } catch (dbErr) {
    console.warn(`[Migration] Note: MongoDB update skipped or encountered error: ${dbErr.message}`);
  }

  console.log('\n========================================================');
  console.log('✅ Image Migration Completed Successfully');
  console.log('========================================================\n');
}

if (require.main === module) {
  migrateImages()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}

module.exports = migrateImages;
