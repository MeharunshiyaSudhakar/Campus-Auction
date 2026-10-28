const mongoose = require('mongoose');
const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Bid = require('../src/models/Bid');
const Deal = require('../src/models/Deal');
const Notification = require('../src/models/Notification');
const AuctionClosingService = require('../src/services/auctionClosingService');
const ApprovalService = require('../src/services/approvalService');
const ListingService = require('../src/services/listingService');
const BidService = require('../src/services/bidService');

async function runTests() {
  console.log('--- Starting Modules 7 & 8: Auction Closing & Seller Approval Test Suite ---');
  await mongoose.connect('mongodb://localhost:27017/campus_auction');

  // Clean test data
  await Listing.deleteMany({ title: { $regex: /\[Test-M78\]/ } });
  await User.deleteMany({ $or: [{ email: { $regex: /m78test/ } }, { campusRollNumber: { $regex: /B78/ } }] });
  await Deal.deleteMany({});
  await Notification.deleteMany({ title: { $regex: /Approve Winning Bid|Auction Won|Auction Closed Unsold|Bid Approved|Bid Declined/ } });

  // 1. Create Seller, Winner, and Third-Party Student
  const seller = await User.create({
    name: 'Vikram Senior',
    email: 'm78test_seller@campus.edu',
    campusRollNumber: 'ME21B781',
    password: 'password123',
  });

  const winner = await User.create({
    name: 'Ananya Junior',
    email: 'm78test_winner@campus.edu',
    campusRollNumber: 'CS24B782',
    password: 'password123',
  });

  const intruder = await User.create({
    name: 'Karan Junior',
    email: 'm78test_intruder@campus.edu',
    campusRollNumber: 'EE24B783',
    password: 'password123',
  });

  // TEST 1: Automatic Auction Closing with Bids -> Transitions to pending_approval
  console.log('\n--- TEST 1: Closing Auction with Bids -> pending_approval ---');
  const validFuture = new Date(Date.now() + 60000);
  const itemWithBids = await Listing.create({
    seller: seller._id,
    title: '[Test-M78] Sony WH-1000XM4 Headphones',
    category: 'electronics',
    description: 'Active noise cancelling headphones with original box and cable.',
    photos: ['/uploads/sony1.jpg', '/uploads/sony2.jpg'],
    condition: { grade: 'Good', age: '1.5 years', workingStatus: 'Fully functional' },
    honestyDeclaration: true,
    startingPrice: 3000,
    currentPrice: 3000,
    minIncrement: 100,
    closingTime: validFuture,
    status: 'active',
    acceptedPaymentMethods: ['upi', 'cash_on_pickup'],
    upiId: 'vikram@okaxis',
  });

  // Place a valid bid by Ananya
  await BidService.placeBid(winner._id, { listingId: itemWithBids._id, amount: 3200 });

  // Artificially simulate auction expiration
  await Listing.updateOne({ _id: itemWithBids._id }, { $set: { closingTime: new Date(Date.now() - 2000) } });

  // Execute closing engine
  const closeResult = await AuctionClosingService.closeListing(itemWithBids._id);
  if (!closeResult.closed) {
    throw new Error(`Expected closeResult.closed to be true, got: ${JSON.stringify(closeResult)}`);
  }

  const closedItem = await Listing.findById(itemWithBids._id);
  if (closedItem.status !== 'pending_approval') {
    throw new Error(`Expected status 'pending_approval', got: ${closedItem.status}`);
  }
  if (closedItem.winner.toString() !== winner._id.toString()) {
    throw new Error('Winner was not set correctly on closed listing');
  }
  if (closedItem.finalPrice !== 3200) {
    throw new Error(`Expected finalPrice 3200, got: ${closedItem.finalPrice}`);
  }

  // Verify winning bid marked
  const winningBidRecord = await Bid.findOne({ listing: itemWithBids._id, isWinningBid: true });
  if (!winningBidRecord || winningBidRecord.amount !== 3200) {
    throw new Error('Winning bid record was not marked isWinningBid: true');
  }

  // Verify notifications created
  const sellerNotif = await Notification.findOne({ user: seller._id, type: 'approval_needed' });
  const winnerNotif = await Notification.findOne({ user: winner._id, type: 'won' });
  if (!sellerNotif || !winnerNotif) {
    throw new Error('Notifications were not generated for seller or winner');
  }
  console.log('✓ TEST 1 PASSED: Closed auction with bids moved to pending_approval with winning bid flagged and notifications dispatched');

  // TEST 2: Auction Closing with Zero Bids -> Transitions to unsold
  console.log('\n--- TEST 2: Closing Auction with Zero Bids -> unsold ---');
  const zeroBidsItem = await Listing.create({
    seller: seller._id,
    title: '[Test-M78] Mechanics Textbook',
    category: 'books',
    description: 'Engineering mechanics standard reference book.',
    photos: ['/uploads/book1.jpg', '/uploads/book2.jpg'],
    condition: { grade: 'Good', age: '1 year', workingStatus: 'Fully functional' },
    honestyDeclaration: true,
    startingPrice: 400,
    currentPrice: 400,
    minIncrement: 50,
    closingTime: validFuture,
    status: 'active',
  });

  await Listing.updateOne({ _id: zeroBidsItem._id }, { $set: { closingTime: new Date(Date.now() - 2000) } });

  const zeroBidsCloseResult = await AuctionClosingService.closeListing(zeroBidsItem._id);
  if (!zeroBidsCloseResult.closed) {
    throw new Error('Expected zero bids listing to close');
  }

  const unsoldItem = await Listing.findById(zeroBidsItem._id);
  if (unsoldItem.status !== 'unsold') {
    throw new Error(`Expected status 'unsold', got: ${unsoldItem.status}`);
  }

  const unsoldNotif = await Notification.findOne({ user: seller._id, type: 'unsold_alert', listing: zeroBidsItem._id });
  if (!unsoldNotif) {
    throw new Error('Seller did not receive unsold notification');
  }
  console.log('✓ TEST 2 PASSED: Zero bids auction closed to unsold and notified seller');

  // TEST 3: Idempotency of Closing Engine
  console.log('\n--- TEST 3: Idempotency of Closing Engine ---');
  const duplicateClose = await AuctionClosingService.closeListing(itemWithBids._id);
  if (duplicateClose.closed !== false) {
    throw new Error('Duplicate close should return closed: false');
  }
  console.log('✓ TEST 3 PASSED: Closing engine is strictly idempotent (zero duplicates on re-run)');

  // TEST 4: Authorization Protection on Seller Approval & Rejection
  console.log('\n--- TEST 4: Authorization Protection (Intruder 403 Forbidden) ---');
  try {
    await ApprovalService.approveWinningBid(intruder._id, itemWithBids._id);
    throw new Error('Intruder should have been blocked from approving bid');
  } catch (err) {
    if (err.statusCode === 403 && err.message.includes('Only the seller')) {
      console.log('✓ TEST 4A PASSED: Non-seller blocked from approving (403 Forbidden)');
    } else {
      throw err;
    }
  }

  try {
    await ApprovalService.rejectWinningBid(intruder._id, itemWithBids._id);
    throw new Error('Intruder should have been blocked from rejecting bid');
  } catch (err) {
    if (err.statusCode === 403 && err.message.includes('Only the seller')) {
      console.log('✓ TEST 4B PASSED: Non-seller blocked from rejecting (403 Forbidden)');
    } else {
      throw err;
    }
  }

  // TEST 5: Seller Rejection
  console.log('\n--- TEST 5: Seller Rejection Flow ---');
  const rejectTestItem = await Listing.create({
    seller: seller._id,
    title: '[Test-M78] Badminton Racket',
    category: 'sports',
    description: 'Yonex carbon fiber racket.',
    photos: ['/uploads/r1.jpg', '/uploads/r2.jpg'],
    condition: { grade: 'Good', age: '6 months', workingStatus: 'Fully functional' },
    honestyDeclaration: true,
    startingPrice: 1000,
    currentPrice: 1000,
    minIncrement: 50,
    closingTime: validFuture,
    status: 'active',
  });

  await BidService.placeBid(winner._id, { listingId: rejectTestItem._id, amount: 1050 });
  await Listing.updateOne({ _id: rejectTestItem._id }, { $set: { closingTime: new Date(Date.now() - 1000) } });
  await AuctionClosingService.closeListing(rejectTestItem._id);

  const rejectResult = await ApprovalService.rejectWinningBid(seller._id, rejectTestItem._id, 'Expected at least ₹1500');
  const rejectedItem = await Listing.findById(rejectTestItem._id);
  if (rejectedItem.status !== 'rejected') {
    throw new Error(`Expected status 'rejected', got ${rejectedItem.status}`);
  }

  const buyerRejectNotif = await Notification.findOne({ user: winner._id, type: 'rejected', listing: rejectTestItem._id });
  if (!buyerRejectNotif) {
    throw new Error('Buyer did not receive rejection notification');
  }
  console.log('✓ TEST 5 PASSED: Seller rejection sets status to rejected and notifies buyer with reason');

  // TEST 6: Seller Approval, Handover Code & Deal Creation (Module 8 + 16 Handshake)
  console.log('\n--- TEST 6: Seller Approval -> Deal & Handover Code Generation ---');
  const approvalResult = await ApprovalService.approveWinningBid(seller._id, itemWithBids._id);
  if (!approvalResult.deal || !approvalResult.listing) {
    throw new Error('Approval result missing deal or listing');
  }

  const approvedItem = await Listing.findById(itemWithBids._id);
  if (approvedItem.status !== 'approved') {
    throw new Error(`Expected listing status 'approved', got: ${approvedItem.status}`);
  }
  if (!approvedItem.handoverCode || approvedItem.handoverCode.length !== 6 || isNaN(Number(approvedItem.handoverCode))) {
    throw new Error(`Invalid 6-digit handover code generated: ${approvedItem.handoverCode}`);
  }

  // Verify Deal record created in DB
  const createdDeal = await Deal.findOne({ listing: itemWithBids._id });
  if (!createdDeal) {
    throw new Error('Deal record was not created on seller approval');
  }
  if (createdDeal.amount !== 3200) {
    throw new Error(`Deal amount mismatch: expected 3200, got ${createdDeal.amount}`);
  }
  if (createdDeal.handoverCode !== approvedItem.handoverCode) {
    throw new Error('Handover code on deal does not match listing handover code');
  }
  if (createdDeal.status !== 'approved') {
    throw new Error(`Expected deal status 'approved', got ${createdDeal.status}`);
  }
  // Verify seller's private payment info was transferred into the private Deal record
  if (createdDeal.sellerPaymentDetails.upiId !== 'vikram@okaxis') {
    throw new Error(`Deal sellerPaymentDetails.upiId mismatch: ${createdDeal.sellerPaymentDetails.upiId}`);
  }
  console.log(`✓ TEST 6 PASSED: Seller approval generated 6-digit code (${approvedItem.handoverCode}) and initialized Deal record`);

  // TEST 7: Lazy Closing in ListingService.getListingById
  console.log('\n--- TEST 7: Lazy Closing via getListingById ---');
  const lazyItem = await Listing.create({
    seller: seller._id,
    title: '[Test-M78] Campus Lab Coat',
    category: 'other',
    description: 'Cotton white chemistry lab coat size L.',
    photos: ['/uploads/coat1.jpg', '/uploads/coat2.jpg'],
    condition: { grade: 'Good', age: '1 year', workingStatus: 'Fully functional' },
    honestyDeclaration: true,
    startingPrice: 200,
    currentPrice: 200,
    minIncrement: 20,
    closingTime: validFuture,
    status: 'active',
  });

  // Expire item
  await Listing.updateOne({ _id: lazyItem._id }, { $set: { closingTime: new Date(Date.now() - 3000) } });

  // Query item detail via ListingService (simulating a student opening the page)
  const fetchedDetail = await ListingService.getListingById(lazyItem._id);
  if (fetchedDetail.status !== 'unsold' || !fetchedDetail.isClosed) {
    throw new Error(`Expected getListingById to automatically close expired listing. Status: ${fetchedDetail.status}`);
  }
  console.log('✓ TEST 7 PASSED: Lazy closing in getListingById seamlessly closes expired listings on retrieval');

  await mongoose.disconnect();
  console.log('\n=============================================================');
  console.log('✅ ALL MODULES 7 & 8 CLOSING & APPROVAL TESTS PASSED!');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Modules 7 & 8 Test Suite Failed:\n', err);
  process.exit(1);
});
