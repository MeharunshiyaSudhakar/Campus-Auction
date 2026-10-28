const http = require('http');
const mongoose = require('mongoose');
const { io: ClientIO } = require('socket.io-client');
const { initSocket } = require('../src/config/socket');
const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Bid = require('../src/models/Bid');
const BidService = require('../src/services/bidService');

async function runTests() {
  console.log('--- Starting Module 6: Live Updates & Anti-Sniping Extension Test Suite ---');
  await mongoose.connect('mongodb://localhost:27017/campus_auction');

  // 1. Setup Ephemeral HTTP + Socket.io Server on port 5055
  const server = http.createServer();
  initSocket(server);
  await new Promise((resolve) => server.listen(5055, resolve));
  console.log('Test Socket.io server running on port 5055');

  // 2. Connect Client Socket
  const clientSocket = ClientIO('http://localhost:5055', {
    transports: ['websocket'],
    forceNew: true,
  });

  await new Promise((resolve) => clientSocket.on('connect', resolve));
  console.log('Test client socket connected:', clientSocket.id);

  // Clean test data
  await Listing.deleteMany({ title: { $regex: /\[Test-M6\]/ } });
  await User.deleteMany({ $or: [{ email: { $regex: /m6test/ } }, { campusRollNumber: { $regex: /B60/ } }] });

  // 3. Create Seller and Two Bidders
  const seller = await User.create({
    name: 'Ramesh Senior',
    email: 'm6test_seller@campus.edu',
    campusRollNumber: 'ME21B601',
    password: 'password123',
  });

  const bidder1 = await User.create({
    name: 'Pooja Junior',
    email: 'm6test_bidder1@campus.edu',
    campusRollNumber: 'CS24B602',
    password: 'password123',
  });

  const bidder2 = await User.create({
    name: 'Siddharth Junior',
    email: 'm6test_bidder2@campus.edu',
    campusRollNumber: 'EE24B603',
    password: 'password123',
  });

  // TEST 1: Standard Bid emits `new_bid` and `listing_price_updated` (No extension when > 30s)
  console.log('\n--- TEST 1: Standard Bid Real-Time Event Broadcast ---');
  const futureClosing = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now (> 30s)
  const item1 = await Listing.create({
    seller: seller._id,
    title: '[Test-M6] Hercules Cycle 26T',
    category: 'vehicles',
    description: 'Dual suspension cycle in great campus condition.',
    photos: ['/uploads/photo1.jpg', '/uploads/photo2.jpg'],
    condition: { grade: 'Good', age: '1 year', workingStatus: 'Fully functional' },
    honestyDeclaration: true,
    startingPrice: 1200,
    currentPrice: 1200,
    minIncrement: 50,
    closingTime: futureClosing,
    status: 'active',
  });

  clientSocket.emit('join_auction', item1._id.toString());

  // Listen for new_bid and listing_price_updated
  const test1Promise = new Promise((resolve, reject) => {
    let receivedNewBid = false;
    let receivedGlobalUpdate = false;

    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for Test 1 Socket.io events'));
    }, 4000);

    clientSocket.on('new_bid', (data) => {
      if (data.listingId === item1._id.toString()) {
        receivedNewBid = true;
        try {
          if (data.amount !== 1300) throw new Error(`Expected amount 1300, got ${data.amount}`);
          if (data.currentPrice !== 1300) throw new Error(`Expected currentPrice 1300, got ${data.currentPrice}`);
          if (data.bidCount !== 1) throw new Error(`Expected bidCount 1, got ${data.bidCount}`);
          if (data.extended !== false) throw new Error(`Expected extended to be false, got ${data.extended}`);
          if (data.leadingBidder.name !== 'Pooja Junior') throw new Error(`Expected bidder Pooja Junior, got ${data.leadingBidder.name}`);
          // Verify zero sensitive leaks
          if (data.leadingBidder.email || data.leadingBidder.campusRollNumber || data.bidder?.email) {
            throw new Error('Sensitive personal details leaked in Socket.io broadcast!');
          }
          if (receivedNewBid && receivedGlobalUpdate) {
            clearTimeout(timeout);
            resolve();
          }
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      }
    });

    clientSocket.on('listing_price_updated', (data) => {
      if (data.listingId === item1._id.toString()) {
        receivedGlobalUpdate = true;
        if (data.currentPrice !== 1300 || data.bidCount !== 1) {
          clearTimeout(timeout);
          reject(new Error('listing_price_updated payload mismatch'));
        }
        if (receivedNewBid && receivedGlobalUpdate) {
          clearTimeout(timeout);
          resolve();
        }
      }
    });
  });

  await BidService.placeBid(bidder1._id, { listingId: item1._id, amount: 1300 });
  await test1Promise;
  console.log('✓ TEST 1 PASSED: Real-time new_bid and listing_price_updated received with 0 sensitive leaks');

  // TEST 2: Anti-Sniping Rule: Bid placed in final 20 seconds triggers 60s extension
  console.log('\n--- TEST 2: Anti-Sniping 30s Trigger and 60s Extension ---');
  const closingIn20s = new Date(Date.now() + 20 * 1000); // 20 seconds remaining (< 30s)
  const item2 = await Listing.create({
    seller: seller._id,
    title: '[Test-M6] Scientific Calculator Casio fx-991',
    category: 'stationery',
    description: 'Exam ready calculator.',
    photos: ['/uploads/photo1.jpg', '/uploads/photo2.jpg'],
    condition: { grade: 'Good', age: '6 months', workingStatus: 'Fully functional' },
    honestyDeclaration: true,
    startingPrice: 600,
    currentPrice: 600,
    minIncrement: 50,
    closingTime: closingIn20s,
    status: 'active',
  });

  clientSocket.emit('join_auction', item2._id.toString());

  const test2Promise = new Promise((resolve, reject) => {
    let receivedExtendedEvent = false;
    let receivedExtendedBid = false;

    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for Anti-Sniping Socket.io events'));
    }, 4000);

    clientSocket.on('auction_extended', (data) => {
      if (data.listingId === item2._id.toString()) {
        receivedExtendedEvent = true;
        const newClosing = new Date(data.newClosingTime).getTime();
        const now = Date.now();
        // New closing time should be roughly 60 seconds from now (~58000ms to ~62000ms)
        const diff = newClosing - now;
        if (diff < 55000 || diff > 65000) {
          clearTimeout(timeout);
          reject(new Error(`Extended closing time was not ~60s from now (diff: ${diff}ms)`));
          return;
        }
        if (receivedExtendedEvent && receivedExtendedBid) {
          clearTimeout(timeout);
          resolve();
        }
      }
    });

    clientSocket.on('new_bid', (data) => {
      if (data.listingId === item2._id.toString()) {
        receivedExtendedBid = true;
        if (!data.extended) {
          clearTimeout(timeout);
          reject(new Error('Expected new_bid.extended to be true in anti-sniping window'));
          return;
        }
        if (receivedExtendedEvent && receivedExtendedBid) {
          clearTimeout(timeout);
          resolve();
        }
      }
    });
  });

  const bidResult = await BidService.placeBid(bidder1._id, { listingId: item2._id, amount: 650 });
  if (!bidResult.extended) {
    throw new Error('Expected bidResult.extended to be true');
  }

  await test2Promise;

  // Verify database record was updated with the extended closing time
  const updatedItem2 = await Listing.findById(item2._id);
  const dbDiff = new Date(updatedItem2.closingTime).getTime() - Date.now();
  if (dbDiff < 55000) {
    throw new Error(`Database listing was not extended properly: ${dbDiff}ms remaining`);
  }
  console.log(`✓ TEST 2 PASSED: Anti-sniping triggered. Auction extended by 60s (DB remaining: ${Math.round(dbDiff / 1000)}s)`);

  // TEST 3: Multiple Extensions in a Row
  console.log('\n--- TEST 3: Multiple Extensions in a Row ---');
  // Fast forward: artificially simulate another bid when item2 has 15 seconds remaining again
  const artificiallyNearClose = new Date(Date.now() + 15 * 1000);
  updatedItem2.closingTime = artificiallyNearClose;
  await updatedItem2.save();

  const secondBidResult = await BidService.placeBid(bidder2._id, { listingId: item2._id, amount: 750 });
  if (!secondBidResult.extended) {
    throw new Error('Expected second bid in 15s window to also trigger extension');
  }

  const reUpdatedItem2 = await Listing.findById(item2._id);
  const secondDbDiff = new Date(reUpdatedItem2.closingTime).getTime() - Date.now();
  if (secondDbDiff < 55000) {
    throw new Error(`Second extension failed: ${secondDbDiff}ms remaining`);
  }
  console.log(`✓ TEST 3 PASSED: Multiple extensions work sequentially (new remaining: ${Math.round(secondDbDiff / 1000)}s)`);

  // TEST 4: Bid Rejected when Server Clock confirms Auction is Closed
  console.log('\n--- TEST 4: Server-Clock Enforcement on Closed Auction ---');
  const expiredItem = await Listing.create({
    seller: seller._id,
    title: '[Test-M6] Expired Auction Item',
    category: 'books',
    description: 'Engineering mathematics textbook.',
    photos: ['/uploads/photo1.jpg', '/uploads/photo2.jpg'],
    condition: { grade: 'Good', age: '2 years', workingStatus: 'Fully functional' },
    honestyDeclaration: true,
    startingPrice: 300,
    currentPrice: 300,
    minIncrement: 50,
    closingTime: new Date(Date.now() + 60000), // Created with valid future time
    status: 'active',
  });

  // Artificially simulate natural passage of time into past
  await Listing.updateOne({ _id: expiredItem._id }, { $set: { closingTime: new Date(Date.now() - 5000) } });

  try {
    await BidService.placeBid(bidder1._id, { listingId: expiredItem._id, amount: 350 });
    throw new Error('Bid on expired auction should have been rejected');
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('Auction has closed')) {
      console.log('✓ TEST 4 PASSED: Server clock rejected bid on expired auction with status 400');
    } else {
      throw err;
    }
  }

  // Cleanup
  clientSocket.disconnect();
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  console.log('\n======================================================');
  console.log('✅ ALL MODULE 6 REAL-TIME & ANTI-SNIPING TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Module 6 Test Suite Failed:\n', err);
  process.exit(1);
});
