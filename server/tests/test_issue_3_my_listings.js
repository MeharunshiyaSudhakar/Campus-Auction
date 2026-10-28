const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const ListingService = require('../src/services/listingService');

async function runTests() {
  console.log('--- RUNNING ISSUE 3 MY LISTINGS TESTS ---');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campus_auction');

  try {
    let testSeller = await User.findOne({ email: 'seller_issue3@test.com' });
    if (!testSeller) {
      testSeller = await User.create({
        name: 'Seller Issue 3',
        email: 'seller_issue3@test.com',
        password: 'password123',
        college: 'Test College',
        campusRollNumber: '21CS333',
        phoneNumber: '9876543210',
        emailVerified: true,
      });
    }

    // Clean up old test listings for this seller
    await Listing.deleteMany({ seller: testSeller._id });

    // TEST 1: Create multiple listings across different statuses and check order
    console.log('\n[Test 1] Create older listing and newer listing, verify newest first');
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);

    const oldListing = await Listing.create({
      seller: testSeller._id,
      title: 'Older Bicycle',
      category: 'vehicles',
      itemType: 'cycle',
      description: 'Older bicycle from first semester.',
      photos: ['/uploads/cycle1.webp', '/uploads/cycle2.webp'],
      condition: {
        grade: 'Good',
        age: '1 year',
        workingStatus: 'Fully functional',
        defects: 'None reported',
      },
      honestyDeclaration: true,
      startingPrice: 2000,
      currentPrice: 2000,
      closingTime: futureDate,
      status: 'active',
      createdAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
    });

    const newListing = await Listing.create({
      seller: testSeller._id.toString(), // Store as string to test string/ObjectId tolerance
      title: 'Brand New Calculator fx-991EX',
      category: 'stationery',
      itemType: 'calculator',
      description: 'Calculator just published right now.',
      photos: ['/uploads/calc1.webp', '/uploads/calc2.webp'],
      photoThumbnails: ['/uploads/calc1-thumb.webp', '/uploads/calc2-thumb.webp'],
      condition: {
        grade: 'Like new',
        age: '2 months',
        workingStatus: 'Fully functional',
        defects: 'None reported',
      },
      honestyDeclaration: true,
      startingPrice: 850,
      currentPrice: 850,
      closingTime: futureDate,
      status: 'active',
      createdAt: new Date(), // Just now
    });

    const myListings = await ListingService.getMyListings(testSeller._id);

    if (myListings.length < 2) {
      throw new Error(`Expected at least 2 listings, got ${myListings.length}`);
    }

    // Newest must be index 0
    if (myListings[0]._id.toString() !== newListing._id.toString()) {
      throw new Error(`Expected newly published listing at top (index 0). Found: ${myListings[0].title}`);
    }
    console.log(`✓ Test 1 Passed: Newest listing "${myListings[0].title}" returned at index 0.`);

    // TEST 2: ObjectId vs String tolerance
    console.log('\n[Test 2] Querying with string ID or ObjectId returns all items');
    const queryWithString = await ListingService.getMyListings(testSeller._id.toString());
    if (queryWithString.length !== myListings.length) {
      throw new Error(`Mismatch between ObjectId and String queries! ObjectId: ${myListings.length}, String: ${queryWithString.length}`);
    }
    console.log('✓ Test 2 Passed: Query with string ID or ObjectId produces identical complete result.');

    console.log('\n--- ALL ISSUE 3 TESTS PASSED SUCCESSFULLY ---');
  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
