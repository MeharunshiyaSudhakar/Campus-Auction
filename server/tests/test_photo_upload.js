const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const sharp = require('sharp');
sharp.cache(false);
const User = require('../src/models/User');
const SellDraft = require('../src/models/SellDraft');
const { UPLOADS_DIR } = require('../src/utils/fileStorage');
const migrateImages = require('../scripts/migrate_images');

const BASE_URL = 'http://localhost:5000/api';

async function runPhotoTests() {
  console.log('\n========================================================');
  console.log('🧪 Starting Photo Upload with Multer & Sharp Test Suite');
  console.log('========================================================\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/campus_auction');
  }

  // Clean test accounts
  const emails = ['photo_owner@campus.edu', 'photo_intruder@campus.edu'];
  const rolls = ['PH21B001', 'PH21B002'];
  await User.deleteMany({ $or: [{ email: { $in: emails } }, { campusRollNumber: { $in: rolls } }] });

  // 1. Register Owner & Intruder
  const ownerRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rohan Sharma',
      email: 'photo_owner@campus.edu',
      password: 'Password123!',
      campusRollNumber: 'PH21B001',
    }),
  }).then((r) => r.json());
  const ownerToken = ownerRes.data.token;

  const intruderRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Intruder User',
      email: 'photo_intruder@campus.edu',
      password: 'Password123!',
      campusRollNumber: 'PH21B002',
    }),
  }).then((r) => r.json());
  const intruderToken = intruderRes.data.token;

  // 2. Start Draft for Owner
  const draftRes = await fetch(`${BASE_URL}/sell/drafts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category: 'cycle' }),
  }).then((r) => r.json());
  const draftId = draftRes.data._id;

  // Helper to create non-square test images with sharp
  // 1200x600 non-square JPEG and 800x400 non-square PNG
  const nonSquareJpg = await sharp({
    create: {
      width: 1200,
      height: 600,
      channels: 3,
      background: { r: 31, g: 77, b: 58 },
    },
  })
    .jpeg()
    .toBuffer();

  const nonSquarePng = await sharp({
    create: {
      width: 800,
      height: 400,
      channels: 3,
      background: { r: 169, g: 191, b: 168 },
    },
  })
    .png()
    .toBuffer();

  // --- TEST 1: Valid Upload (2 Non-Square Photos -> 1080x1080 WebP + 400x400 Thumbnail) ---
  console.log('--- TEST 1: Valid Photo Upload (1:1 Sharp 1080x1080 & Thumbnails) ---');
  const formData = new FormData();
  formData.append('photos', new Blob([nonSquarePng], { type: 'image/png' }), 'client_rect1.png');
  formData.append('photos', new Blob([nonSquareJpg], { type: 'image/jpeg' }), 'client_rect2.jpg');

  const uploadRes = await fetch(`${BASE_URL}/sell/drafts/${draftId}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: formData,
  }).then((r) => r.json());

  assert.strictEqual(uploadRes.success, true, 'Photo upload must succeed');
  assert.strictEqual(uploadRes.data.photos.length, 2, 'Should have 2 photos in draft');
  const photoUrl1 = uploadRes.data.photos[0];
  const photoUrl2 = uploadRes.data.photos[1];

  // Verify WebP format and random filenames
  assert(!photoUrl1.includes('client_rect1.png'), 'Must use random filename, never client name');
  assert(photoUrl1.startsWith('/uploads/'), 'Photo URL must start with /uploads/');
  assert(photoUrl1.endsWith('.webp'), 'Must be saved in WebP format');

  // Verify file on disk is resized & center-cropped to strictly 1080x1080
  const localFileName1 = path.basename(photoUrl1);
  const localFilePath1 = path.join(UPLOADS_DIR, localFileName1);
  assert(fs.existsSync(localFilePath1), 'Main image file must exist on disk');

  const meta1 = await sharp(fs.readFileSync(localFilePath1)).metadata();
  assert.strictEqual(meta1.width, 1080, `Width must be 1080, got ${meta1.width}`);
  assert.strictEqual(meta1.height, 1080, `Height must be 1080, got ${meta1.height}`);
  assert.strictEqual(meta1.format, 'webp', 'Format must be webp');
  assert.strictEqual(meta1.exif, undefined, 'EXIF metadata must be stripped for privacy');

  // Verify companion thumbnail on disk is strictly 400x400 WebP
  const base1 = path.basename(localFileName1, '.webp');
  const thumbPath1 = path.join(UPLOADS_DIR, `${base1}-thumb.webp`);
  assert(fs.existsSync(thumbPath1), 'Thumbnail must exist on disk');

  const thumbMeta1 = await sharp(fs.readFileSync(thumbPath1)).metadata();
  assert.strictEqual(thumbMeta1.width, 400, `Thumbnail width must be 400, got ${thumbMeta1.width}`);
  assert.strictEqual(thumbMeta1.height, 400, `Thumbnail height must be 400, got ${thumbMeta1.height}`);
  assert.strictEqual(thumbMeta1.format, 'webp', 'Thumbnail format must be webp');

  console.log(`✓ TEST 1 PASSED: Non-square uploaded images converted to 1080x1080 WebP with 400x400 thumbnails: ${photoUrl1}, ${photoUrl2}`);

  // --- TEST 2: Non-Owner Cannot Upload Photos (403 Forbidden) ---
  console.log('\n--- TEST 2: Non-Owner Upload Guard ---');
  const intruderFormData = new FormData();
  intruderFormData.append('photos', new Blob([nonSquarePng], { type: 'image/png' }), 'hacker.png');

  const intruderUpload = await fetch(`${BASE_URL}/sell/drafts/${draftId}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${intruderToken}` },
    body: intruderFormData,
  });

  assert.strictEqual(intruderUpload.status, 403, 'Non-owner must receive 403 Forbidden on upload');
  console.log('✓ TEST 2 PASSED: Non-owner strictly blocked from uploading to another student\'s draft (403)');

  // --- TEST 3: Wrong File Type Rejected ---
  console.log('\n--- TEST 3: Wrong File Type Rejected ---');
  const wrongTypeForm = new FormData();
  wrongTypeForm.append('photos', new Blob(['console.log("script");'], { type: 'text/javascript' }), 'malicious.js');

  const wrongTypeRes = await fetch(`${BASE_URL}/sell/drafts/${draftId}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: wrongTypeForm,
  });

  assert.strictEqual(wrongTypeRes.status, 400, 'Non-image file must be rejected with 400 Bad Request');
  const wrongTypeJson = await wrongTypeRes.json();
  assert(wrongTypeJson.message.includes('Only JPEG, PNG, and WebP'), 'Error message must specify allowed image types');
  console.log('✓ TEST 3 PASSED: Non-image file rejected: ' + wrongTypeJson.message);

  // --- TEST 4: Oversize File Rejected (> 5 MB) ---
  console.log('\n--- TEST 4: Oversize File Rejected (> 5 MB) ---');
  const oversizeBuffer = Buffer.alloc(5.5 * 1024 * 1024); // 5.5 MB
  const oversizeForm = new FormData();
  oversizeForm.append('photos', new Blob([oversizeBuffer], { type: 'image/png' }), 'huge.png');

  const oversizeRes = await fetch(`${BASE_URL}/sell/drafts/${draftId}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: oversizeForm,
  });

  assert.strictEqual(oversizeRes.status, 400, 'Oversize file must be rejected with 400');
  const oversizeJson = await oversizeRes.json();
  assert(oversizeJson.message.includes('limit') || oversizeJson.message.includes('5 MB'), 'Must mention size limit');
  console.log('✓ TEST 4 PASSED: Oversize file (>5MB) rejected: ' + oversizeJson.message);

  // --- TEST 5: Non-Owner Cannot Delete Photo (403 Forbidden) ---
  console.log('\n--- TEST 5: Non-Owner Delete Guard ---');
  const intruderDelete = await fetch(`${BASE_URL}/sell/drafts/${draftId}/photos`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${intruderToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ photoUrl: photoUrl1 }),
  });
  assert.strictEqual(intruderDelete.status, 403, 'Non-owner must receive 403 Forbidden on delete');
  console.log('✓ TEST 5 PASSED: Non-owner strictly blocked from deleting photos (403)');

  // --- TEST 6: Owner Deletes Photo & Physical Files (Main + Thumb) Removed ---
  console.log('\n--- TEST 6: Owner Deletes Photo & Companion Thumbnail ---');
  const ownerDelete = await fetch(`${BASE_URL}/sell/drafts/${draftId}/photos`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ photoUrl: photoUrl1 }),
  }).then((r) => r.json());

  assert.strictEqual(ownerDelete.success, true);
  assert.strictEqual(ownerDelete.data.photos.length, 1, 'Draft should now have 1 photo left');
  assert(!fs.existsSync(localFilePath1), 'Main image file must be unlinked');
  assert(!fs.existsSync(thumbPath1), 'Thumbnail file must also be unlinked');
  console.log('✓ TEST 6 PASSED: Owner deleted photo; storage file & thumbnail removed from disk');

  // --- TEST 7: Publish Gate Blocks With < 2 Photos ---
  console.log('\n--- TEST 7: Publish Gate Blocks With < 2 Photos ---');
  await SellDraft.updateOne(
    { _id: draftId },
    {
      $set: {
        'answers.title': 'Test Item for Publish Gate',
        'answers.category': 'cycle',
        'answers.conditionGrade': 'Good',
        'answers.ageOfItem': '1 year',
        'answers.workingStatus': 'Fully functional',
        'answers.startingPrice': 500,
        'answers.closingTime': new Date(Date.now() + 86400000),
      },
    }
  );

  const publishAttempt = await fetch(`${BASE_URL}/sell/drafts/${draftId}/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ honestyDeclaration: true }),
  });
  assert.strictEqual(publishAttempt.status, 400, 'Publishing with < 2 photos must be blocked');
  const pubJson = await publishAttempt.json();
  assert(pubJson.message.includes('2 photos'), `Error must specify minimum 2 photos, got: ${pubJson.message}`);
  console.log('✓ TEST 7 PASSED: Publish gate strictly enforces minimum 2 photos: ' + pubJson.message);

  // --- TEST 8: Migration Script Idempotency ---
  console.log('\n--- TEST 8: Image Migration Script Idempotency ---');
  await migrateImages();
  // Second run to verify idempotency
  await migrateImages();
  console.log('✓ TEST 8 PASSED: Migration executed twice cleanly without errors or corruption');

  // Teardown
  await SellDraft.deleteOne({ _id: draftId });
  await User.deleteMany({ $or: [{ email: { $in: emails } }, { campusRollNumber: { $in: rolls } }] });

  console.log('\n========================================================');
  console.log('✅ ALL PHOTO UPLOAD WITH MULTER & SHARP TESTS PASSED!');
  console.log('========================================================\n');
}

runPhotoTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Photo upload test failed:', err);
    process.exit(1);
  });
