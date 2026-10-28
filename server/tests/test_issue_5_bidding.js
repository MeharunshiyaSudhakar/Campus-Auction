const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Bid = require('../src/models/Bid');
const BidService = require('../src/services/bidService');

async function runTests() {
  console.log('--- RUNNING ISSUE 5 BIDDING FLOW TESTS ---');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campus_auction');

  try {
    // 1. Setup seller and two bidder accounts
    let seller = await User.findOne({ email: 'seller_bid_issue5@test.com' });
    if (!seller) {
      seller = await User.create({
        name: 'Seller Bid Issue 5',
        email: 'seller_bid_issue5@test.com',
        password: 'password123',
        college: 'Engineering College',
        campusRollNumber: '21CS551',
        phoneNumber: '9876543211',
        emailVerified: true,
      });
    }

    let bidder1 = await User.findOne({ email: 'bidder1_issue5@test.com' });
    if (!bidder1) {
      bidder1 = await User.create({
        name: 'Aarav Bidder',
        email: 'bidder1_issue5@test.com',
        password: 'password123',
        college: 'Engineering College',
        campusRollNumber: '21CS552',
        phoneNumber: '9876543212',
        emailVerified: true,
      });
    }

    let bidder2 = await User.findOne({ email: 'bidder2_issue5@test.com' });
    if (!bidder2) {
      bidder2 = await User.create({
        name: 'Priya Bidder',
        email: 'bidder2_issue5@test.com',
        password: 'password123',
        college: 'Engineering College',
        campusRollNumber: '21CS553',
        phoneNumber: '9876543213',
        emailVerified: true,
      });
    }

    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);

    const listing = await Listing.create({
      seller: seller._id,
      title: 'Bidding Test Item Cycle',
      category: 'vehicles',
      itemType: 'cycle',
      description: 'Sturdy cycle ready for campus bidding.',
      photos: ['/uploads/cycle1.webp', '/uploads/cycle2.webp'],
      condition: {
        grade: 'Good',
        age: '1 year',
        workingStatus: 'Fully functional',
        defects: 'None reported',
      },
      honestyDeclaration: true,
      startingPrice: 500,
      minIncrement: 50,
      currentPrice: 500,
      bidCount: 0,
      closingTime: futureDate,
      status: 'active',
    });

    // TEST 1: Place a valid first bid (equals starting price)
    console.log('\n[Test 1] Place valid first bid equals starting price (₹500)');
    const res1 = await BidService.placeBid(bidder1._id, { listingId: listing._id, amount: 500 });
    if (res1.listing.currentPrice !== 500 || res1.listing.bidCount !== 1) {
      throw new Error(`Expected currentPrice 500 and bidCount 1, got ${res1.listing.currentPrice}, ${res1.listing.bidCount}`);
    }
    const leader1 = res1.listing.leadingBidder?._id || res1.listing.leadingBidder;
    if (leader1.toString() !== bidder1._id.toString()) {
      throw new Error('Expected bidder1 as leading bidder');
    }
    console.log(`✓ Test 1 Passed: First bid placed at ₹500, leading bidder set to ${bidder1.name}.`);

    // TEST 2: Reject a bid below minimum next bid
    console.log('\n[Test 2] Reject bid below minimum next bid (₹520 < ₹550)');
    let rejectedLow = false;
    try {
      await BidService.placeBid(bidder2._id, { listingId: listing._id, amount: 520 });
    } catch (err) {
      if (err.statusCode === 400 && (err.message.includes('550') || err.message.includes('minimum'))) {
        rejectedLow = true;
      }
    }
    if (!rejectedLow) {
      throw new Error('Expected 400 rejection for bid below minimum next bid (₹520)');
    }
    console.log('✓ Test 2 Passed: Low bid rejected with 400 and clear minimum bid message.');

    // TEST 3: Place a valid subsequent bid (currentPrice + minIncrement = ₹550 or higher)
    console.log('\n[Test 3] Place valid subsequent outbid (₹600 >= ₹550)');
    const res2 = await BidService.placeBid(bidder2._id, { listingId: listing._id, amount: 600 });
    if (res2.listing.currentPrice !== 600 || res2.listing.bidCount !== 2) {
      throw new Error(`Expected currentPrice 600 and bidCount 2, got ${res2.listing.currentPrice}, ${res2.listing.bidCount}`);
    }
    const leader2 = res2.listing.leadingBidder?._id || res2.listing.leadingBidder;
    if (leader2.toString() !== bidder2._id.toString()) {
      throw new Error('Expected bidder2 as leading bidder');
    }
    console.log(`✓ Test 3 Passed: Outbid placed at ₹600, leading bidder set to ${bidder2.name}.`);

    // TEST 4: Reject seller bidding on their own listing
    console.log('\n[Test 4] Reject seller bidding on their own listing');
    let rejectedSelf = false;
    try {
      await BidService.placeBid(seller._id, { listingId: listing._id, amount: 700 });
    } catch (err) {
      if ((err.statusCode === 400 || err.statusCode === 403) && err.message.toLowerCase().includes('own')) {
        rejectedSelf = true;
      }
    }
    if (!rejectedSelf) {
      throw new Error('Expected rejection when seller attempts to bid on their own listing');
    }
    console.log('✓ Test 4 Passed: Seller prevented from bidding on their own item.');

    // TEST 5: Reject a bid after closing time
    console.log('\n[Test 5] Reject bid after closing time');
    const expiredListing = await Listing.create({
      seller: seller._id,
      title: 'Expired Auction',
      category: 'stationery',
      itemType: 'calculator',
      description: 'Auction that already closed.',
      photos: ['/uploads/calc1.webp', '/uploads/calc2.webp'],
      condition: {
        grade: 'Good',
        age: '1 year',
        workingStatus: 'Fully functional',
        defects: 'None reported',
      },
      honestyDeclaration: true,
      startingPrice: 300,
      minIncrement: 20,
      currentPrice: 300,
      bidCount: 0,
      closingTime: new Date(Date.now() + 3600 * 1000), // future for creation
      status: 'active',
    });
    // Set to past to test server clock closing guard
    await Listing.findByIdAndUpdate(expiredListing._id, {
      closingTime: new Date(Date.now() - 3600 * 1000),
    });

    let rejectedExpired = false;
    try {
      await BidService.placeBid(bidder1._id, { listingId: expiredListing._id, amount: 350 });
    } catch (err) {
      if (err.statusCode === 400 && (err.message.includes('closed') || err.message.includes('ended') || err.message.includes('longer accepted') || err.message.includes('not active'))) {
        rejectedExpired = true;
      }
    }
    if (!rejectedExpired) {
      throw new Error('Expected 400 rejection for bidding on closed auction');
    }
    console.log('✓ Test 5 Passed: Bids on closed auction rejected with clear closed notification.');

    console.log('\n--- ALL ISSUE 5 TESTS PASSED SUCCESSFULLY ---');
  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
