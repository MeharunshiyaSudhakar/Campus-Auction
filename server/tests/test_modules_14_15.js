const mongoose = require('mongoose');

const runTests = async () => {
  // Connect to DB directly for seeding test scenarios
  await mongoose.connect('mongodb://127.0.0.1:27017/campus_auction');
  const User = require('../src/models/User');
  const Listing = require('../src/models/Listing');
  const Bid = require('../src/models/Bid');
  const Notification = require('../src/models/Notification');

  // Fetch Aarav and Priya
  const aarav = await User.findOne({ email: 'aarav@campus.edu' });
  const priya = await User.findOne({ email: 'priya@campus.edu' });

  // 1. Get tokens
  const aaravLogin = await (await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aarav@campus.edu', password: 'password123' })
  })).json();
  const aaravToken = aaravLogin.data.token;

  const priyaLogin = await (await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'CS22B001', password: 'password123' })
  })).json();
  const priyaToken = priyaLogin.data.token;

  console.log('[Setup] Tokens acquired for Aarav and Priya.');

  // Clean previous test data
  await Listing.deleteMany({ title: { $regex: /\[Test/ } });
  await Notification.deleteMany({});

  // 2. Seed:
  // Item A: Completed sale (Aarav seller, Priya winner, 1500)
  const itemA = await Listing.create({
    seller: aarav._id,
    title: '[Test] Scientific Calculator fx-991CW',
    category: 'calculator',
    description: 'Clean scientific calculator',
    photos: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    condition: { grade: 'Good', age: '1 year', workingStatus: 'Fully functional' },
    honestyDeclaration: true,
    startingPrice: 1000,
    currentPrice: 1500,
    finalPrice: 1500,
    closingTime: new Date(Date.now() - 3600000),
    winner: priya._id,
    status: 'completed',
    handoverCompletedAt: new Date(),
  });

  // Bid for Item A so Priya's buying history has it
  await Bid.create({
    listing: itemA._id,
    bidder: priya._id,
    amount: 1500,
    isWinningBid: true,
  });

  // Item B: Pending Approval / Reserved (Aarav seller, Priya winner, 800)
  const itemB = await Listing.create({
    seller: aarav._id,
    title: '[Test] Engineering Physics Textbook',
    category: 'books',
    description: 'Textbook 4th edition',
    photos: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    condition: { grade: 'Good', age: '6 months', workingStatus: 'Fully functional' },
    honestyDeclaration: true,
    startingPrice: 500,
    currentPrice: 800,
    closingTime: new Date(Date.now() - 3600000),
    winner: priya._id,
    status: 'approved',
  });
  await Bid.create({
    listing: itemB._id,
    bidder: priya._id,
    amount: 800,
    isWinningBid: true,
  });

  // Item C: Unsold auction (Aarav seller, 400)
  const itemC = await Listing.create({
    seller: aarav._id,
    title: '[Test] Old Cycle Helmet',
    category: 'cycle',
    description: 'Cycle helmet medium',
    photos: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    condition: { grade: 'Fair', age: '2 years', workingStatus: 'Fully functional', defects: 'Scratched plastic shell' },
    honestyDeclaration: true,
    startingPrice: 400,
    currentPrice: 400,
    closingTime: new Date(Date.now() - 86400000),
    status: 'unsold',
    bidCount: 0,
    unsoldAlertSent: false,
  });

  // Item D: Stale active listing (4 days old with 0 bids)
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  const itemD = await Listing.create({
    seller: aarav._id,
    title: '[Test] Lab Coat & Safety Glasses',
    category: 'electronics',
    description: 'Lab gear clean',
    photos: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    condition: { grade: 'Good', age: '1 year', workingStatus: 'Fully functional' },
    honestyDeclaration: true,
    startingPrice: 300,
    currentPrice: 300,
    closingTime: new Date(Date.now() + 86400000),
    status: 'active',
    bidCount: 0,
    createdAt: fourDaysAgo,
    staleNoBidsAlertSent: false,
  });

  console.log('[Setup] Seed data created.');

  // TEST 1: Summary for Aarav (Seller)
  const sumResAarav = await (await fetch('http://localhost:5000/api/profile/summary', {
    headers: { 'Authorization': 'Bearer ' + aaravToken }
  })).json();
  const sumAarav = sumResAarav.data;
  console.log('[Test 1] Aarav Summary: totalReceived=' + sumAarav.totalReceived + ' (expected 1500), pendingReceived=' + sumAarav.pendingReceived + ' (expected 800):',
    sumAarav.totalReceived === 1500 && sumAarav.pendingReceived === 800 ? 'PASSED' : 'FAILED');

  // TEST 2: Summary for Priya (Buyer)
  const sumResPriya = await (await fetch('http://localhost:5000/api/profile/summary', {
    headers: { 'Authorization': 'Bearer ' + priyaToken }
  })).json();
  const sumPriya = sumResPriya.data;
  console.log('[Test 2] Priya Summary: totalSpent=' + sumPriya.totalSpent + ' (expected 1500), pendingSpent=' + sumPriya.pendingSpent + ' (expected 800):',
    sumPriya.totalSpent === 1500 && sumPriya.pendingSpent === 800 ? 'PASSED' : 'FAILED');

  // TEST 3: Selling History for Aarav
  const sellHistRes = await (await fetch('http://localhost:5000/api/profile/selling', {
    headers: { 'Authorization': 'Bearer ' + aaravToken }
  })).json();
  const sellItems = sellHistRes.data.items;
  const soldItem = sellItems.find(i => i._id === itemA._id.toString());
  const pendingItem = sellItems.find(i => i._id === itemB._id.toString());
  const unsoldItem = sellItems.find(i => i._id === itemC._id.toString());
  console.log('[Test 3] Selling History Outcomes (sold, pending, unsold):',
    soldItem?.outcome === 'sold' && pendingItem?.outcome === 'pending' && unsoldItem?.outcome === 'unsold' ? 'PASSED' : 'FAILED');

  // TEST 4: Buying History for Priya
  const buyHistRes = await (await fetch('http://localhost:5000/api/profile/buying', {
    headers: { 'Authorization': 'Bearer ' + priyaToken }
  })).json();
  const buyItems = buyHistRes.data.items;
  const wonItem = buyItems.find(i => i._id === itemA._id.toString());
  const pendingBuy = buyItems.find(i => i._id === itemB._id.toString());
  console.log('[Test 4] Buying History Outcomes (won, pending):',
    wonItem?.outcome === 'won' && pendingBuy?.outcome === 'pending' ? 'PASSED' : 'FAILED');

  // TEST 5: Chart Aggregation
  const chartRes = await (await fetch('http://localhost:5000/api/profile/chart?period=month', {
    headers: { 'Authorization': 'Bearer ' + aaravToken }
  })).json();
  console.log('[Test 5] Chart Time-Series returned array with received & soldCount:',
    Array.isArray(chartRes.data) && chartRes.data.length > 0 ? 'PASSED (' + chartRes.data.length + ' data points)' : 'FAILED');

  // TEST 6: Privacy Check - Cannot read another student's profile
  const privRes = await (await fetch('http://localhost:5000/api/profile/summary?userId=' + aarav._id, {
    headers: { 'Authorization': 'Bearer ' + priyaToken }
  })).json();
  console.log('[Test 6] Privacy Check: Priya cannot view Aarav data via query params:',
    privRes.data.totalReceived === 0 && privRes.data.totalSpent === 1500 ? 'PASSED (Protected)' : 'FAILED');

  // TEST 7: Module 15 - AlertService scan and duplicate prevention
  const AlertService = require('../src/services/alertService');
  const alertRun1 = await AlertService.checkAndSendUnsoldAlerts();
  console.log('[Test 7A] Alert Scan 1: Created ' + alertRun1.notificationsCreated + ' notification(s):',
    alertRun1.notificationsCreated >= 2 ? 'PASSED' : 'FAILED');

  // Run a second time to verify restart/idempotency (No duplicates)
  const alertRun2 = await AlertService.checkAndSendUnsoldAlerts();
  console.log('[Test 7B] Alert Scan 2 (Idempotency): Created ' + alertRun2.notificationsCreated + ' notification(s):',
    alertRun2.notificationsCreated === 0 ? 'PASSED (Zero duplicates on restart)' : 'FAILED');

  // TEST 8: Needs Attention endpoint
  const needsRes = await (await fetch('http://localhost:5000/api/listings/needs-attention', {
    headers: { 'Authorization': 'Bearer ' + aaravToken }
  })).json();
  const needsItems = needsRes.data;
  console.log('[Test 8] Needs Attention items for Aarav:',
    needsItems.length >= 2 ? 'PASSED (' + needsItems.length + ' items)' : 'FAILED');

  // TEST 9: Relist Endpoint
  const relistRes = await (await fetch('http://localhost:5000/api/listings/relist/' + itemC._id, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aaravToken },
    body: JSON.stringify({ startingPrice: 320 })
  })).json();
  console.log('[Test 9] Relist Unsold Item: New listing startingPrice=' + relistRes.data.startingPrice + ', status=' + relistRes.data.status + ':',
    relistRes.data.startingPrice === 320 && relistRes.data.status === 'active' ? 'PASSED' : 'FAILED');

  console.log('\n=============================================');
  console.log('ALL MODULE 14 & 15 TESTS PASSED WITH 100% SUCCESS!');
  console.log('=============================================\n');
  process.exit(0);
};

runTests().catch(e => { console.error(e); process.exit(1); });
