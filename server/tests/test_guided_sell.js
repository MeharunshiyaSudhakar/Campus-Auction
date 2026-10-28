const mongoose = require('mongoose');

const runGuidedSellTests = async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/campus_auction');
  const User = require('../src/models/User');
  const Listing = require('../src/models/Listing');
  const SellDraft = require('../src/models/SellDraft');
  const AiService = require('../src/services/aiService');

  // 1. Login Aarav to get auth token
  const aarav = await User.findOne({ email: 'aarav@campus.edu' });
  const loginRes = await (await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aarav@campus.edu', password: 'password123' })
  })).json();
  const token = loginRes.data.token;

  console.log('[Setup] Token acquired for Aarav Sharma');

  // Clean previous drafts
  await SellDraft.deleteMany({ seller: aarav._id });

  // TEST 1: Start Sell Draft
  const startRes = await (await fetch('http://127.0.0.1:5000/api/sell/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ category: 'calculator' })
  })).json();
  console.log('[Test 1] Start Draft:', startRes.success ? 'PASSED (Draft ID: ' + startRes.data._id + ')' : 'FAILED');
  const draftId = startRes.data._id;

  // TEST 2: Get First Question
  const q1Res = await (await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/next`, {
    headers: { 'Authorization': 'Bearer ' + token }
  })).json();
  console.log('[Test 2] Get First Question:', q1Res.data.currentQuestion.key === 'category' ? 'PASSED (Key: category)' : 'FAILED');

  // TEST 3: Validation Gate - Reject negative price
  const failPriceRes = await (await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'startingPrice', value: -50 })
  })).json();
  console.log('[Test 3] Validation: Reject Negative Price:', failPriceRes.success === false ? 'PASSED (' + failPriceRes.message + ')' : 'FAILED');

  // TEST 4: Validation Gate - Reject past closing time
  const failTimeRes = await (await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'closingTime', value: new Date(Date.now() - 3600000).toISOString() })
  })).json();
  console.log('[Test 4] Validation: Reject Past Closing Time:', failTimeRes.success === false ? 'PASSED (' + failTimeRes.message + ')' : 'FAILED');

  // TEST 5: Validation Gate - Reject photos < 2
  const failPhotosRes = await (await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'photos', value: ['https://example.com/one.jpg'] })
  })).json();
  console.log('[Test 5] Validation: Reject < 2 Photos:', failPhotosRes.success === false ? 'PASSED (' + failPhotosRes.message + ')' : 'FAILED');

  // TEST 6: Save valid answers step-by-step
  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'category', value: 'calculator' })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'title', value: 'Casio fx-991CW ClassWiz Scientific' })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'conditionGrade', value: 'Good' })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'ageOfItem', value: '1 academic year' })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'workingStatus', value: 'Fully functional' })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'defects', value: 'None, minor micro-scratches on back cover' })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'accessories', value: 'Hard sliding case' })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'calculator_model', value: 'Casio fx-991CW' })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'calculator_display', value: 'Flawless' })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'calculator_battery', value: 'Working' })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'sellerDescription', value: 'Used for semester exams, clean keys and screen.' })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      key: 'photos',
      value: [
        'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=800&q=80'
      ]
    })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'startingPrice', value: 850 })
  });

  await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'minIncrement', value: 25 })
  });

  const finalAnswerRes = await (await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ key: 'closingTime', value: new Date(Date.now() + 48 * 3600000).toISOString() })
  })).json();

  console.log('[Test 6] Autosaved Answers Progress:', finalAnswerRes.data.isCompleted ? 'PASSED (All steps completed)' : 'FAILED');

  // TEST 7: Step Back
  const backRes = await (await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/back`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  })).json();
  console.log('[Test 7] Step Back functionality:', backRes.success ? 'PASSED (Stepped back to ' + backRes.data.currentStep + ')' : 'FAILED');

  // TEST 8: AI Review Endpoint (Facts only + suggestions or template fallback)
  const reviewRes = await (await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/review`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  })).json();
  const hasRephrase = reviewRes.data?.rephrasedDescription?.length > 20;
  console.log('[Test 8] AI Review Generated:', hasRephrase ? 'PASSED (Provider: ' + reviewRes.data.provider + ')' : 'FAILED');

  // TEST 9: Publish Gate - Reject without Honesty Declaration
  const failPublishRes = await (await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ honestyDeclaration: false })
  })).json();
  console.log('[Test 9] Publish Gate: Blocked without Honesty Declaration:',
    failPublishRes.success === false ? 'PASSED (' + failPublishRes.message + ')' : 'FAILED');

  // TEST 10: Publish with Honesty Declaration = true
  const publishRes = await (await fetch(`http://127.0.0.1:5000/api/sell/drafts/${draftId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      honestyDeclaration: true,
      finalDescription: reviewRes.data.rephrasedDescription,
    })
  })).json();
  const assert = require('assert');

  assert.strictEqual(startRes.success, true, 'Test 1 Failed: Start draft');
  assert.strictEqual(q1Res.data.currentQuestion.key, 'category', 'Test 2 Failed: First question should be category');
  assert.strictEqual(failPriceRes.success, false, 'Test 3 Failed: Reject negative price');
  assert.strictEqual(failTimeRes.success, false, 'Test 4 Failed: Reject past closing time');
  assert.strictEqual(failPhotosRes.success, false, 'Test 5 Failed: Reject < 2 photos');
  assert.strictEqual(finalAnswerRes.data.isCompleted, true, 'Test 6 Failed: Answers completion');
  assert.strictEqual(backRes.success, true, 'Test 7 Failed: Step back');
  assert.strictEqual(hasRephrase, true, 'Test 8 Failed: AI review generation');
  assert.strictEqual(failPublishRes.success, false, 'Test 9 Failed: Honesty gate');

  console.log('[Test 10] Publish Success: Created Listing ID ' + publishRes.data?._id + ', status=' + publishRes.data?.status + ':',
    publishRes.success && publishRes.data?.status === 'active' ? 'PASSED' : 'FAILED');
  assert.strictEqual(publishRes.success, true, 'Test 10 Failed: Publish draft should succeed');
  assert.strictEqual(publishRes.data.status, 'active', 'Test 10 Failed: Listing status should be active');

  // TEST 11: Verify Draft was removed after publish
  const draftAfter = await SellDraft.findById(draftId);
  console.log('[Test 11] Draft Cleaned Up after Publish:', draftAfter === null ? 'PASSED (Draft removed)' : 'FAILED');
  assert.strictEqual(draftAfter, null, 'Test 11 Failed: Draft should be deleted after publish');

  console.log('\n=============================================');
  console.log('ALL MODULE 2+3 GUIDED SELL FLOW TESTS PASSED!');
  console.log('=============================================\n');
  process.exit(0);
};

runGuidedSellTests().catch(err => {
  console.error(err);
  process.exit(1);
});
