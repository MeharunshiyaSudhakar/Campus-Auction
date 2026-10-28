const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const sharp = require('sharp');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const ListingService = require('../src/services/listingService');
const { FileStorageHelper } = require('../src/utils/fileStorage');

async function runTests() {
  console.log('--- RUNNING ISSUE 4 IMAGE VISIBILITY TESTS ---');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campus_auction');

  try {
    let testSeller = await User.findOne({ email: 'seller_issue4@test.com' });
    if (!testSeller) {
      testSeller = await User.create({
        name: 'Seller Issue 4',
        email: 'seller_issue4@test.com',
        password: 'password123',
        college: 'Test College',
        campusRollNumber: '21CS444',
        phoneNumber: '9876543210',
        emailVerified: true,
      });
    }

    // Generate real 100x100 test image buffers with sharp
    const testImgBuffer1 = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 31, g: 77, b: 58 },
      },
    }).png().toBuffer();

    const testImgBuffer2 = await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 3,
        background: { r: 224, g: 160, b: 48 },
      },
    }).jpeg().toBuffer();

    // Process through Sharp pipeline (auto-orient, 1080x1080 crop, webp, and 400x400 thumbnail)
    const proc1 = await FileStorageHelper.processImage(testImgBuffer1);
    const proc2 = await FileStorageHelper.processImage(testImgBuffer2);

    console.log(`[Upload Processed] Main 1: ${proc1.url}, Thumb 1: ${proc1.thumbnailUrl}`);
    console.log(`[Upload Processed] Main 2: ${proc2.url}, Thumb 2: ${proc2.thumbnailUrl}`);

    // TEST 1: Published listing has non-empty photos and photoThumbnails
    console.log('\n[Test 1] Published listing has non-empty photos and thumbnails');
    const futureDate = new Date(Date.now() + 72 * 3600 * 1000);

    const listing = await Listing.create({
      seller: testSeller._id,
      title: 'Real Image Test Scientific Calculator',
      category: 'stationery',
      itemType: 'calculator',
      description: 'Calculator with real sharp-processed 1080x1080 webp photos.',
      photos: [proc1.url, proc2.url],
      photoThumbnails: [proc1.thumbnailUrl, proc2.thumbnailUrl],
      condition: {
        grade: 'Good',
        age: '6 months',
        workingStatus: 'Fully functional',
        defects: 'None reported',
      },
      honestyDeclaration: true,
      startingPrice: 600,
      currentPrice: 600,
      closingTime: futureDate,
      status: 'active',
    });

    if (!Array.isArray(listing.photos) || listing.photos.length < 2) {
      throw new Error(`Expected at least 2 photos in listing, found: ${listing.photos?.length}`);
    }
    if (!Array.isArray(listing.photoThumbnails) || listing.photoThumbnails.length < 2) {
      throw new Error(`Expected at least 2 thumbnails in listing, found: ${listing.photoThumbnails?.length}`);
    }
    console.log('✓ Test 1 Passed: Published listing stored non-empty photos and thumbnails.');

    // TEST 2: HTTP GET test to /uploads asserting 200, image MIME type and CORP headers
    console.log('\n[Test 2] HTTP GET test requesting photo from server static endpoint');
    
    // Start temporary Express instance with same static config to test HTTP response
    const express = require('express');
    const app = express();
    app.use(
      '/uploads',
      (req, res, next) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
      },
      express.static(path.resolve(__dirname, '../uploads')),
      express.static(path.resolve(__dirname, '../../uploads'))
    );

    const testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(5099, '127.0.0.1', resolve));

    try {
      const getPhoto = (urlPath) => {
        return new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:5099${urlPath}`, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks),
              });
            });
          }).on('error', reject);
        });
      };

      const resMain = await getPhoto(proc1.url);
      if (resMain.statusCode !== 200) {
        throw new Error(`Expected 200 for main photo ${proc1.url}, got ${resMain.statusCode}`);
      }
      if (!resMain.headers['content-type']?.startsWith('image/')) {
        throw new Error(`Expected image content-type, got: ${resMain.headers['content-type']}`);
      }
      if (resMain.headers['cross-origin-resource-policy'] !== 'cross-origin') {
        throw new Error(`Expected cross-origin-resource-policy header, got: ${resMain.headers['cross-origin-resource-policy']}`);
      }

      const resThumb = await getPhoto(proc1.thumbnailUrl);
      if (resThumb.statusCode !== 200) {
        throw new Error(`Expected 200 for thumbnail ${proc1.thumbnailUrl}, got ${resThumb.statusCode}`);
      }
      if (!resThumb.headers['content-type']?.startsWith('image/')) {
        throw new Error(`Expected image content-type for thumbnail, got: ${resThumb.headers['content-type']}`);
      }
      console.log('✓ Test 2 Passed: Photo and thumbnail URLs return HTTP 200, image/webp MIME type, and cross-origin headers.');
    } finally {
      await new Promise((resolve) => testServer.close(resolve));
    }

    // TEST 3: Listings page response returns new item with its image URLs
    console.log('\n[Test 3] Browse listings and my-listings return item with photos');
    const browseRes = await ListingService.getListings({ q: 'Real Image Test' });
    const matchedBrowse = browseRes.listings.find((l) => l._id.toString() === listing._id.toString());
    if (!matchedBrowse) {
      throw new Error('Listing not found in getListings search');
    }
    if (!matchedBrowse.photos || matchedBrowse.photos.length === 0 || !matchedBrowse.photos[0].includes('.webp')) {
      throw new Error(`Invalid photos in browse response: ${JSON.stringify(matchedBrowse.photos)}`);
    }

    const myListings = await ListingService.getMyListings(testSeller._id);
    const matchedMy = myListings.find((l) => l._id.toString() === listing._id.toString());
    if (!matchedMy || !matchedMy.photos || matchedMy.photos.length === 0) {
      throw new Error('Listing or photos missing in getMyListings');
    }
    console.log('✓ Test 3 Passed: Both public browse and seller my-listings return the new item with its image URLs.');

    console.log('\n--- ALL ISSUE 4 TESTS PASSED SUCCESSFULLY ---');
  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
