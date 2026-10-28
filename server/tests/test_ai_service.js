require('dotenv').config();
const assert = require('assert');
const AiService = require('../src/services/aiService');

async function runAiTests() {
  console.log('========================================================');
  console.log('🧪 Starting AI Service Test Suite (Groq & Fallbacks)');
  console.log('========================================================\n');

  const sampleListing = {
    category: 'cycle',
    itemSubtype: 'Bicycle',
    title: 'Hero Sprint 21-Speed Mountain Cycle',
    conditionGrade: 'Good',
    ageOfItem: '2 semesters',
    workingStatus: 'Fully functional',
    defects: 'Front brake pads squeak occasionally in the rain; minor paint chip on top tube.',
    accessories: 'Heavy duty wire lock, frame bell, bottle cage',
    cycle_gears: '21 Shimano Tourney gears',
    cycle_brakes: 'Front disc, rear V-brake',
    cycle_tyres: 'Rear tyre has 70% tread left; front tyre brand new',
    cycle_lastServiced: '1 month ago at campus cycle shop',
    sellerDescription: 'Moving out after final year. Cycle was used for hostel-to-class commutes. Runs fast and gears shift smoothly.',
    // SENSITIVE STUDENT DATA THAT MUST NEVER BE PASSED TO AI:
    sellerName: 'Arjun Sharma',
    campusRollNumber: 'ME21B099',
    phone: '9876543210',
    upiId: 'arjun@okaxis',
    deliveryAddress: 'Hostel 4, Room 212',
  };

  // --- TEST 1: Mocked Success ---
  console.log('--- TEST 1: Mocked Success ---');
  const originalCallGroq = AiService.callGroq;

  AiService.callGroq = async (messages) => {
    return {
      ok: true,
      content: JSON.stringify({
        rephrasedDescription: 'This Hero Sprint 21-speed mountain cycle has been reliably used for two campus semesters and remains fully functional. It features 21 Shimano gears, a brand-new front tyre, and comes with a lock, bell, and bottle cage. Disclosed minor wear includes occasional front brake squeaking in wet weather and a small cosmetic paint chip on the top tube.',
        suggestions: [
          'Is the cycle frame suitable for tall riders (above 5ft 10in)?',
          'Have the gear shifters been tuned recently for quick uphill shifts?',
        ],
      }),
    };
  };

  const resSuccess = await AiService.rephraseListing(sampleListing);
  assert.strictEqual(resSuccess.source, 'ai', 'Source flag must be "ai" on successful Groq response');
  assert.strictEqual(resSuccess.provider, 'groq', 'Provider must be "groq"');
  assert(resSuccess.rephrasedDescription.includes('Hero Sprint'), 'Must contain rephrased content');
  assert.strictEqual(resSuccess.suggestions.length, 2, 'Must include suggestions');
  console.log('✓ TEST 1 PASSED: Mocked success returns { source: "ai" } and parsed description');

  // --- TEST 2: Mocked Failure (HTTP 500) -> Template Fallback with source: "template" ---
  console.log('\n--- TEST 2: Mocked Failure -> Template Fallback ---');
  AiService.callGroq = async () => {
    return {
      ok: false,
      status: 500,
      error: 'Internal Server Error from Groq',
    };
  };

  const resFail = await AiService.rephraseListing(sampleListing);
  assert.strictEqual(resFail.source, 'template', 'Source flag must explicitly be "template" on failure');
  assert.strictEqual(resFail.provider, 'template_fallback', 'Provider must be template_fallback');
  assert(resFail.rephrasedDescription.includes('Disclosed Defects & Wear'), 'Template must include disclosed defects');
  assert(resFail.suggestions.length > 0, 'Must provide category suggestions even on fallback');
  console.log('✓ TEST 2 PASSED: Mocked failure returns { source: "template" } with safe deterministic fallback');

  // --- TEST 3: Malformed JSON Handling ---
  console.log('\n--- TEST 3: Malformed JSON from Model ---');
  AiService.callGroq = async () => {
    return {
      ok: true,
      content: 'Here is your description: This is broken JSON without braces',
    };
  };

  const resMalformed = await AiService.rephraseListing(sampleListing);
  assert.strictEqual(resMalformed.source, 'template', 'Malformed JSON must safely fall back to template');
  console.log('✓ TEST 3 PASSED: Malformed JSON gracefully handled and falls back to template');

  // --- TEST 4: Identical Text Retry ---
  console.log('\n--- TEST 4: Identical Text Retry Mechanism ---');
  let retryCount = 0;
  AiService.callGroq = async (messages) => {
    retryCount++;
    if (retryCount === 1) {
      // First attempt returns exact seller text
      return {
        ok: true,
        content: JSON.stringify({
          rephrasedDescription: sampleListing.sellerDescription,
          suggestions: ['Check tyre?'],
        }),
      };
    } else {
      // Retry returns improved different text
      return {
        ok: true,
        content: JSON.stringify({
          rephrasedDescription: 'Well maintained senior mountain bicycle with 21 gears in smooth working order.',
          suggestions: ['Check tyre?'],
        }),
      };
    }
  };

  const resRetry = await AiService.rephraseListing(sampleListing);
  assert.strictEqual(retryCount, 2, 'Identical text must trigger exactly 1 retry');
  assert.strictEqual(resRetry.source, 'ai', 'Successful retry should have source "ai"');
  console.log('✓ TEST 4 PASSED: Identical text triggers retry with rewrite instruction');

  // --- TEST 5: Privacy Guard Audit ---
  console.log('\n--- TEST 5: Privacy Guard Audit ---');
  let interceptedPayload = null;
  AiService.callGroq = async (messages) => {
    interceptedPayload = messages.map((m) => m.content).join(' ');
    return {
      ok: true,
      content: JSON.stringify({
        rephrasedDescription: 'Safe description',
        suggestions: [],
      }),
    };
  };

  await AiService.rephraseListing(sampleListing);
  assert(!interceptedPayload.includes('Arjun Sharma'), 'Student name must NEVER be sent to AI');
  assert(!interceptedPayload.includes('ME21B099'), 'Roll number must NEVER be sent to AI');
  assert(!interceptedPayload.includes('9876543210'), 'Phone number must NEVER be sent to AI');
  assert(!interceptedPayload.includes('arjun@okaxis'), 'UPI ID must NEVER be sent to AI');
  assert(!interceptedPayload.includes('Hostel 4'), 'Address must NEVER be sent to AI');
  console.log('✓ TEST 5 PASSED: Strict privacy verified. Zero sensitive student data leaked to AI');

  // Restore original callGroq for Live Test
  AiService.callGroq = originalCallGroq;

  // --- TEST 6: Live Groq API Call ---
  console.log('\n--- TEST 6: Live Groq API Call (Real Integration) ---');
  console.log(`Using Model: ${process.env.GROQ_MODEL || 'openai/gpt-oss-20b'}`);

  const liveResult = await AiService.rephraseListing(sampleListing);
  console.log('\n[Live Groq Result Output]:');
  console.log('Source:', liveResult.source);
  console.log('Provider:', liveResult.provider);
  console.log('\nRephrased Description:');
  console.log('--------------------------------------------------');
  console.log(liveResult.rephrasedDescription);
  console.log('--------------------------------------------------');
  console.log('\nCategory Suggestions:');
  liveResult.suggestions.forEach((sug, i) => console.log(`  ${i + 1}. ${sug}`));

  assert(liveResult.rephrasedDescription.length > 20, 'Live result must return non-empty description');
  console.log('\n========================================================');
  console.log('✅ ALL AI SERVICE TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================\n');
}

runAiTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ AI Service test failed:', err);
    process.exit(1);
  });
