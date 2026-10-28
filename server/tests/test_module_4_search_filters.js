const mongoose = require('mongoose');
const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Bid = require('../src/models/Bid');
const ListingService = require('../src/services/listingService');

async function runTests() {
  console.log('--- Starting Module 4: Search & Filters Test Suite ---');
  await mongoose.connect('mongodb://localhost:27017/campus_auction');

  // Clean test collection
  await Listing.deleteMany({ title: { $regex: /\[Test-M4\]/ } });
  await User.deleteMany({ email: { $regex: /m4test/ } });

  // 1. Create test users
  const seller = await User.create({
    name: 'Siddharth Senior',
    email: 'm4test_seller@campus.edu',
    campusRollNumber: 'CS20B099',
    password: 'password123',
  });

  const bidder = await User.create({
    name: 'Ananya Junior',
    email: 'm4test_bidder@campus.edu',
    campusRollNumber: 'EE24B012',
    password: 'password123',
  });

  // 2. Create sample test listings
  const future1 = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours
  const future2 = new Date(Date.now() + 8 * 3600 * 1000); // 8 hours
  const future3 = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours
  const future4 = new Date(Date.now() + 48 * 3600 * 1000); // 48 hours

  const item1 = await Listing.create({
    seller: seller._id,
    title: '[Test-M4] Hero Sprint Geared Cycle 21-Speed',
    category: 'cycle',
    description: 'Mountain terrain 21-speed bike with front suspension. Well maintained during 4th year.',
    photos: ['/uploads/bike1.jpg', '/uploads/bike2.jpg'],
    defectPhotoIncluded: true,
    condition: {
      grade: 'Fair',
      age: '2 years',
      workingStatus: 'Partially functional',
      defects: 'Rear brake pads worn down and slight rust on handlebar.',
      accessories: ['Lock', 'Bell', 'Cable'],
      categoryDetails: { cycle: { brakes: 'Needs adjustment', tyres: 'Good tread', frameSize: 'Medium', geared: true } },
    },
    honestyDeclaration: true,
    startingPrice: 1800,
    currentPrice: 1800,
    minIncrement: 50,
    closingTime: future1,
    status: 'active',
  });

  const item2 = await Listing.create({
    seller: seller._id,
    title: '[Test-M4] Casio fx-991ES Plus Scientific Calculator',
    category: 'calculator',
    description: 'Non-programmable scientific calculator permitted in end semester exams.',
    photos: ['/uploads/calc1.jpg', '/uploads/calc2.jpg'],
    condition: {
      grade: 'Good',
      age: '1 year',
      workingStatus: 'Fully functional',
      defects: 'None reported, normal plastic scratches on slide cover.',
      accessories: ['Original Slide Cover'],
      categoryDetails: { calculator: { display: 'Clear, no dead pixels', battery: 'Two-way power (Solar + Battery)' } },
    },
    honestyDeclaration: true,
    startingPrice: 450,
    currentPrice: 450,
    minIncrement: 25,
    closingTime: future2,
    status: 'active',
  });

  const item3 = await Listing.create({
    seller: seller._id,
    title: '[Test-M4] Introduction to Algorithms CLRS 3rd Edition',
    category: 'books',
    description: 'Classic Cormen algorithms textbook for CS juniors. Clean pages with pencil annotations in chapter 4.',
    photos: ['/uploads/clrs1.jpg', '/uploads/clrs2.jpg'],
    condition: {
      grade: 'Like new',
      age: '6 months',
      workingStatus: 'Fully functional',
      defects: 'None',
      accessories: ['Plastic wrap cover'],
      categoryDetails: { books: { edition: '3rd Edition Indian Reprint', markedPages: 'Light pencil marks only', binding: 'Intact' } },
    },
    honestyDeclaration: true,
    startingPrice: 350,
    currentPrice: 350,
    minIncrement: 20,
    closingTime: future3,
    status: 'active',
  });

  const item4 = await Listing.create({
    seller: seller._id,
    title: '[Test-M4] Dell 24-inch IPS Monitor SE2422H',
    category: 'electronics',
    description: 'Full HD 1080p monitor used for coding and hostel setup. Includes HDMI cable.',
    photos: ['/uploads/mon1.jpg', '/uploads/mon2.jpg'],
    condition: {
      grade: 'Good',
      age: '1.5 years',
      workingStatus: 'Fully functional',
      defects: 'None, zero dead pixels.',
      accessories: ['Power cord', 'High-speed HDMI cable'],
      categoryDetails: { electronics: { screenCondition: 'Flawless', portsFunctional: true } },
    },
    honestyDeclaration: true,
    startingPrice: 3800,
    currentPrice: 3800,
    minIncrement: 100,
    closingTime: future4,
    status: 'active',
  });

  // Create a bid for item 1 to test bid history retrieval
  const testBid = await Bid.create({
    listing: item1._id,
    bidder: bidder._id,
    amount: 1950,
    bidTime: new Date(),
  });
  item1.bidCount = 1;
  item1.currentPrice = 1950;
  item1.leadingBid = testBid._id;
  item1.leadingBidder = bidder._id;
  await item1.save();

  // Test 1: Category Filter
  const cycleResults = await ListingService.getListings({ category: 'cycle' });
  const cycleListings = cycleResults.listings.filter((l) => l.title.includes('[Test-M4]'));
  if (cycleListings.length === 1 && cycleListings[0].category === 'cycle') {
    console.log('[Test 1] Category Filter: PASSED (Returned only cycles)');
  } else {
    throw new Error(`Test 1 Failed: Expected 1 cycle, got ${cycleListings.length}`);
  }

  // Test 2: Condition Grade Filter
  const fairResults = await ListingService.getListings({ condition: 'Fair' });
  const fairListings = fairResults.listings.filter((l) => l.title.includes('[Test-M4]'));
  if (fairListings.length === 1 && fairListings[0].condition.grade === 'Fair') {
    console.log('[Test 2] Condition Grade Filter: PASSED (Returned only Fair condition items)');
  } else {
    throw new Error(`Test 2 Failed: Expected 1 Fair item, got ${fairListings.length}`);
  }

  // Test 3: Multi-Condition Grade Filter
  const multiCondition = await ListingService.getListings({ condition: 'Fair,Like new' });
  const multiListings = multiCondition.listings.filter((l) => l.title.includes('[Test-M4]'));
  if (multiListings.length === 2) {
    console.log('[Test 3] Multi-Condition Filter: PASSED (Returned Fair and Like new items)');
  } else {
    throw new Error(`Test 3 Failed: Expected 2 items, got ${multiListings.length}`);
  }

  // Test 4: Price Range Filter
  const priceFiltered = await ListingService.getListings({ minPrice: 300, maxPrice: 500 });
  const priceListings = priceFiltered.listings.filter((l) => l.title.includes('[Test-M4]'));
  const allInRange = priceListings.every((l) => l.currentPrice >= 300 && l.currentPrice <= 500);
  if (priceListings.length === 2 && allInRange) {
    console.log('[Test 4] Price Range Filter: PASSED (Items in ₹300 - ₹500 range)');
  } else {
    throw new Error(`Test 4 Failed: Expected 2 items, got ${priceListings.length}`);
  }

  // Test 5: Keyword Search across title, description, and defects
  const searchCasio = await ListingService.getListings({ q: 'Casio' });
  const casioItems = searchCasio.listings.filter((l) => l.title.includes('[Test-M4]'));
  if (casioItems.length === 1 && casioItems[0].title.includes('Casio')) {
    console.log('[Test 5A] Keyword Search (Title): PASSED');
  } else {
    throw new Error('Test 5A Failed: Could not find Casio by title keyword');
  }

  const searchDefect = await ListingService.getListings({ q: 'handlebar' });
  const defectItems = searchDefect.listings.filter((l) => l.title.includes('[Test-M4]'));
  if (defectItems.length === 1 && defectItems[0].category === 'cycle') {
    console.log('[Test 5B] Keyword Search (Defects): PASSED (Found item via defect disclosure text)');
  } else {
    throw new Error('Test 5B Failed: Could not find cycle via defect keyword');
  }

  // Test 6: Sorting
  const sortedPrice = await ListingService.getListings({ sort: 'price_asc' });
  const sortedItems = sortedPrice.listings.filter((l) => l.title.includes('[Test-M4]'));
  if (sortedItems[0].currentPrice <= sortedItems[1].currentPrice) {
    console.log('[Test 6] Sorting (Price Ascending): PASSED');
  } else {
    throw new Error('Test 6 Failed: Price ascending sort incorrect');
  }

  // Test 7: Pagination
  const page1 = await ListingService.getListings({ limit: 2, page: 1 });
  const page2 = await ListingService.getListings({ limit: 2, page: 2 });
  if (page1.listings.length === 2 && page1.pagination.page === 1 && page1.pagination.totalPages >= 2) {
    console.log('[Test 7] Pagination: PASSED (limit=2, page=1 returned 2 items with pagination meta)');
  } else {
    throw new Error('Test 7 Failed: Pagination meta mismatch');
  }

  // Test 8: Auction Detail Endpoint & Public Bid History
  const detail = await ListingService.getListingById(item1._id);
  if (!detail) throw new Error('Detail not found');
  if (detail.seller.email || detail.seller.rollNumber || detail.seller.password) {
    throw new Error('Test 8 Privacy Violation: Seller private fields leaked!');
  }
  if (!detail.seller.name) {
    throw new Error('Test 8 Failed: Seller public name missing');
  }
  if (!Array.isArray(detail.bids) || detail.bids.length !== 1) {
    throw new Error(`Test 8 Failed: Expected 1 public bid, got ${detail.bids ? detail.bids.length : 0}`);
  }
  if (detail.bids[0].bidder.email || detail.bids[0].bidder.rollNumber) {
    throw new Error('Test 8 Privacy Violation: Bidder private fields leaked in public bid history!');
  }
  if (detail.bids[0].amount !== 1950 || detail.bids[0].bidder.name !== 'Ananya Junior') {
    throw new Error('Test 8 Failed: Bidder details or amount mismatch in bid history');
  }
  if (typeof detail.timeLeftMs !== 'number' || !detail.serverTime) {
    throw new Error('Test 8 Failed: Missing server clock timing metadata');
  }
  console.log('[Test 8] Auction Detail & Public Bid History: PASSED (Zero private data leaks)');

  // Clean up
  await Listing.deleteMany({ title: { $regex: /\[Test-M4\]/ } });
  await User.deleteMany({ email: { $regex: /m4test/ } });
  await Bid.deleteMany({ listing: item1._id });

  console.log('\n=============================================');
  console.log('ALL MODULE 4 SEARCH, FILTERS & DETAIL TESTS PASSED!');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
