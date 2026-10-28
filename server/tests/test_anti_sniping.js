const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Bid = require('../src/models/Bid');
const BidService = require('../src/services/bidService');

async function runAntiSnipingTests() {
  console.log('\n========================================================');
  console.log('🧪 Starting Anti-Sniping Verification & Tests (30s Window -> 60s Reset)');
  console.log('========================================================\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/campus_auction');
  }

  // Teardown previous test data
  const testEmails = ['sniperseller@campus.edu', 'sniperbuyer1@campus.edu', 'sniperbuyer2@campus.edu'];
  await User.deleteMany({ email: { $in: testEmails } });
  await Listing.deleteMany({ title: /^TEST_SNIPER_/ });

  // 1. Create seller and bidders
  const seller = await User.create({
    name: 'Sniper Seller',
    email: 'sniperseller@campus.edu',
    password: 'Password123!',
    campusRollNumber: 'SN21B001',
    role: 'seller',
  });

  const buyer1 = await User.create({
    name: 'Sniper Buyer 1',
    email: 'sniperbuyer1@campus.edu',
    password: 'Password123!',
    campusRollNumber: 'SN21B002',
  });

  const buyer2 = await User.create({
    name: 'Sniper Buyer 2',
    email: 'sniperbuyer2@campus.edu',
    password: 'Password123!',
    campusRollNumber: 'SN21B003',
  });

  const createTestListing = async (title, category, closingTime, startingPrice = 500, minIncrement = 20) => {
    return Listing.create({
      title,
      category,
      seller: seller._id,
      startingPrice,
      currentPrice: startingPrice,
      minIncrement,
      closingTime,
      status: 'active',
      description: `Authentic test item for anti-sniping validation: ${title}`,
      honestyDeclaration: true,
      photos: ['/uploads/test1.webp', '/uploads/test2.webp'],
      condition: {
        grade: 'Good',
        age: '1 year',
        workingStatus: 'Fully functional',
        defects: 'None reported',
      },
    });
  };

  // --- TEST 1: Bid placed with 31 seconds remaining -> NO extension ---
  console.log('--- TEST 1: Bid placed at 31s remaining (Outside 30s window) ---');
  const now1 = Date.now();
  const initialClosing1 = new Date(now1 + 31000); // exactly 31s in future
  const listing1 = await createTestListing('TEST_SNIPER_ITEM_1', 'electronics', initialClosing1, 500, 20);

  const res1 = await BidService.placeBid(buyer1._id, {
    listingId: listing1._id.toString(),
    amount: 500,
  });

  assert.strictEqual(res1.extended, false, 'Bid at 31s remaining should NOT trigger anti-sniping extension');
  assert.strictEqual(
    new Date(res1.listing.closingTime).getTime(),
    initialClosing1.getTime(),
    'Closing time must remain unchanged at 31s'
  );
  console.log('✓ TEST 1 PASSED: 31s remaining does NOT trigger extension. Closing time remained intact.');

  // --- TEST 2: Bid placed with exactly 30 seconds remaining -> EXTENDED to bidTime + 60s ---
  console.log('\n--- TEST 2: Bid placed at exactly 30s remaining (Boundary condition) ---');
  const now2 = Date.now();
  const initialClosing2 = new Date(now2 + 30000); // exactly 30s in future
  const listing2 = await createTestListing('TEST_SNIPER_ITEM_2', 'cycle', initialClosing2, 1000, 50);

  const res2 = await BidService.placeBid(buyer1._id, {
    listingId: listing2._id.toString(),
    amount: 1000,
  });

  assert.strictEqual(res2.extended, true, 'Bid at exactly 30s remaining MUST trigger extension');
  const updatedListing2 = await Listing.findById(listing2._id);
  const diff2 = new Date(updatedListing2.closingTime).getTime() - Date.now();
  // Should be close to 60,000 ms (within 2,000 ms margin)
  assert(diff2 >= 58000 && diff2 <= 61000, `Closing time should be ~60s from now, got diff: ${diff2}ms`);
  console.log(`✓ TEST 2 PASSED: Exactly 30s remaining triggered anti-sniping extension to ~60s: ${diff2}ms remaining`);

  // --- TEST 3: Bid placed with 29 seconds remaining -> EXTENDED to bidTime + 60s ---
  console.log('\n--- TEST 3: Bid placed at 29s remaining (Inside 30s window) ---');
  const now3 = Date.now();
  const initialClosing3 = new Date(now3 + 29000); // 29s in future
  const listing3 = await createTestListing('TEST_SNIPER_ITEM_3', 'books', initialClosing3, 300, 20);

  const res3 = await BidService.placeBid(buyer1._id, {
    listingId: listing3._id.toString(),
    amount: 300,
  });

  assert.strictEqual(res3.extended, true, 'Bid at 29s remaining MUST trigger extension');
  const updatedListing3 = await Listing.findById(listing3._id);
  const diff3 = new Date(updatedListing3.closingTime).getTime() - Date.now();
  assert(diff3 >= 58000 && diff3 <= 61000, `Closing time should be ~60s from now, got diff: ${diff3}ms`);
  console.log(`✓ TEST 3 PASSED: 29s remaining successfully extended closing time to ~60s: ${diff3}ms remaining`);

  // --- TEST 4: Repeated Extensions ---
  console.log('\n--- TEST 4: Repeated Extensions Sequentially Reset Closing Time ---');
  // First extension: Buyer 1 bids with 20s remaining
  const now4 = Date.now();
  const listing4 = await createTestListing('TEST_SNIPER_ITEM_4', 'stationery', new Date(now4 + 20000), 800, 50);

  // Buyer 1 places first bid
  const ext1 = await BidService.placeBid(buyer1._id, {
    listingId: listing4._id.toString(),
    amount: 800,
  });
  assert.strictEqual(ext1.extended, true, 'First extension must be true');

  // Simulate time advancing to 25s remaining on the newly extended clock
  await Listing.updateOne(
    { _id: listing4._id },
    { $set: { closingTime: new Date(Date.now() + 25000) } }
  );

  // Buyer 2 places counter-bid
  const ext2 = await BidService.placeBid(buyer2._id, {
    listingId: listing4._id.toString(),
    amount: 850,
  });
  assert.strictEqual(ext2.extended, true, 'Second extension must also be true');
  const closeTimeAfter2 = new Date(ext2.listing.closingTime).getTime();
  const diffAfter2 = closeTimeAfter2 - Date.now();
  assert(diffAfter2 >= 58000 && diffAfter2 <= 61000, `Clock should reset to ~60s again, got: ${diffAfter2}ms`);
  console.log(`✓ TEST 4 PASSED: Subsequent bids in final 30s repeatedly reset closing time to 60s (${diffAfter2}ms)`);

  // --- TEST 5: Bid placed AFTER close is strictly rejected with 400 ---
  console.log('\n--- TEST 5: Bid Placed After Close is Rejected (400) ---');
  const expiredListing = await createTestListing(
    'TEST_SNIPER_ITEM_EXPIRED',
    'furniture',
    new Date(Date.now() + 60000),
    200,
    20
  );

  // Advance time past closing
  await Listing.updateOne(
    { _id: expiredListing._id },
    { $set: { closingTime: new Date(Date.now() - 5000) } }
  );

  let rejected = false;
  try {
    await BidService.placeBid(buyer1._id, {
      listingId: expiredListing._id.toString(),
      amount: 250,
    });
  } catch (err) {
    rejected = true;
    assert.strictEqual(err.statusCode, 400, 'Status code must be 400');
    assert(err.message.includes('closed'), `Error message must mention closed, got: ${err.message}`);
    console.log('✓ TEST 5 PASSED: Post-close bid rejected cleanly: ' + err.message);
  }
  assert.strictEqual(rejected, true, 'Bid after closing must throw error');

  // Cleanup
  await User.deleteMany({ email: { $in: testEmails } });
  await Listing.deleteMany({ title: /^TEST_SNIPER_/ });
  await Bid.deleteMany({ listing: { $in: [listing1._id, listing2._id, listing3._id, listing4._id, expiredListing._id] } });

  console.log('\n========================================================');
  console.log('✅ ALL ANTI-SNIPING TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================\n');
}

runAntiSnipingTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Anti-sniping test suite failed:', err);
    process.exit(1);
  });
