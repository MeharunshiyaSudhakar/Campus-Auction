/**
 * Idempotent Category Migration Script
 * Maps legacy 'cycle' -> 'vehicles' (itemType: 'cycle')
 * Maps legacy 'calculator' -> 'stationery' (itemType: 'calculator')
 * Run via: npm run migrate:categories
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../src/models/Listing');
const SellDraft = require('../src/models/SellDraft');

async function migrateCategories() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_auction';
  console.log(`[Category Migration] Connecting to MongoDB: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}...`);

  await mongoose.connect(mongoUri);
  console.log('[Category Migration] Connected successfully.');

  let listingsUpdated = 0;
  let draftsUpdated = 0;

  // 1. Migrate Listings with category 'cycle'
  const cycleListings = await Listing.find({ category: 'cycle' });
  for (const listing of cycleListings) {
    listing.category = 'vehicles';
    if (!listing.itemType) listing.itemType = 'cycle';
    if (!listing.itemSubtype) listing.itemSubtype = 'cycle';
    await listing.save();
    listingsUpdated++;
  }

  // 2. Migrate Listings with category 'calculator'
  const calcListings = await Listing.find({ category: 'calculator' });
  for (const listing of calcListings) {
    listing.category = 'stationery';
    if (!listing.itemType) listing.itemType = 'calculator';
    if (!listing.itemSubtype) listing.itemSubtype = 'calculator';
    await listing.save();
    listingsUpdated++;
  }

  // 3. Migrate SellDrafts with category 'cycle'
  const cycleDrafts = await SellDraft.find({ category: 'cycle' });
  for (const draft of cycleDrafts) {
    draft.category = 'vehicles';
    if (draft.answers) {
      draft.answers.category = 'vehicles';
      if (!draft.answers.itemType) draft.answers.itemType = 'cycle';
      draft.markModified('answers');
    }
    await draft.save();
    draftsUpdated++;
  }

  // 4. Migrate SellDrafts with category 'calculator'
  const calcDrafts = await SellDraft.find({ category: 'calculator' });
  for (const draft of calcDrafts) {
    draft.category = 'stationery';
    if (draft.answers) {
      draft.answers.category = 'stationery';
      if (!draft.answers.itemType) draft.answers.itemType = 'calculator';
      draft.markModified('answers');
    }
    await draft.save();
    draftsUpdated++;
  }

  console.log(`[Category Migration] Finished! Migrated ${listingsUpdated} listing(s) and ${draftsUpdated} draft(s).`);
  await mongoose.disconnect();
  console.log('[Category Migration] Disconnected cleanly.');
  return { listingsUpdated, draftsUpdated };
}

if (require.main === module) {
  migrateCategories()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Category Migration Error]:', err);
      process.exit(1);
    });
}

module.exports = migrateCategories;
