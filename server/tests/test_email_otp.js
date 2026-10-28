const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Otp = require('../src/models/Otp');
const OtpService = require('../src/services/otpService');

const BASE_URL = 'http://localhost:5000/api';

async function runEmailOtpTests() {
  console.log('\n========================================================');
  console.log('🧪 Starting Email OTP Verification for Signup & Login Test Suite');
  console.log('========================================================\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/campus_auction');
  }

  // Teardown previous test data
  const testEmail = 'otpstudent@campus.edu';
  const testRoll = 'OT21B001';
  await User.deleteMany({ $or: [{ email: testEmail }, { campusRollNumber: testRoll }] });
  await Otp.deleteMany({ email: testEmail });

  // --- TEST 1: Register User creates emailVerified: false & generates 6-digit OTP without JWT ---
  console.log('--- TEST 1: Register creates unverified account & dispatches OTP ---');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'OTP Student',
      email: testEmail,
      password: 'Password123!',
      campusRollNumber: testRoll,
    }),
  }).then((r) => r.json());

  assert.strictEqual(regRes.success, true, 'Registration should be successful');
  assert.strictEqual(regRes.data.user.emailVerified, false, 'emailVerified must be false initially');
  assert.strictEqual(regRes.data.token, undefined, 'JWT token must NOT be issued prior to email verification');
  assert.strictEqual(regRes.data.otpSent, true, 'otpSent flag should be true');

  // Verify OTP was stored in DB
  const storedOtp = await Otp.findOne({ email: testEmail, purpose: 'signup', usedAt: null }).sort({ createdAt: -1 });
  assert(storedOtp, 'OTP record must exist in DB');
  assert(storedOtp.codeHash, 'codeHash must exist');
  assert.strictEqual(storedOtp.attempts, 0, 'Initial attempts must be 0');
  console.log('✓ TEST 1 PASSED: User registered with emailVerified: false and OTP created in DB (No JWT token issued)');

  // --- TEST 2: Login Before Verification Blocked (403) ---
  console.log('\n--- TEST 2: Login Blocked Before Email Verification (403) ---');
  const unverifiedLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
    }),
  });

  assert.strictEqual(unverifiedLogin.status, 403, 'Login before email verification must return 403');
  const loginErrJson = await unverifiedLogin.json();
  assert(loginErrJson.message.includes('verify your college email'), `Error message must instruct verification: ${loginErrJson.message}`);
  console.log('✓ TEST 2 PASSED: Unverified login blocked with 403 and friendly verification instruction');

  // --- TEST 3: Resend Cooldown Protection (429 if < 60s) ---
  console.log('\n--- TEST 3: Resend Cooldown Enforces 60-Second Wait ---');
  const cooldownRes = await fetch(`${BASE_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      purpose: 'signup',
    }),
  });

  assert.strictEqual(cooldownRes.status, 429, 'Immediate resend must return 429 Too Many Requests');
  const cooldownJson = await cooldownRes.json();
  assert(cooldownJson.message.includes('wait'), `Message should indicate cooldown wait: ${cooldownJson.message}`);
  console.log('✓ TEST 3 PASSED: Resend cooldown enforced: ' + cooldownJson.message);

  // --- TEST 4: Invalid Code Increments Attempts (Max 5) ---
  console.log('\n--- TEST 4: Invalid Code Increments Attempts Counter ---');
  const invalidVerify = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: '000000',
    }),
  });

  assert.strictEqual(invalidVerify.status, 400, 'Invalid OTP must return 400');
  const invalidJson = await invalidVerify.json();
  assert(invalidJson.message.includes('attempt'), `Error message should mention remaining attempts: ${invalidJson.message}`);

  const otpDocAfterAttempt = await Otp.findById(storedOtp._id);
  assert.strictEqual(otpDocAfterAttempt.attempts, 1, 'Attempts counter should be incremented to 1');
  console.log('✓ TEST 4 PASSED: Invalid code rejected cleanly and attempt counter incremented (1/5)');

  // --- TEST 5: Valid Code Verifies Email & Returns Valid JWT Token ---
  console.log('\n--- TEST 5: Valid 6-Digit Code Sets emailVerified: true & Returns JWT ---');
  // Generate a known test code directly
  const knownCode = '654321';
  const knownHash = OtpService.hashOtp(knownCode);

  await Otp.updateOne(
    { _id: storedOtp._id },
    { $set: { codeHash: knownHash, attempts: 0 } }
  );

  const validVerify = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: knownCode,
    }),
  }).then((r) => r.json());

  assert.strictEqual(validVerify.success, true, 'Valid code verification must succeed');
  assert(validVerify.data.token, 'JWT token must be returned upon successful verification');
  assert.strictEqual(validVerify.data.user.emailVerified, true, 'emailVerified must be true');

  // Verify DB state
  const verifiedUser = await User.findOne({ email: testEmail }).select('+emailVerified');
  assert.strictEqual(verifiedUser.emailVerified, true, 'User record in DB must have emailVerified = true');

  const usedOtp = await Otp.findById(storedOtp._id);
  assert(usedOtp.usedAt, 'OTP must be marked as used');
  console.log('✓ TEST 5 PASSED: Valid code verified email, issued JWT, and marked OTP as used');

  // --- TEST 6: Single-Use Guarantee (Cannot Replay Code) ---
  console.log('\n--- TEST 6: Replay Attempt Rejected (Single-Use Guarantee) ---');
  const replayVerify = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: knownCode,
    }),
  });

  assert.strictEqual(replayVerify.status, 400, 'Replayed OTP must return 400');
  const replayJson = await replayVerify.json();
  assert(replayJson.message.includes('No active verification code'), 'Must reject reused code');
  console.log('✓ TEST 6 PASSED: Replayed code rejected cleanly: ' + replayJson.message);

  // --- TEST 7: Login Now Succeeds with Verified Email ---
  console.log('\n--- TEST 7: Login Succeeds After Email Verification ---');
  const verifiedLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
    }),
  }).then((r) => r.json());

  assert.strictEqual(verifiedLogin.success, true, 'Login should succeed after email verification');
  assert(verifiedLogin.data.token, 'Valid JWT token returned on login');
  assert.strictEqual(verifiedLogin.data.user.emailVerified, true, 'User is verified');
  console.log('✓ TEST 7 PASSED: Student successfully logged in with valid session token');

  // Cleanup
  await User.deleteMany({ $or: [{ email: testEmail }, { campusRollNumber: testRoll }] });
  await Otp.deleteMany({ email: testEmail });

  console.log('\n========================================================');
  console.log('✅ ALL EMAIL OTP VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================\n');
}

runEmailOtpTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Email OTP test failed:', err);
    process.exit(1);
  });
