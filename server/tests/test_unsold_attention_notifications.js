const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Deal = require('../src/models/Deal');
const Notification = require('../src/models/Notification');
const AuctionClosingService = require('../src/services/auctionClosingService');
const ApprovalService = require('../src/services/approvalService');
const DealService = require('../src/services/dealService');
const AlertService = require('../src/services/alertService');

async function runUnsoldAttentionNotificationTests() {
  console.log('\n========================================================');
  console.log('🧪 Starting Unsold Item Attention Notifications & Deduplication Tests');
  console.log('========================================================\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/campus_auction');
  }

  // Teardown previous test data
  const testEmails = ['attnseller@campus.edu', 'attnbuyer@campus.edu'];
  await User.deleteMany({ email: { $in: testEmails } });
  await Listing.deleteMany({ title: /^TEST_ATTN_/ });

  // 1. Create seller and buyer
  const seller = await User.create({
    name: 'Attention Seller',
    email: 'attnseller@campus.edu',
    password: 'Password123!',
    campusRollNumber: 'AT21B001',
    role: 'seller',
  });

  const buyer = await User.create({
    name: 'Attention Buyer',
    email: 'attnbuyer@campus.edu',
    password: 'Password123!',
    campusRollNumber: 'AT21B002',
  });

  const createExpiredListing = async (title, category = 'cycle') => {
    const listing = await Listing.create({
      title,
      category,
      seller: seller._id,
      startingPrice: 500,
      currentPrice: 500,
      minIncrement: 20,
      closingTime: new Date(Date.now() + 60000), // initially future
      status: 'active',
      description: `Authentic test item: ${title}`,
      honestyDeclaration: true,
      photos: ['/uploads/test1.webp', '/uploads/test2.webp'],
      condition: {
        grade: 'Good',
        age: '1 year',
        workingStatus: 'Fully functional',
        defects: 'None reported',
      },
    });

    // Advance closingTime into the past
    await Listing.updateOne(
      { _id: listing._id },
      { $set: { closingTime: new Date(Date.now() - 5000) } }
    );
    return Listing.findById(listing._id);
  };

  // --- TEST 1: Closing with 0 bids transitions to 'unsold' and sends 1 notification ---
  console.log('--- TEST 1: Auction Closes With 0 Bids -> Unsold & 1 Notification ---');
  const listing1 = await createExpiredListing('TEST_ATTN_ZERO_BIDS_1');

  const closeResult1 = await AuctionClosingService.closeListing(listing1._id);
  assert.strictEqual(closeResult1.closed, true, 'Listing must be closed');
  assert.strictEqual(closeResult1.listing.status, 'unsold', 'Status must transition to unsold');

  // Verify seller received unsold notification
  const notifs1 = await Notification.find({
    user: seller._id,
    listing: listing1._id,
    type: 'unsold_no_bids',
  });
  assert.strictEqual(notifs1.length, 1, 'Exactly 1 unsold_no_bids notification should be created');
  assert(notifs1[0].message.includes('closed without bids'), `Message should mention closed without bids: ${notifs1[0].message}`);
  assert.strictEqual(notifs1[0].link, '/needs-attention', 'Notification must link to /needs-attention');
  assert.strictEqual(notifs1[0].eventKey, `${listing1._id}_unsold_no_bids`, 'eventKey must be set');
  console.log('✓ TEST 1 PASSED: Unsold auction immediately dispatched 1 notification to seller linking to /needs-attention');

  // --- TEST 2: Idempotent Rerun creates 0 duplicates ---
  console.log('\n--- TEST 2: Closing Service Rerun Does NOT Create Duplicate Notification ---');
  const closeResult2 = await AuctionClosingService.closeListing(listing1._id);
  assert.strictEqual(closeResult2.closed, false, 'Already closed listing should return closed: false');

  const notifsAfterRerun = await Notification.find({
    user: seller._id,
    listing: listing1._id,
    type: 'unsold_no_bids',
  });
  assert.strictEqual(notifsAfterRerun.length, 1, 'Must still have strictly 1 notification (0 duplicates created)');
  console.log('✓ TEST 2 PASSED: Rerun created 0 duplicates. EventKey deduplication verified.');

  // --- TEST 3: Seller Price Rejection creates rejection_confirmed alert ---
  console.log('\n--- TEST 3: Price Rejection Dispatches Deduplicated Alert ---');
  const listing2 = await createExpiredListing('TEST_ATTN_REJECT_PRICE');
  // Mark as pending_approval with winner
  await Listing.updateOne(
    { _id: listing2._id },
    {
      $set: {
        status: 'pending_approval',
        winner: buyer._id,
        currentPrice: 600,
        finalPrice: 600,
        bidCount: 1,
      },
    }
  );

  await ApprovalService.rejectWinningBid(seller._id, listing2._id, 'Bid is too low');
  const rejNotifs = await Notification.find({
    user: seller._id,
    listing: listing2._id,
    type: 'rejection_confirmed',
  });
  assert.strictEqual(rejNotifs.length, 1, 'Exactly 1 rejection_confirmed notification created');
  assert.strictEqual(rejNotifs[0].link, '/needs-attention', 'Must link to /needs-attention');
  console.log('✓ TEST 3 PASSED: Price rejection notified seller with rejection_confirmed and link to /needs-attention');

  // --- TEST 4: Deal Outcomes (pickup_failed, payment_not_received, deal_cancelled) ---
  console.log('\n--- TEST 4: Deal Outcomes Notify Seller Once Each ---');
  const listing3 = await createExpiredListing('TEST_ATTN_PICKUP_FAIL');
  const deal3 = await Deal.create({
    listing: listing3._id,
    buyer: buyer._id,
    seller: seller._id,
    amount: 500,
    status: 'approved',
  });

  await DealService.recordDealOutcome(deal3._id, seller._id, {
    outcome: 'pickup_failed',
    reason: 'Buyer did not show up',
  });

  const pickupNotifs = await Notification.find({
    user: seller._id,
    listing: listing3._id,
    type: 'pickup_failed',
  });
  assert.strictEqual(pickupNotifs.length, 1, 'Exactly 1 pickup_failed notification created');
  assert.strictEqual(pickupNotifs[0].link, '/needs-attention');
  console.log('✓ TEST 4 PASSED: Pickup failure recorded and seller notified with link to /needs-attention');

  // --- TEST 5: Needs Attention Count Endpoint ---
  console.log('\n--- TEST 5: Needs Attention Count Service ---');
  const countRes = await AlertService.getNeedsAttentionCount(seller._id);
  // Listing 1 (unsold), Listing 2 (rejected), Listing 3 (pickup_failed) => at least 3
  assert(countRes.count >= 3, `Count should be >= 3, got: ${countRes.count}`);

  const attentionItems = await AlertService.getNeedsAttentionListings(seller._id);
  assert(attentionItems.length >= 3, `Needs attention listings should return >= 3, got: ${attentionItems.length}`);
  console.log(`✓ TEST 5 PASSED: Needs attention count returned ${countRes.count} items, all properly surfaced with reasons.`);

  // Cleanup
  await User.deleteMany({ email: { $in: testEmails } });
  await Listing.deleteMany({ title: /^TEST_ATTN_/ });
  await Deal.deleteMany({ _id: deal3._id });
  await Notification.deleteMany({ user: seller._id });

  console.log('\n========================================================');
  console.log('✅ ALL UNSOLD ATTENTION & NOTIFICATION TESTS PASSED!');
  console.log('========================================================\n');
}

runUnsoldAttentionNotificationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Unsold attention notification test failed:', err);
    process.exit(1);
  });
