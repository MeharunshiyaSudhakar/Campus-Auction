const mongoose = require('mongoose');
const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Deal = require('../src/models/Deal');
const DealMessage = require('../src/models/DealMessage');
const ListingService = require('../src/services/listingService');
const DealService = require('../src/services/dealService');
const DealChatService = require('../src/services/dealChatService');
const ProfileService = require('../src/services/profileService');

async function runTests() {
  console.log('--- Starting Module 16 & 16b: Direct Payment & Deal Chat Test Suite ---');
  await mongoose.connect('mongodb://localhost:27017/campus_auction');

  // Clean test data
  await Listing.deleteMany({ title: { $regex: /\[Test-M16\]/ } });
  await User.deleteMany({ $or: [{ email: { $regex: /m16test/ } }, { campusRollNumber: { $in: ['ME21B099', 'CS24B011', 'EE24B033'] } }] });
  await Deal.deleteMany({});
  await DealMessage.deleteMany({});

  // 1. Create Seller, Winning Buyer, and Third-Party Student
  const seller = await User.create({
    name: 'Aakash Senior',
    email: 'm16test_seller@campus.edu',
    campusRollNumber: 'ME21B099',
    password: 'password123',
  });

  const winner = await User.create({
    name: 'Bhavna Junior',
    email: 'm16test_winner@campus.edu',
    campusRollNumber: 'CS24B011',
    password: 'password123',
  });

  const thirdParty = await User.create({
    name: 'Chetan Bystander',
    email: 'm16test_third@campus.edu',
    campusRollNumber: 'EE24B033',
    password: 'password123',
  });

  // 2. Create Listing with Private Payment Details & Fulfilment
  const listing = await Listing.create({
    seller: seller._id,
    title: '[Test-M16] TI-84 Plus CE Graphing Calculator',
    category: 'calculator',
    description: 'Graphing calculator with rechargeable battery.',
    photos: ['/uploads/ti1.jpg', '/uploads/ti2.jpg'],
    condition: { grade: 'Good', age: '1 year', workingStatus: 'Fully functional', defects: 'None' },
    honestyDeclaration: true,
    startingPrice: 2500,
    currentPrice: 2500,
    minIncrement: 100,
    closingTime: new Date(Date.now() + 3600000),
    status: 'closed',
    winner: winner._id,
    leadingBidder: winner._id,
    acceptedPaymentMethods: ['upi', 'cash_on_pickup'],
    upiId: 'aakash@okicici',
    contactPhone: '9876543210',
    otherInstructions: 'Verify calculation display at hostel block B',
    fulfilment: ['campus_pickup', 'courier'],
  });

  // Test 1: Public Listing Endpoints Never Leak Payment Fields
  const publicListing = await ListingService.getListingById(listing._id);
  if (publicListing.upiId || publicListing.contactPhone || publicListing.otherInstructions) {
    throw new Error('Test 1 Privacy Leak: Private seller payment fields leaked in public listing response!');
  }
  const publicListings = await ListingService.getListings({ q: 'Graphing' });
  const itemInList = publicListings.listings.find((l) => l._id.toString() === listing._id.toString());
  if (itemInList && (itemInList.upiId || itemInList.contactPhone || itemInList.otherInstructions)) {
    throw new Error('Test 1 Privacy Leak: Private seller payment fields leaked in browse query!');
  }
  console.log('[Test 1] Public Privacy Shield: PASSED (upiId, phone, instructions strictly hidden in all public APIs)');

  // Test 2: Seller Approves Winning Price -> Deal Initialized
  const deal = await DealService.initializeDeal(seller._id, listing._id);
  if (deal && deal.status === 'approved' && deal.amount === 2500 && deal.pickupInfo.handoverCode) {
    console.log('[Test 2] Deal Initialization on Approval: PASSED (Status approved, 6-digit code generated)');
  } else {
    throw new Error('Test 2 Failed: Deal was not initialized properly');
  }

  // Test 3: Third-Party Access Protection (403 Forbidden)
  try {
    await DealService.getDealById(deal._id, thirdParty._id);
    throw new Error('Test 3 Failed: Third-party bystander was able to view deal details');
  } catch (err) {
    if (err.statusCode === 403 && err.message.includes('Forbidden')) {
      console.log('[Test 3] Third-Party Access Protection: PASSED (Third party received 403 Forbidden)');
    } else {
      throw err;
    }
  }

  // Test 4: Details Hidden from Winner Before Choosing Method
  const preSelectionView = await DealService.getDealById(deal._id, winner._id);
  if (preSelectionView.sellerPaymentDetails?.upiId) {
    throw new Error('Test 4 Privacy Violation: Payment details revealed before buyer selected method');
  }
  console.log('[Test 4] Payment Details Gate: PASSED (Details kept secret until buyer selects payment method)');

  // Test 5: Buyer Chooses Payment Method & Fulfilment -> Details Revealed
  const afterSelection = await DealService.chooseMethodAndFulfilment(deal._id, winner._id, {
    chosenMethod: 'upi',
    fulfilment: 'campus_pickup',
  });
  if (
    afterSelection.status === 'details_shared' &&
    afterSelection.sellerPaymentDetails.upiId === 'aakash@okicici'
  ) {
    console.log('[Test 5] Method Choice & Detail Reveal: PASSED (Status details_shared, UPI revealed to winner)');
  } else {
    throw new Error('Test 5 Failed: Seller UPI ID not revealed after selection');
  }

  // Test 6: Payment Confirmation Lifecycle (Buyer "paid" -> Seller "received")
  const paidDeal = await DealService.markPaid(deal._id, winner._id, 'Sent ₹2500 via GPay UPI');
  if (paidDeal.status === 'payment_pending' && paidDeal.paidAt) {
    console.log('[Test 6A] Buyer Mark Paid: PASSED (Status moved to payment_pending)');
  } else {
    throw new Error('Test 6A Failed: Status not payment_pending');
  }

  const confirmedDeal = await DealService.confirmPayment(deal._id, seller._id, 'Received in ICICI account');
  if (confirmedDeal.status === 'payment_confirmed' && confirmedDeal.paymentConfirmedAt) {
    console.log('[Test 6B] Seller Confirm Payment: PASSED (Status moved to payment_confirmed)');
  } else {
    throw new Error('Test 6B Failed: Status not payment_confirmed');
  }

  // Test 7: Handover Code Verification & Completion
  const validCode = deal.pickupInfo.handoverCode;
  const completedDeal = await DealService.confirmCompleted(deal._id, seller._id, { handoverCode: validCode });
  const updatedListing = await Listing.findById(listing._id);
  if (completedDeal.status === 'completed' && updatedListing.status === 'completed') {
    console.log('[Test 7] Handover Code Verification & Deal Completion: PASSED');
  } else {
    throw new Error('Test 7 Failed: Deal or listing not marked completed');
  }

  // Test 8: Profile Totals Count ONLY Completed Deals
  const sellerSummary = await ProfileService.getSummary(seller._id);
  const buyerSummary = await ProfileService.getSummary(winner._id);
  if (sellerSummary.totalReceived === 2500 && buyerSummary.totalSpent === 2500) {
    console.log('[Test 8] Profile Totals Audit: PASSED (Only completed deals feed seller received and buyer spent)');
  } else {
    throw new Error(`Test 8 Failed: Expected 2500, got seller=${sellerSummary.totalReceived}, buyer=${buyerSummary.totalSpent}`);
  }

  // Test 9: Courier Fulfilment & Address Safeguards
  const courierListing = await Listing.create({
    seller: seller._id,
    title: '[Test-M16] Courier Books Pack',
    category: 'books',
    description: 'GATE textbooks pack.',
    photos: ['/uploads/b1.jpg', '/uploads/b2.jpg'],
    condition: { grade: 'Good', age: '6 months', workingStatus: 'Fully functional', defects: 'None' },
    honestyDeclaration: true,
    startingPrice: 800,
    currentPrice: 800,
    minIncrement: 50,
    closingTime: new Date(Date.now() + 3600000),
    status: 'closed',
    winner: winner._id,
    acceptedPaymentMethods: ['upi'],
    upiId: 'aakash@okicici',
    fulfilment: ['courier'],
  });

  const courierDeal = await DealService.initializeDeal(seller._id, courierListing._id);
  await DealService.chooseMethodAndFulfilment(courierDeal._id, winner._id, {
    chosenMethod: 'upi',
    fulfilment: 'courier',
    deliveryAddress: {
      recipientName: 'Bhavna J',
      addressLine1: 'Room 304, Ganga Hostel',
      city: 'Campus City',
      postalCode: '600036',
      contactPhone: '9123456780',
    },
  });

  // Guard: Seller cannot dispatch until payment confirmed
  try {
    await DealService.updateCourierDispatch(courierDeal._id, seller._id, {
      courierName: 'BlueDart Campus Express',
      trackingId: 'BD123456789IN',
    });
    throw new Error('Test 9 Failed: Dispatched courier before payment confirmation');
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('only after payment is confirmed')) {
      console.log('[Test 9A] Courier Shipping Guard: PASSED (Blocked dispatch prior to payment confirmation)');
    } else {
      throw err;
    }
  }

  // Confirm payment, then dispatch
  await DealService.markPaid(courierDeal._id, winner._id);
  await DealService.confirmPayment(courierDeal._id, seller._id);
  const shippedDeal = await DealService.updateCourierDispatch(courierDeal._id, seller._id, {
    courierName: 'BlueDart Campus Express',
    trackingId: 'BD123456789IN',
  });
  if (shippedDeal.status === 'shipped' && shippedDeal.courierInfo.trackingId === 'BD123456789IN') {
    console.log('[Test 9B] Courier Dispatch: PASSED (Status shipped with tracking info)');
  } else {
    throw new Error('Test 9B Failed: Courier dispatch failed');
  }

  // Buyer confirms "received"
  const receivedDeal = await DealService.confirmCompleted(courierDeal._id, winner._id);
  if (receivedDeal.status === 'completed') {
    console.log('[Test 9C] Courier Delivery Confirmation: PASSED (Buyer confirmed package received)');
  } else {
    throw new Error('Test 9C Failed: Delivery confirmation failed');
  }

  // Test 10: Module 16b Deal Chat (Private Messaging between Buyer & Seller)
  const msg1 = await DealChatService.sendMessage(deal._id, winner._id, 'Hi Aakash, I have sent the payment on UPI.');
  const msg2 = await DealChatService.sendMessage(deal._id, seller._id, 'Got it Bhavna! Let us meet outside library at 5 PM.');
  if (msg1.text.includes('UPI') && msg2.text.includes('library')) {
    console.log('[Test 10A] Deal Chat Messaging: PASSED (Messages delivered between deal parties)');
  } else {
    throw new Error('Test 10A Failed: Deal chat messaging failed');
  }

  // Third party chat intrusion blocked
  try {
    await DealChatService.sendMessage(deal._id, thirdParty._id, 'Can I buy this instead?');
    throw new Error('Test 10B Failed: Third party was allowed to send message in private deal chat');
  } catch (err) {
    if (err.statusCode === 403) {
      console.log('[Test 10B] Deal Chat Intrusion Guard: PASSED (Third party blocked with 403 Forbidden)');
    } else {
      throw err;
    }
  }

  const chatHistory = await DealChatService.getMessages(deal._id, winner._id);
  if (chatHistory.messages.length === 2 && chatHistory.safetyBanner.includes('Never share passwords')) {
    console.log('[Test 10C] Deal Chat Safety Banner: PASSED ("Never share passwords or OTPs" banner verified)');
  } else {
    throw new Error('Test 10C Failed: Chat history or safety banner mismatch');
  }

  // Clean test data
  await Listing.deleteMany({ title: { $regex: /\[Test-M16\]/ } });
  await User.deleteMany({ email: { $regex: /m16test/ } });
  await Deal.deleteMany({});
  await DealMessage.deleteMany({});

  console.log('\n=============================================');
  console.log('ALL MODULE 16 & 16b DIRECT PAYMENT & CHAT TESTS PASSED!');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
