const mongoose = require('mongoose');
const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Bid = require('../src/models/Bid');
const BidService = require('../src/services/bidService');

async function runTests() {
  console.log('--- Starting Module 5: Bidding Engine Test Suite ---');
  await mongoose.connect('mongodb://localhost:27017/campus_auction');

  // Clean test data
  await Listing.deleteMany({ title: { $regex: /\[Test-M5\]/ } });
  await User.deleteMany({ email: { $regex: /m5test/ } });
  await Bid.deleteMany({});

  // 1. Create Seller and Two Bidders
  const seller = await User.create({
    name: 'Kabir Senior',
    email: 'm5test_seller@campus.edu',
    campusRollNumber: 'ME21B001',
    password: 'password123',
  });

  const bidder1 = await User.create({
    name: 'Diya Junior',
    email: 'm5test_bidder1@campus.edu',
    campusRollNumber: 'CS24B055',
    password: 'password123',
  });

  const bidder2 = await User.create({
    name: 'Rohan Junior',
    email: 'm5test_bidder2@campus.edu',
    campusRollNumber: 'EE24B078',
    password: 'password123',
  });

  // 2. Create Active Auction Listing
  const futureClosing = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours
  const item = await Listing.create({
    seller: seller._id,
    title: '[Test-M5] Casio fx-991CW Calculator',
    category: 'calculator',
    description: 'Advanced scientific calculator with quad-line display.',
    photos: ['/uploads/c1.jpg', '/uploads/c2.jpg'],
    condition: {
      grade: 'Good',
      age: '1 year',
      workingStatus: 'Fully functional',
      defects: 'Minor cover scuffs.',
      accessories: ['Slide Cover'],
    },
    honestyDeclaration: true,
    startingPrice: 500,
    currentPrice: 500,
    minIncrement: 50,
    closingTime: futureClosing,
    status: 'active',
  });

  // Test 1: Seller cannot bid on their own listing
  try {
    await BidService.placeBid(seller._id, { listingId: item._id, amount: 600 });
    throw new Error('Test 1 Failed: Seller was allowed to bid on own item');
  } catch (err) {
    if (err.statusCode === 403 && err.message.includes('Sellers cannot bid')) {
      console.log('[Test 1] Seller Self-Bid Protection: PASSED (Forbidden 403)');
    } else {
      throw err;
    }
  }

  // Test 2: Reject first bid below starting price
  try {
    await BidService.placeBid(bidder1._id, { listingId: item._id, amount: 450 });
    throw new Error('Test 2 Failed: Sub-starting price bid was accepted');
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('starting price')) {
      console.log('[Test 2] First Bid < Starting Price Rejection: PASSED (Rejected below ₹500)');
    } else {
      throw err;
    }
  }

  // Test 3: Valid first bid at starting price
  const bid1Result = await BidService.placeBid(bidder1._id, { listingId: item._id, amount: 500 });
  const itemAfterBid1 = await Listing.findById(item._id);
  if (
    itemAfterBid1.currentPrice === 500 &&
    itemAfterBid1.bidCount === 1 &&
    itemAfterBid1.leadingBidder.toString() === bidder1._id.toString()
  ) {
    console.log('[Test 3] Valid First Bid: PASSED (Placed ₹500, leading bidder set to Diya)');
  } else {
    throw new Error('Test 3 Failed: Listing state not updated on first bid');
  }

  // Test 4: Reject second bid below (currentPrice + minIncrement)
  // currentPrice = 500, minIncrement = 50 -> required is at least 550. Bid of 520 must fail.
  try {
    await BidService.placeBid(bidder2._id, { listingId: item._id, amount: 520 });
    throw new Error('Test 4 Failed: Sub-increment bid was accepted');
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('Bid must be at least ₹550')) {
      console.log('[Test 4] Increment Rule Enforcement: PASSED (Rejected ₹520, required ₹550)');
    } else {
      throw err;
    }
  }

  // Test 5: Valid second bid by bidder 2 (Rohan bids ₹600)
  const bid2Result = await BidService.placeBid(bidder2._id, { listingId: item._id, amount: 600 });
  const itemAfterBid2 = await Listing.findById(item._id);
  if (
    itemAfterBid2.currentPrice === 600 &&
    itemAfterBid2.bidCount === 2 &&
    itemAfterBid2.leadingBidder.toString() === bidder2._id.toString()
  ) {
    console.log('[Test 5] Valid Outbid: PASSED (Rohan outbid to ₹600, leading bidder atomically updated)');
  } else {
    throw new Error('Test 5 Failed: Rohan outbid state incorrect');
  }

  // Test 6: Same leading bidder tries to bid lower or equal to own bid
  try {
    await BidService.placeBid(bidder2._id, { listingId: item._id, amount: 600 });
    throw new Error('Test 6 Failed: Duplicate self-bid was accepted');
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('already hold the leading bid')) {
      console.log('[Test 6] Self-Outbid Guard: PASSED (Prevented redundant self-bid)');
    } else {
      throw err;
    }
  }

  // Test 7: Server Clock Closes Auction (No bids after close)
  itemAfterBid2.closingTime = new Date(Date.now() - 5000); // 5 seconds in the past
  await itemAfterBid2.save();
  try {
    await BidService.placeBid(bidder1._id, { listingId: item._id, amount: 700 });
    throw new Error('Test 7 Failed: Bid accepted after auction closing time');
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('Auction has closed')) {
      console.log('[Test 7] Server Clock Closing Enforcement: PASSED (Bids strictly rejected after close)');
    } else {
      throw err;
    }
  }

  // Test 8: Anti-Sniping 30-Second Extension Rule
  const urgentItem = await Listing.create({
    seller: seller._id,
    title: '[Test-M5] Urgency Bike for Extension',
    category: 'cycle',
    description: 'Single speed roadster cycle.',
    photos: ['/uploads/b1.jpg', '/uploads/b2.jpg'],
    condition: { grade: 'Good', age: '1 year', workingStatus: 'Fully functional', defects: 'None' },
    honestyDeclaration: true,
    startingPrice: 1000,
    currentPrice: 1000,
    minIncrement: 100,
    closingTime: new Date(Date.now() + 15000), // 15 seconds remaining (< 30s)
    status: 'active',
  });

  const snipBid = await BidService.placeBid(bidder1._id, { listingId: urgentItem._id, amount: 1000 });
  const extendedItem = await Listing.findById(urgentItem._id);
  const remainingAfterSnip = new Date(extendedItem.closingTime).getTime() - Date.now();
  if (snipBid.extended && remainingAfterSnip > 45000) {
    console.log('[Test 8] Anti-Sniping Extension: PASSED (Clock extended to 60s upon last-minute bid)');
  } else {
    throw new Error('Test 8 Failed: Anti-sniping extension did not extend clock');
  }

  // Test 9: Public Transparent Bid History & Zero Sensitive Data Leak
  const history = await BidService.getListingBids(item._id);
  if (history.length === 2 && history[0].amount === 600 && history[1].amount === 500) {
    console.log('[Test 9A] Public Bid History Ordering: PASSED (Highest ₹600 first, ₹500 second)');
  } else {
    throw new Error('Test 9A Failed: Bid history ordering or count incorrect');
  }

  if (history[0].bidder.email || history[0].bidder.password || history[0].bidder.campusRollNumber) {
    throw new Error('Test 9B Privacy Leak: Private student fields leaked in public bid history!');
  }
  if (!history[0].bidder.name) {
    throw new Error('Test 9B Failed: Bidder name missing');
  }
  console.log('[Test 9B] Privacy Audit: PASSED (Public profile shows name only, zero sensitive data)');

  // Clean test data
  await Listing.deleteMany({ title: { $regex: /\[Test-M5\]/ } });
  await User.deleteMany({ email: { $regex: /m5test/ } });
  await Bid.deleteMany({});

  console.log('\n=============================================');
  console.log('ALL MODULE 5 BIDDING ENGINE TESTS PASSED!');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
