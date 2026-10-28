const mongoose = require('mongoose');
const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Question = require('../src/models/Question');
const Notification = require('../src/models/Notification');
const QaService = require('../src/services/qaService');
const NotificationService = require('../src/services/notificationService');

async function runTests() {
  console.log('--- Starting Modules 9 & 10: Notifications & Pre-Bid Public Q&A Test Suite ---');
  await mongoose.connect('mongodb://localhost:27017/campus_auction');

  // Clean test data
  await Listing.deleteMany({ title: { $regex: /\[Test-M910\]/ } });
  await User.deleteMany({ $or: [{ email: { $regex: /m910test/ } }, { campusRollNumber: { $regex: /B910/ } }] });
  await Question.deleteMany({});
  await Notification.deleteMany({});

  // 1. Create Seller and Two Prospective Buyers
  const seller = await User.create({
    name: 'Harish Senior',
    email: 'm910test_seller@campus.edu',
    campusRollNumber: 'ME21B910',
    password: 'password123',
  });

  const buyer1 = await User.create({
    name: 'Sneha Junior',
    email: 'm910test_buyer1@campus.edu',
    campusRollNumber: 'CS24B911',
    password: 'password123',
  });

  const buyer2 = await User.create({
    name: 'Varun Junior',
    email: 'm910test_buyer2@campus.edu',
    campusRollNumber: 'EE24B912',
    password: 'password123',
  });

  // 2. Create Active Listing
  const validFuture = new Date(Date.now() + 24 * 3600 * 1000);
  const item = await Listing.create({
    seller: seller._id,
    title: '[Test-M910] Casio fx-991ES Plus Scientific Calculator',
    category: 'stationery',
    description: 'Silver edition engineering calculator with solar panel.',
    photos: ['/uploads/c1.jpg', '/uploads/c2.jpg'],
    condition: { grade: 'Good', age: '1 year', workingStatus: 'Fully functional' },
    honestyDeclaration: true,
    startingPrice: 500,
    currentPrice: 500,
    minIncrement: 50,
    closingTime: validFuture,
    status: 'active',
  });

  // TEST 1: Prospective Buyer Asks Question & Seller Receives Notification
  console.log('\n--- TEST 1: Buyer Asks Question & Seller Notified ---');
  const q1 = await QaService.askQuestion(
    buyer1._id,
    item._id,
    'Does the solar panel work properly under low desk lighting?'
  );

  if (q1.question !== 'Does the solar panel work properly under low desk lighting?') {
    throw new Error('Question text mismatch');
  }
  if (q1.isAnswered !== false) {
    throw new Error('New question should have isAnswered: false');
  }

  // Verify Seller received qa_question notification
  const sellerNotif = await Notification.findOne({ user: seller._id, type: 'qa_question' });
  if (!sellerNotif || !sellerNotif.message.includes('solar panel work')) {
    throw new Error('Seller was not notified of new question');
  }
  console.log('✓ TEST 1 PASSED: Buyer asked question and seller received in-app notification');

  // TEST 2: Seller Self-Question Guard
  console.log('\n--- TEST 2: Seller Self-Question Guard ---');
  try {
    await QaService.askQuestion(seller._id, item._id, 'Can I ask my own item?');
    throw new Error('Seller should not be allowed to ask question on own listing');
  } catch (err) {
    if (err.statusCode === 403) {
      console.log('✓ TEST 2 PASSED: Seller blocked from asking question on own listing (403 Forbidden)');
    } else {
      throw err;
    }
  }

  // TEST 3: External Link / Spam Filter Guard
  console.log('\n--- TEST 3: External Link / Anti-Spam Guard ---');
  try {
    await QaService.askQuestion(buyer1._id, item._id, 'Contact me at https://telegram.me/cheapprices for off-campus deals');
    throw new Error('External links in questions should be rejected');
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('external links')) {
      console.log('✓ TEST 3 PASSED: External link and off-platform spam attempt rejected (400)');
    } else {
      throw err;
    }
  }

  // TEST 4: Rate Limit Guard (Max 3 questions per student per listing)
  console.log('\n--- TEST 4: Max 3 Questions Rate Limit Guard ---');
  // Question 2 by buyer1
  await QaService.askQuestion(buyer1._id, item._id, 'Is the sliding hard cover included with the calculator?');
  // Question 3 by buyer1
  await QaService.askQuestion(buyer1._id, item._id, 'Has the battery ever been replaced?');

  // 4th Question should be rejected
  try {
    await QaService.askQuestion(buyer1._id, item._id, '4th question should be blocked to prevent spamming');
    throw new Error('4th question should have been blocked by rate limiter');
  } catch (err) {
    if (err.statusCode === 429 && err.message.includes('Rate limit reached')) {
      console.log('✓ TEST 4 PASSED: Rate limit strictly enforced (Max 3 questions allowed per student per listing)');
    } else {
      throw err;
    }
  }

  // TEST 5: Seller Answers Question & Buyer Notified
  console.log('\n--- TEST 5: Seller Answers Question & Asker Notified ---');
  const answeredQ = await QaService.answerQuestion(
    seller._id,
    q1._id,
    'Yes, the dual-power solar cell works under normal library and room lighting without any issues.'
  );

  if (!answeredQ.isAnswered || !answeredQ.answer) {
    throw new Error('Question not marked as answered');
  }

  // Verify Buyer 1 received qa_answered notification
  const buyerNotif = await Notification.findOne({ user: buyer1._id, type: 'qa_answered' });
  if (!buyerNotif || !buyerNotif.message.includes('dual-power solar')) {
    throw new Error('Buyer was not notified of answered question');
  }
  console.log('✓ TEST 5 PASSED: Seller answered question and asker received notification with answer snippet');

  // TEST 6: Public Visibility Rules
  console.log('\n--- TEST 6: Public Q&A Privacy & Visibility Scopes ---');
  // Anonymous / Other Student (buyer2) viewing listing questions:
  const publicView = await QaService.getListingQuestions(item._id, buyer2._id);
  // Only answered questions should appear for buyer2
  const answeredOnly = publicView.questions.every((q) => q.isAnswered);
  if (!answeredOnly || publicView.questions.length !== 1) {
    throw new Error(`Public should only see answered questions. Got: ${publicView.questions.length}`);
  }
  if (publicView.remainingCount !== 3) {
    throw new Error(`Buyer 2 has asked 0 questions, remaining should be 3. Got: ${publicView.remainingCount}`);
  }

  // Buyer 1 viewing: sees answered question + their 2 pending questions
  const buyer1View = await QaService.getListingQuestions(item._id, buyer1._id);
  if (buyer1View.questions.length !== 3) {
    throw new Error(`Buyer 1 should see all 3 of their questions. Got: ${buyer1View.questions.length}`);
  }
  if (buyer1View.remainingCount !== 0) {
    throw new Error(`Buyer 1 remaining count should be 0. Got: ${buyer1View.remainingCount}`);
  }

  // Seller viewing: sees all questions
  const sellerView = await QaService.getListingQuestions(item._id, seller._id);
  if (sellerView.questions.length !== 3 || !sellerView.isSeller) {
    throw new Error('Seller should see all questions (answered and pending)');
  }
  console.log('✓ TEST 6 PASSED: Visibility rules properly scoped for public, asker, and seller');

  // TEST 7: Notification Service & Unread Badges
  console.log('\n--- TEST 7: Notifications Center & Unread Count ---');
  const initialUnread = await NotificationService.getUnreadCount(buyer1._id);
  if (initialUnread.unreadCount !== 1) {
    throw new Error(`Expected 1 unread notification for buyer 1, got ${initialUnread.unreadCount}`);
  }

  const notifsList = await NotificationService.getUserNotifications(buyer1._id);
  if (notifsList.notifications.length !== 1) {
    throw new Error(`Expected 1 notification in list, got ${notifsList.notifications.length}`);
  }

  // Mark single as read
  await NotificationService.markAsRead(buyerNotif._id, buyer1._id);
  const afterRead = await NotificationService.getUnreadCount(buyer1._id);
  if (afterRead.unreadCount !== 0) {
    throw new Error(`Expected 0 unread after marking read, got ${afterRead.unreadCount}`);
  }

  // Test markAllAsRead
  await Notification.create({
    user: seller._id,
    type: 'outbid',
    title: 'Test Unread 1',
    message: 'Testing mark all',
  });
  await Notification.create({
    user: seller._id,
    type: 'outbid',
    title: 'Test Unread 2',
    message: 'Testing mark all',
  });

  const sellerInitialUnread = await NotificationService.getUnreadCount(seller._id);
  if (sellerInitialUnread.unreadCount < 2) {
    throw new Error('Seller should have unread notifications');
  }

  await NotificationService.markAllAsRead(seller._id);
  const sellerAfterReadAll = await NotificationService.getUnreadCount(seller._id);
  if (sellerAfterReadAll.unreadCount !== 0) {
    throw new Error(`Expected 0 unread for seller after markAllAsRead, got ${sellerAfterReadAll.unreadCount}`);
  }
  console.log('✓ TEST 7 PASSED: Notification center, unread counters, and mark-all-read working with 100% precision');

  await mongoose.disconnect();
  console.log('\n=============================================================');
  console.log('✅ ALL MODULES 9 & 10 NOTIFICATIONS & Q&A TESTS PASSED!');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Modules 9 & 10 Test Suite Failed:\n', err);
  process.exit(1);
});
