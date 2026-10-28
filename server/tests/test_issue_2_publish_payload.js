const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const SellDraft = require('../src/models/SellDraft');
const Listing = require('../src/models/Listing');
const SellService = require('../src/services/sellService');

async function runTests() {
  console.log('--- RUNNING ISSUE 2 PUBLISH PAYLOAD TESTS ---');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campus_auction');

  try {
    // Setup test seller
    let testSeller = await User.findOne({ email: 'seller_issue2@test.com' });
    if (!testSeller) {
      testSeller = await User.create({
        name: 'Seller Issue 2',
        email: 'seller_issue2@test.com',
        password: 'password123',
        college: 'Test College',
        campusRollNumber: '21CS999',
        phoneNumber: '9876543210',
        emailVerified: true,
      });
    }

    const fakeAttackerId = new mongoose.Types.ObjectId();

    // TEST 1: Publish with complete reviewed payload stores all reviewed data
    console.log('\n[Test 1] Complete reviewed payload stores edited description, brand, itemType, condition, etc.');
    const draft1 = await SellService.startDraft(testSeller._id);
    await SellService.saveAnswer(testSeller._id, draft1._id, { key: 'category', value: 'books' });
    await SellService.saveAnswer(testSeller._id, draft1._id, { key: 'title', value: 'Engineering Mathematics Vol 1' });
    await SellService.saveAnswer(testSeller._id, draft1._id, { key: 'photos', value: ['/uploads/book1.webp', '/uploads/book2.webp'] });
    await SellService.saveAnswer(testSeller._id, draft1._id, { key: 'startingPrice', value: 250 });
    await SellService.saveAnswer(testSeller._id, draft1._id, { key: 'conditionGrade', value: 'Good' });

    const futureDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const reviewedPayload = {
      title: 'Engineering Mathematics Vol 1 (Latest Revised Edition)',
      category: 'books',
      itemType: 'textbook',
      brand: 'Pearson Higher Ed',
      conditionGrade: 'Good',
      ageOfItem: '1 year',
      workingStatus: 'Fully functional',
      defects: 'Light pencil notes on 2 pages',
      accessories: 'Formula sheet included',
      finalDescription: 'Custom reviewed and polished description for junior engineering students.',
      acceptedSuggestions: ['Specify which syllabus this follows'],
      acceptedPaymentMethods: ['upi_direct', 'cash_on_pickup'],
      fulfilment: ['campus_pickup'],
      startingPrice: 300,
      minIncrement: 20,
      closingTime: futureDate,
      photos: ['/uploads/book1.webp', '/uploads/book2.webp'],
      honestyDeclaration: true,
      // Attempting to forge seller and status
      seller: fakeAttackerId,
      status: 'completed',
    };

    const listing1 = await SellService.publishDraft(testSeller._id, draft1._id, reviewedPayload);

    if (listing1.title !== 'Engineering Mathematics Vol 1 (Latest Revised Edition)') {
      throw new Error(`Expected updated title, got: ${listing1.title}`);
    }
    if (listing1.description !== 'Custom reviewed and polished description for junior engineering students.') {
      throw new Error(`Expected finalDescription, got: ${listing1.description}`);
    }
    if (listing1.brand !== 'Pearson Higher Ed') {
      throw new Error(`Expected brand Pearson Higher Ed, got: ${listing1.brand}`);
    }
    if (listing1.itemType !== 'textbook') {
      throw new Error(`Expected itemType textbook, got: ${listing1.itemType}`);
    }
    if (listing1.startingPrice !== 300 || listing1.minIncrement !== 20) {
      throw new Error(`Expected price 300 and increment 20, got price ${listing1.startingPrice}, inc ${listing1.minIncrement}`);
    }

    // Security check: seller must be testSeller._id, NOT fakeAttackerId; status must be active, NOT completed
    const sellerId = listing1.seller._id ? listing1.seller._id.toString() : listing1.seller.toString();
    if (sellerId !== testSeller._id.toString()) {
      throw new Error(`SECURITY VIOLATION: listing.seller (${sellerId}) was overridden by client payload! Expected ${testSeller._id}`);
    }
    if (listing1.status !== 'active') {
      throw new Error(`SECURITY VIOLATION: listing.status (${listing1.status}) was set by client! Expected active`);
    }
    console.log('✓ Test 1 Passed: Complete reviewed data saved, client seller and status forged values ignored.');

    // TEST 2: Rejection of missing required fields
    console.log('\n[Test 2] Missing required fields are rejected with clear 400 errors');

    // Missing honesty declaration
    const draft2 = await SellService.startDraft(testSeller._id);
    let rejectedHonesty = false;
    try {
      await SellService.publishDraft(testSeller._id, draft2._id, { honestyDeclaration: false });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('honesty declaration')) {
        rejectedHonesty = true;
      }
    }
    if (!rejectedHonesty) {
      throw new Error('Expected 400 rejection for missing honesty declaration');
    }

    const baseValid = {
      honestyDeclaration: true,
      category: 'electronics',
      title: 'Scientific Calculator fx-991EX',
      conditionGrade: 'Good',
      ageOfItem: '1 year',
      workingStatus: 'Fully functional',
      startingPrice: 500,
      photos: ['/uploads/1.webp', '/uploads/2.webp'],
      closingTime: futureDate,
      finalDescription: 'Some description here',
    };

    // Starting price <= 0
    let rejectedPrice = false;
    try {
      await SellService.publishDraft(testSeller._id, draft2._id, {
        ...baseValid,
        startingPrice: 0,
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('price')) {
        rejectedPrice = true;
      }
    }
    if (!rejectedPrice) {
      throw new Error('Expected 400 rejection for invalid starting price');
    }

    // Past closing time
    let rejectedTime = false;
    try {
      await SellService.publishDraft(testSeller._id, draft2._id, {
        ...baseValid,
        closingTime: new Date(Date.now() - 3600 * 1000).toISOString(),
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('Closing time')) {
        rejectedTime = true;
      }
    }
    if (!rejectedTime) {
      throw new Error('Expected 400 rejection for past closing time');
    }

    // Less than 2 photos
    let rejectedPhotos = false;
    try {
      await SellService.publishDraft(testSeller._id, draft2._id, {
        ...baseValid,
        photos: ['/uploads/1.webp'],
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('2 photos')) {
        rejectedPhotos = true;
      }
    }
    if (!rejectedPhotos) {
      throw new Error('Expected 400 rejection for less than 2 photos');
    }

    // Fair/Poor condition with no defects description
    let rejectedDefects = false;
    try {
      await SellService.publishDraft(testSeller._id, draft2._id, {
        ...baseValid,
        conditionGrade: 'Fair',
        defects: '',
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('defects')) {
        rejectedDefects = true;
      }
    }
    if (!rejectedDefects) {
      throw new Error('Expected 400 rejection for Fair condition without defects disclosure');
    }

    console.log('✓ Test 2 Passed: All required field validations threw accurate 400 error messages.');

    console.log('\n--- ALL ISSUE 2 TESTS PASSED SUCCESSFULLY ---');
  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
