/**
 * Category Architecture & Validation Test Suite
 * Covers Issue 1:
 * 1. Table-driven test: every category completes the flow through publish
 * 2. 'other' publishes with only common fields
 * 3. Unknown category is rejected (400) listing valid categories
 * 4. Legacy records appear under new categories with search synonym mapping
 * 5. Category migration is idempotent
 */

require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');
const Listing = require('../src/models/Listing');
const SellDraft = require('../src/models/SellDraft');
const User = require('../src/models/User');
const SellService = require('../src/services/sellService');
const ListingService = require('../src/services/listingService');
const {
  CATEGORIES,
  VALID_CATEGORY_KEYS,
  validateCategory,
  getQuestionsForCategory,
} = require('../src/config/categoryConfig');
const migrateCategories = require('../scripts/migrate_categories');

async function runCategoryTests() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_auction';
  await mongoose.connect(mongoUri);

  console.log('\n========================================================');
  console.log('🧪 Starting Issue 1: Canonical Category Architecture Tests');
  console.log('========================================================\n');

  try {
    // 0. Setup test seller
    let seller = await User.findOne({ email: 'aarav@campus.edu' });
    if (!seller) {
      seller = await User.create({
        name: 'Aarav Sharma',
        email: 'aarav@campus.edu',
        campusRollNumber: 'CS2024TEST',
        password: 'password123',
        emailVerified: true,
      });
    }

    // --- TEST 1: Reject Unknown Category with 400 Listing Valid Ones ---
    console.log('--- TEST 1: Reject Unknown Category with 400 ---');
    let rejectedError = null;
    try {
      validateCategory('space_shuttle');
    } catch (err) {
      rejectedError = err;
    }
    assert(rejectedError, 'Should have thrown error for unknown category');
    assert.strictEqual(rejectedError.statusCode, 400, 'Should return statusCode 400');
    assert(
      rejectedError.message.includes('Valid categories are: vehicles, stationery, books, electronics, furniture, clothing, sports, other'),
      `Error message must list valid categories. Got: ${rejectedError.message}`
    );
    console.log(`✓ TEST 1 PASSED: Unknown category rejected with 400: "${rejectedError.message}"`);

    // --- TEST 2: Legacy Category Normalization ---
    console.log('\n--- TEST 2: Legacy Category Normalization ---');
    assert.strictEqual(validateCategory('cycle'), 'vehicles', 'cycle must normalize to vehicles');
    assert.strictEqual(validateCategory('calculator'), 'stationery', 'calculator must normalize to stationery');
    console.log('✓ TEST 2 PASSED: Legacy categories "cycle" and "calculator" successfully normalized');

    // --- TEST 3: Table-Driven Flow: Every Category Completes Flow to Publish ---
    console.log('\n--- TEST 3: Table-Driven Flow for All 8 Categories ---');

    for (const catKey of VALID_CATEGORY_KEYS) {
      // Clean previous drafts for seller
      await SellDraft.deleteMany({ seller: seller._id });

      // Start draft
      const draft = await SellService.startDraft(seller._id, { category: catKey });
      assert.strictEqual(draft.category, catKey, `Draft should initialize with category ${catKey}`);

      // Get questions for this category
      const questions = getQuestionsForCategory(catKey);
      assert(questions.length >= 15, `Category ${catKey} should have common + any specific questions`);

      // Answer common required fields
      const closingDate = new Date(Date.now() + 3 * 86400000).toISOString();
      await SellService.saveAnswer(seller._id, draft._id, { key: 'category', value: catKey });
      await SellService.saveAnswer(seller._id, draft._id, { key: 'itemType', value: `Test ${catKey} Item` });
      await SellService.saveAnswer(seller._id, draft._id, { key: 'title', value: `Test Honest ${catKey} Listing` });
      await SellService.saveAnswer(seller._id, draft._id, {
        key: 'sellerDescription',
        value: `Used on campus for 1 semester. In good shape, fully working.`,
      });
      await SellService.saveAnswer(seller._id, draft._id, { key: 'ageOfItem', value: '1 semester' });
      await SellService.saveAnswer(seller._id, draft._id, { key: 'conditionGrade', value: 'Good' });
      await SellService.saveAnswer(seller._id, draft._id, { key: 'workingStatus', value: 'Fully functional' });
      await SellService.saveAnswer(seller._id, draft._id, { key: 'defects', value: 'None' });
      await SellService.saveAnswer(seller._id, draft._id, {
        key: 'photos',
        value: ['/uploads/test_photo_1.webp', '/uploads/test_photo_2.webp'],
      });
      await SellService.saveAnswer(seller._id, draft._id, { key: 'startingPrice', value: 450 });
      await SellService.saveAnswer(seller._id, draft._id, { key: 'minIncrement', value: 20 });
      await SellService.saveAnswer(seller._id, draft._id, { key: 'closingTime', value: closingDate });
      await SellService.saveAnswer(seller._id, draft._id, { key: 'acceptedPaymentMethods', value: ['upi', 'cash_on_pickup'] });
      await SellService.saveAnswer(seller._id, draft._id, { key: 'fulfilment', value: ['campus_pickup'] });

      // If category has extras, answer the first extra
      const catConfig = CATEGORIES.find((c) => c.key === catKey);
      if (catConfig && catConfig.extras.length > 0) {
        const extraQ = catConfig.extras[0];
        const extraVal = extraQ.options ? extraQ.options[0].value : 'Test Extra Value';
        await SellService.saveAnswer(seller._id, draft._id, { key: extraQ.key, value: extraVal });
      }

      // Publish draft
      const published = await SellService.publishDraft(seller._id, draft._id, {
        honestyDeclaration: true,
        finalDescription: `Final verified description for ${catKey}`,
      });

      assert(published._id, `Listing for category ${catKey} must be published`);
      assert.strictEqual(published.category, catKey, `Published category must be ${catKey}`);
      assert.strictEqual(published.status, 'active', 'Published listing must be active');
      assert.strictEqual(published.startingPrice, 450, 'Starting price must be 450');

      console.log(`  ✓ Category "${catKey}" completed flow and published: ID ${published._id}`);

      // Clean up test listing
      await Listing.findByIdAndDelete(published._id);
    }
    console.log('✓ TEST 3 PASSED: All 8 categories successfully completed flow through publish');

    // --- TEST 4: 'other' Publishes With Only Common Fields ---
    console.log("\n--- TEST 4: 'other' Publishes With Only Common Fields ---");
    await SellDraft.deleteMany({ seller: seller._id });
    const otherDraft = await SellService.startDraft(seller._id, { category: 'other' });
    const otherQuestions = getQuestionsForCategory('other');

    // Verify 'other' questions do not have category-specific extras
    const otherKeys = otherQuestions.map((q) => q.key);
    assert(!otherKeys.some((k) => k.includes('vehicles_') || k.includes('books_')), "'other' must not include specific extras");

    const futureDate = new Date(Date.now() + 2 * 86400000).toISOString();
    await SellService.saveAnswer(seller._id, otherDraft._id, { key: 'category', value: 'other' });
    await SellService.saveAnswer(seller._id, otherDraft._id, { key: 'itemType', value: 'Lab Safety Goggles' });
    await SellService.saveAnswer(seller._id, otherDraft._id, { key: 'title', value: 'Chemistry Lab Safety Goggles' });
    await SellService.saveAnswer(seller._id, otherDraft._id, {
      key: 'sellerDescription',
      value: 'Scratch resistant lab safety goggles for chemistry practicals.',
    });
    await SellService.saveAnswer(seller._id, otherDraft._id, { key: 'ageOfItem', value: '1 semester' });
    await SellService.saveAnswer(seller._id, otherDraft._id, { key: 'conditionGrade', value: 'Like new' });
    await SellService.saveAnswer(seller._id, otherDraft._id, { key: 'workingStatus', value: 'Fully functional' });
    await SellService.saveAnswer(seller._id, otherDraft._id, {
      key: 'photos',
      value: ['/uploads/goggles1.webp', '/uploads/goggles2.webp'],
    });
    await SellService.saveAnswer(seller._id, otherDraft._id, { key: 'startingPrice', value: 120 });
    await SellService.saveAnswer(seller._id, otherDraft._id, { key: 'closingTime', value: futureDate });

    const publishedOther = await SellService.publishDraft(seller._id, otherDraft._id, {
      honestyDeclaration: true,
    });
    assert.strictEqual(publishedOther.category, 'other');
    assert.strictEqual(publishedOther.itemType, 'Lab Safety Goggles');
    console.log('✓ TEST 4 PASSED: Category "other" successfully published with only common fields');
    await Listing.findByIdAndDelete(publishedOther._id);

    // --- TEST 5: Legacy Records Appear Under New Categories in Search ---
    console.log('\n--- TEST 5: Legacy Records Search & Synonym Mapping ---');
    // Create one vehicle listing
    const vehicleListing = await Listing.create({
      seller: seller._id,
      title: 'Hercules Mountain Terrain Cycle',
      category: 'vehicles',
      itemType: 'cycle',
      description: 'Sturdy mountain terrain bicycle with 21 gears and carrier.',
      condition: { grade: 'Good', age: '1 year', workingStatus: 'Fully functional', defects: 'None' },
      honestyDeclaration: true,
      photos: ['/uploads/cycle1.webp', '/uploads/cycle2.webp'],
      startingPrice: 1500,
      minIncrement: 50,
      currentPrice: 1500,
      closingTime: new Date(Date.now() + 86400000),
      status: 'active',
    });

    // Query with category: 'cycle' (synonym mapping)
    const cycleSearchRes = await ListingService.getListings({ category: 'cycle' });
    const foundInCycle = cycleSearchRes.listings.some((l) => l._id.toString() === vehicleListing._id.toString());
    assert(foundInCycle, 'Listing under vehicles must be found when querying legacy category "cycle"');

    // Query with category: 'vehicles'
    const vehiclesSearchRes = await ListingService.getListings({ category: 'vehicles' });
    const foundInVehicles = vehiclesSearchRes.listings.some((l) => l._id.toString() === vehicleListing._id.toString());
    assert(foundInVehicles, 'Listing under vehicles must be found when querying category "vehicles"');

    console.log('✓ TEST 5 PASSED: Bidirectional synonym search verified for legacy categories');
    await Listing.findByIdAndDelete(vehicleListing._id);

    // --- TEST 6: Idempotent Migration Script ---
    console.log('\n--- TEST 6: Category Migration Idempotency ---');
    const run1 = await migrateCategories();
    assert.strictEqual(typeof run1.listingsUpdated, 'number');
    const run2 = await migrateCategories();
    assert.strictEqual(run2.listingsUpdated, 0, 'Second run must update 0 listings');
    assert.strictEqual(run2.draftsUpdated, 0, 'Second run must update 0 drafts');
    console.log('✓ TEST 6 PASSED: Category migration confirmed 100% idempotent');

    console.log('\n========================================================');
    console.log('✅ ALL ISSUE 1 CATEGORY ARCHITECTURE TESTS PASSED!');
    console.log('========================================================\n');
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  runCategoryTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Test Suite Failed:', err);
      process.exit(1);
    });
}

module.exports = runCategoryTests;
