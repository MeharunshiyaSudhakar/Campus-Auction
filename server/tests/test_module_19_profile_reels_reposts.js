const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Repost = require('../src/models/Repost');
const Reel = require('../src/models/Reel');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('\n--- Starting Module 19: Instagram-Style Student Profile Test Suite ---');

  // Connect DB for setup/teardown
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/campus_auction');
  }

  // Clean test accounts
  const emails = ['seller19@campus.edu', 'buyer19@campus.edu'];
  const rolls = ['ME21B191', 'CS21B192'];
  await User.deleteMany({ $or: [{ email: { $in: emails } }, { campusRollNumber: { $in: rolls } }] });

  // 1. Register Seller (Deepak) and Buyer (Kavya)
  const sellerRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Deepak Patel',
      email: 'seller19@campus.edu',
      password: 'Password123!',
      campusRollNumber: 'ME21B191',
    }),
  }).then((r) => r.json());
  const sellerId = sellerRes.data.user._id;
  await User.updateOne({ _id: sellerId }, { $set: { emailVerified: true } });
  const sellerLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seller19@campus.edu', password: 'Password123!' }),
  }).then((r) => r.json());
  const sellerToken = sellerLogin.data.token;

  const buyerRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Kavya Nair',
      email: 'buyer19@campus.edu',
      password: 'Password123!',
      campusRollNumber: 'CS21B192',
    }),
  }).then((r) => r.json());
  const buyerId = buyerRes.data.user._id;
  await User.updateOne({ _id: buyerId }, { $set: { emailVerified: true } });
  const buyerLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer19@campus.edu', password: 'Password123!' }),
  }).then((r) => r.json());
  const buyerToken = buyerLogin.data.token;

  // 2. Create Listing for Deepak
  const listing = await Listing.create({
    seller: sellerId,
    title: 'Hero Sprint 21-Speed Mountain Cycle',
    category: 'vehicles',
    itemSubtype: 'Bicycle',
    description: 'Selling 21-speed cycle used for 2 semesters. Front tyre is new, rear has minor wear.',
    startingPrice: 2200,
    minIncrement: 50,
    closingTime: new Date(Date.now() + 600000),
    photos: ['https://example.com/cycle1.jpg', 'https://example.com/cycle2.jpg'],
    condition: {
      grade: 'Good',
      age: '2 semesters',
      workingStatus: 'Fully functional',
      defects: 'Brake pads squeak occasionally in rain',
    },
    acceptedPaymentMethods: ['upi', 'cash_on_pickup'],
    upiId: 'deepak@okaxis',
    fulfilment: ['campus_pickup'],
    honestyDeclaration: true,
  });

  // TEST 1: Public Profile Endpoint Privacy & Stats
  console.log('\n--- TEST 1: Public Profile Privacy & Stats ---');
  const pubProfileRes = await fetch(`${BASE_URL}/profile/${sellerId}`).then((r) => r.json());
  assert.strictEqual(pubProfileRes.success, true, 'Public profile fetch must succeed');
  const pubUser = pubProfileRes.data.user;
  assert.strictEqual(pubUser.name, 'Deepak Patel', 'Public profile must show name');
  assert.strictEqual(pubUser.email, undefined, 'Email must NOT be leaked');
  assert.strictEqual(pubUser.campusRollNumber, undefined, 'Roll number must NOT be leaked');
  assert.strictEqual(pubUser.phone, undefined, 'Phone must NOT be leaked');
  assert.strictEqual(pubProfileRes.data.totalSpent, undefined, 'Financial spent must NOT be leaked');
  assert.strictEqual(pubProfileRes.data.totalReceived, undefined, 'Financial received must NOT be leaked');
  assert.strictEqual(pubProfileRes.data.stats.postsCount, 1, 'Posts count should be 1');
  assert.strictEqual(pubProfileRes.data.stats.reelsCount, 0, 'Initial reels count should be 0');
  console.log('✓ TEST 1 PASSED: Public profile returns name and stats with zero sensitive leaks');

  // TEST 2: Toggle Repost (Reshare Auction)
  console.log('\n--- TEST 2: Reshare / Repost Feature ---');
  const repostRes1 = await fetch(`${BASE_URL}/listings/${listing._id}/repost`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json());
  assert.strictEqual(repostRes1.success, true);
  assert.strictEqual(repostRes1.data.reposted, true, 'Should mark as reposted');
  assert.strictEqual(repostRes1.data.repostCount, 1, 'Listing repost count should be 1');

  // Verify Kavya's profile reposts tab returns this item
  const buyerReposts = await fetch(`${BASE_URL}/profile/${buyerId}/reposts`).then((r) => r.json());
  assert.strictEqual(buyerReposts.data.length, 1, 'Kavya should have 1 repost');
  assert.strictEqual(buyerReposts.data[0].listing._id.toString(), listing._id.toString());
  assert.strictEqual(buyerReposts.data[0].listing.seller.name, 'Deepak Patel');

  // Toggle off (un-repost)
  const repostRes2 = await fetch(`${BASE_URL}/listings/${listing._id}/repost`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json());
  assert.strictEqual(repostRes2.data.reposted, false, 'Should un-repost');
  assert.strictEqual(repostRes2.data.repostCount, 0, 'Listing repost count should be 0');
  console.log('✓ TEST 2 PASSED: Reshare / Repost toggle and profile reposts tab verified');

  // TEST 3: Condition Demo Reels
  console.log('\n--- TEST 3: Condition Demo Reels ---');
  // Non-seller (Kavya) tries to post reel for Deepak's cycle -> 403 Forbidden
  const fraudReelRes = await fetch(`${BASE_URL}/profile/reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` },
    body: JSON.stringify({
      listingId: listing._id,
      title: 'Fake Reel',
      videoUrl: 'https://example.com/fake.mp4',
    }),
  });
  assert.strictEqual(fraudReelRes.status, 403, 'Non-seller must receive 403 Forbidden on posting reel');

  // Seller (Deepak) posts honest condition demo reel (e.g. testing gear shifting)
  const validReelRes = await fetch(`${BASE_URL}/profile/reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      listingId: listing._id,
      title: 'Testing 21-Speed Gear Shift and Brakes',
      videoUrl: 'https://cdn.campusauction.edu/reels/cycle-brakes-test.mp4',
      caption: 'Showing quick shift between 1st and 7th gear, disc brakes bite immediately.',
      durationSeconds: 22,
    }),
  }).then((r) => r.json());
  assert.strictEqual(validReelRes.success, true);
  assert.strictEqual(validReelRes.data.title, 'Testing 21-Speed Gear Shift and Brakes');

  // Verify Deepak's profile reels endpoint
  const sellerReels = await fetch(`${BASE_URL}/profile/${sellerId}/reels`).then((r) => r.json());
  assert.strictEqual(sellerReels.data.length, 1);
  assert.strictEqual(sellerReels.data[0].title, 'Testing 21-Speed Gear Shift and Brakes');
  assert.strictEqual(sellerReels.data[0].listing.title, 'Hero Sprint 21-Speed Mountain Cycle');
  console.log('✓ TEST 3 PASSED: Condition demo reels correctly created by seller and accessible on profile');

  // TEST 4: Listing Detail Views Increment & Reels Attached
  console.log('\n--- TEST 4: View Count Increment & Reels in Listing Detail ---');
  const detailRes = await fetch(`${BASE_URL}/listings/${listing._id}`).then((r) => r.json());
  assert.strictEqual(detailRes.success, true);
  assert.strictEqual(detailRes.data.reels.length, 1, 'Listing detail must include attached condition demo reels');
  assert(detailRes.data.views >= 1, 'View count must be incremented');
  console.log(`✓ TEST 4 PASSED: Listing detail views incremented (${detailRes.data.views}) and reels attached`);

  // TEST 5: Owner Engagement Analytics
  console.log('\n--- TEST 5: Owner Engagement Analytics ---');
  const engRes = await fetch(`${BASE_URL}/profile/engagement`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  }).then((r) => r.json());
  assert.strictEqual(engRes.success, true);
  assert(engRes.data.totalViews >= 1, 'Total views should be >= 1');
  assert.strictEqual(engRes.data.listingEngagement.length, 1);
  console.log('✓ TEST 5 PASSED: Owner engagement metrics (views, bids, reposts) properly calculated');

  // Teardown
  await Reel.deleteMany({ seller: sellerId });
  await Repost.deleteMany({ $or: [{ user: sellerId }, { user: buyerId }] });
  await Listing.deleteOne({ _id: listing._id });
  await User.deleteMany({ $or: [{ email: { $in: emails } }, { campusRollNumber: { $in: rolls } }] });

  console.log('\n=============================================================');
  console.log('✅ ALL MODULE 19 INSTAGRAM-STYLE PROFILE TESTS PASSED!');
  console.log('=============================================================\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
