/**
 * Automated Test Suite for Module 16: Razorpay Route Split Payments (Test Mode)
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Deal = require('../src/models/Deal');
const Payment = require('../src/models/Payment');
const PaymentService = require('../src/services/paymentService');
const DealService = require('../src/services/dealService');

async function runTests() {
  console.log('=== Starting Test Suite: Module 16 Razorpay Route Split Payments ===\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_auction');

  try {
    // 1. Setup Test Users
    await User.deleteMany({ email: { $in: ['m16_seller@campus.edu', 'm16_winner@campus.edu', 'm16_other@campus.edu'] } });
    await Deal.deleteMany({ cancellationReason: '[Test-M16]' });

    const seller = await User.create({
      name: 'Rohan Senior',
      email: 'm16_seller@campus.edu',
      password: 'password123',
      campusRollNumber: 'M16SENIOR01',
      payoutStatus: 'not_started',
    });

    const winner = await User.create({
      name: 'Kavya Junior',
      email: 'm16_winner@campus.edu',
      password: 'password123',
      campusRollNumber: 'M16JUNIOR01',
    });

    const intruder = await User.create({
      name: 'Intruder Junior',
      email: 'm16_other@campus.edu',
      password: 'password123',
      campusRollNumber: 'M16INTRUDER01',
    });

    console.log('✅ Test 1: Created test seller, winner, and intruder users.');

    // 2. Test initial payout status
    console.log('Initial seller payout status:', seller.payoutStatus);
    if (seller.payoutStatus !== 'not_started') {
      throw new Error(`Expected payoutStatus 'not_started', got '${seller.payoutStatus}'`);
    }

    // 3. Test Dev-Activate Seller Onboarding
    const devActivation = await PaymentService.devActivateSeller(seller._id);
    if (devActivation.payoutStatus !== 'active') {
      throw new Error(`Expected devActivation payoutStatus 'active', got '${devActivation.payoutStatus}'`);
    }
    const refreshedSeller = await User.findById(seller._id).select('+linkedAccountId');
    if (!refreshedSeller.linkedAccountId || refreshedSeller.payoutStatus !== 'active') {
      throw new Error('Seller linkedAccountId was not set on activation');
    }
    console.log('✅ Test 2: Seller payout account activated with test linked account ID.');

    // 4. Create an approved deal for testing
    const listing = await Listing.create({
      seller: seller._id,
      title: '[Test-M16] Casio fx-991CW Calculator',
      category: 'stationery',
      description: 'Used for 2 semesters, perfect screen.',
      photos: ['https://placehold.co/400x300.png', 'https://placehold.co/400x300_2.png'],
      condition: { grade: 'Like new', age: '1 year', workingStatus: 'Fully functional' },
      honestyDeclaration: true,
      startingPrice: 500,
      minIncrement: 20,
      currentPrice: 650,
      closingTime: new Date(Date.now() + 86400000),
      status: 'approved',
      acceptedPaymentMethods: ['online', 'direct_upi', 'cash_on_pickup'],
    });

    const deal = await Deal.create({
      listing: listing._id,
      seller: seller._id,
      buyer: winner._id,
      amount: 650,
      status: 'approved',
      cancellationReason: '[Test-M16]',
      pickupInfo: {
        handoverCode: '123456',
        preferredLandmark: 'Library Entrance',
      },
    });

    console.log('✅ Test 3: Created test listing and approved deal of ₹650.');

    // 5. Test Authorization: Intruder cannot create order
    try {
      await PaymentService.createOrder(intruder._id, deal._id);
      throw new Error('Expected 403 Forbidden for intruder, but order was created');
    } catch (err) {
      if (err.statusCode !== 403) {
        throw new Error(`Expected status 403, got ${err.statusCode}: ${err.message}`);
      }
      console.log('✅ Test 4: Intruder access correctly blocked with 403 Forbidden.');
    }

    // 6. Test Winner creates Payment Order
    const orderResult = await PaymentService.createOrder(winner._id, deal._id);
    if (!orderResult.orderId || orderResult.amount !== 65000) {
      throw new Error(`Invalid order response: ${JSON.stringify(orderResult)}`);
    }

    const createdPayment = await Payment.findOne({ deal: deal._id });
    if (!createdPayment || createdPayment.status !== 'created') {
      throw new Error('Payment record not found or not in created status');
    }
    console.log('✅ Test 5: Order created with ₹650 (65000 paise) and held transfer to seller account.');

    // 7. Test Payment Verification
    const verifyResult = await PaymentService.verifyPayment(winner._id, {
      dealId: deal._id,
      razorpayOrderId: orderResult.orderId,
      razorpayPaymentId: 'pay_test_m16_999',
      razorpaySignature: 'test_sig_mock',
    });

    if (!verifyResult.success || verifyResult.payment.status !== 'paid_held') {
      throw new Error(`Payment verification failed: ${JSON.stringify(verifyResult)}`);
    }

    const heldPayment = await Payment.findOne({ deal: deal._id });
    if (heldPayment.status !== 'paid_held' || !heldPayment.paidAt) {
      throw new Error(`Payment status expected 'paid_held', got '${heldPayment?.status}'`);
    }

    const updatedDeal = await Deal.findById(deal._id);
    if (updatedDeal.status !== 'payment_confirmed' || updatedDeal.chosenMethod !== 'online') {
      throw new Error(`Deal status expected 'payment_confirmed', got '${updatedDeal.status}'`);
    }
    console.log('✅ Test 6: Payment verified & marked paid_held; deal marked payment_confirmed.');

    // 8. Test Handover Confirmation releases the held funds
    await DealService.confirmHandover(deal._id, seller._id, '123456');

    const releasedPayment = await Payment.findOne({ deal: deal._id });
    if (releasedPayment.status !== 'released' || !releasedPayment.releasedAt) {
      throw new Error(`Expected payment status 'released', got '${releasedPayment?.status}'`);
    }

    const completedDeal = await Deal.findById(deal._id);
    if (completedDeal.status !== 'completed') {
      throw new Error(`Expected deal status 'completed', got '${completedDeal?.status}'`);
    }
    console.log('✅ Test 7: Handover code verified and transfer automatically released to seller.');

    // 9. Test Refund Flow on Failure Outcome
    const deal2 = await Deal.create({
      listing: listing._id,
      seller: seller._id,
      buyer: winner._id,
      amount: 400,
      status: 'approved',
      cancellationReason: '[Test-M16]',
    });

    await PaymentService.createOrder(winner._id, deal2._id);
    await PaymentService.verifyPayment(winner._id, {
      dealId: deal2._id,
      razorpayOrderId: 'order_test_deal2',
      razorpayPaymentId: 'pay_test_deal2',
      razorpaySignature: 'test_sig_mock',
    });

    // Record failure outcome
    await DealService.recordDealOutcome(deal2._id, winner._id, {
      outcome: 'pickup_failed',
      reason: 'Seller was not present at campus library',
    });

    const refundedPayment = await Payment.findOne({ deal: deal2._id });
    if (refundedPayment.status !== 'refunded' || !refundedPayment.refundedAt) {
      throw new Error(`Expected payment status 'refunded', got '${refundedPayment?.status}'`);
    }
    console.log('✅ Test 8: Deal failure outcome triggered automatic payment refund.');

    console.log('\n🎉 ALL 8 TESTS PASSED FOR MODULE 16 RAZORPAY ROUTE SPLIT PAYMENTS!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error);
    process.exit(1);
  }
}

runTests();
