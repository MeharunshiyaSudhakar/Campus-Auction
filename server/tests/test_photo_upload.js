const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const SellDraft = require('../src/models/SellDraft');
const { UPLOADS_DIR } = require('../src/utils/fileStorage');

const BASE_URL = 'http://localhost:5000/api';

async function runPhotoTests() {
  console.log('\n========================================================');
  console.log('🧪 Starting Photo Upload with Multer Test Suite');
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
  const ownerId = ownerRes.data.user._id;

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

  // Helper to create small valid dummy image buffers (1x1 PNG and JPEG)
  const dummyPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d420000000049454e44ae426082', 'hex');
  const dummyJpg = Buffer.from('ffd8ffe000104a46494600010101004800480000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffda000c03010002110311003f00bf00ffd9', 'hex');

  // --- TEST 1: Valid Upload (2 Photos) ---
  console.log('--- TEST 1: Valid Photo Upload (multipart/form-data) ---');
  const formData = new FormData();
  formData.append('photos', new Blob([dummyPng], { type: 'image/png' }), 'client_photo1.png');
  formData.append('photos', new Blob([dummyJpg], { type: 'image/jpeg' }), 'client_photo2.jpg');

  const uploadRes = await fetch(`${BASE_URL}/sell/drafts/${draftId}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: formData,
  }).then((r) => r.json());

  assert.strictEqual(uploadRes.success, true, 'Photo upload must succeed');
  assert.strictEqual(uploadRes.data.photos.length, 2, 'Should have 2 photos in draft');
  const photoUrl1 = uploadRes.data.photos[0];
  const photoUrl2 = uploadRes.data.photos[1];

  // Verify random filenames (client filename must NOT be used directly)
  assert(!photoUrl1.includes('client_photo1.png'), 'Must use random filename, never client name');
  assert(photoUrl1.startsWith('/uploads/'), 'Photo URL must start with /uploads/');
  console.log(`✓ TEST 1 PASSED: Uploaded 2 photos with random filenames: ${photoUrl1}, ${photoUrl2}`);

  // --- TEST 2: Non-Owner Cannot Upload Photos (403 Forbidden) ---
  console.log('\n--- TEST 2: Non-Owner Upload Guard ---');
  const intruderFormData = new FormData();
  intruderFormData.append('photos', new Blob([dummyPng], { type: 'image/png' }), 'hacker.png');

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

  // --- TEST 6: Owner Deletes Photo & Physical File Removed ---
  console.log('\n--- TEST 6: Owner Deletes Photo ---');
  const localFileName = path.basename(photoUrl1);
  const localFilePath = path.join(UPLOADS_DIR, localFileName);

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
  assert(!fs.existsSync(localFilePath), 'Physical file on disk must be unlinked');
  console.log('✓ TEST 6 PASSED: Owner deleted photo; storage file removed from disk');

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

  // Teardown
  await SellDraft.deleteOne({ _id: draftId });
  await User.deleteMany({ $or: [{ email: { $in: emails } }, { campusRollNumber: { $in: rolls } }] });

  console.log('\n========================================================');
  console.log('✅ ALL PHOTO UPLOAD WITH MULTER TESTS PASSED!');
  console.log('========================================================\n');
}

runPhotoTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Photo upload test failed:', err);
    process.exit(1);
  });
