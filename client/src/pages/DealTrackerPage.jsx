import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Send,
  Truck,
  MapPin,
  QrCode,
  DollarSign,
  Copy,
  Check,
  Package,
  MessageSquare,
  Lock,
  ChevronRight,
  User,
  CreditCard,
} from 'lucide-react';

export default function DealTrackerPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Method selection form (Buyer only)
  const [chosenMethod, setChosenMethod] = useState('upi');
  const [fulfilment, setFulfilment] = useState('campus_pickup');
  const [addressForm, setAddressForm] = useState({
    recipientName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    contactPhone: '',
  });

  // Courier form (Seller only)
  const [courierForm, setCourierForm] = useState({
    courierName: '',
    trackingId: '',
  });

  // Handover code input (Seller only)
  const [inputHandoverCode, setInputHandoverCode] = useState('');

  // Action status states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Deal Chat (Module 16b)
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef(null);

  // Fetch deal details
  const fetchDeal = () => {
    api.get(`/deals/${id}`)
      .then((res) => {
        setDeal(res.data?.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load deal:', err);
        setError(err.response?.data?.message || 'Failed to load deal details');
        setLoading(false);
      });
  };

  // Fetch deal chat messages
  const fetchChat = () => {
    api.get(`/deals/${id}/chat`)
      .then((res) => {
        setMessages(res.data?.data?.messages || []);
      })
      .catch((err) => console.warn('Chat load error:', err.message));
  };

  useEffect(() => {
    fetchDeal();
    fetchChat();

    // Poll chat every 6 seconds as reliable fallback
    const interval = setInterval(fetchChat, 6000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-8 bg-sage/20 rounded w-1/3" />
        <div className="h-40 bg-sage/20 rounded-2xl" />
        <div className="h-64 bg-sage/20 rounded-2xl" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber flex items-center justify-center border border-amber/40">
          <AlertTriangle className="w-8 h-8 text-amber" />
        </div>
        <h2 className="text-xl font-black text-forest">Access Restricted</h2>
        <p className="text-sm text-charcoal/80">
          {error || 'You are not authorized to view this private deal.'}
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-forest text-warm-white font-bold text-xs"
        >
          Back to Live Auctions
        </Link>
      </div>
    );
  }

  const isBuyer = user && deal.buyer && user._id === deal.buyer._id;
  const isSeller = user && deal.seller && user._id === deal.seller._id;

  const handleCopyUpi = () => {
    if (deal.sellerPaymentDetails?.upiId) {
      navigator.clipboard.writeText(deal.sellerPaymentDetails.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  // 1. Buyer chooses method & fulfilment
  const handleChooseMethod = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);

    try {
      const payload = {
        chosenMethod,
        fulfilment,
        deliveryAddress: fulfilment === 'courier' ? addressForm : undefined,
      };
      await api.post(`/deals/${deal._id}/choose-method`, payload);
      setActionSuccess('Details submitted! Seller payment information revealed.');
      fetchDeal();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to submit selection');
    } finally {
      setActionLoading(false);
    }
  };

  // 1b. Buyer pays via Razorpay Route
  const handleRazorpayPay = async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      const orderRes = await api.post('/payments/order', { dealId: deal._id });
      const orderData = orderRes.data?.data;

      if (!orderData) throw new Error('Failed to create payment order');

      if (window.Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Campus Auction',
          description: `Payment for ${deal.listing?.title}`,
          order_id: orderData.orderId,
          handler: async (response) => {
            try {
              await api.post('/payments/verify', {
                dealId: deal._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              setActionSuccess('Payment completed and held safely in escrow! Ready for pickup.');
              fetchDeal();
            } catch (vErr) {
              setActionError(vErr.response?.data?.message || 'Payment signature verification failed');
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: {
            color: '#1F4D3A',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setActionError(`Payment failed: ${resp.error?.description || 'Payment rejected'}`);
        });
        rzp.open();
      } else {
        // Test mode fallback simulation
        await api.post('/payments/verify', {
          dealId: deal._id,
          razorpayOrderId: orderData.orderId,
          razorpayPaymentId: `pay_test_${Date.now()}`,
          razorpaySignature: 'mock_signature',
        });
        setActionSuccess('Payment verified (Test Mode) and held safely in escrow until handover!');
        fetchDeal();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to initiate online payment');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Buyer marks paid
  const handleMarkPaid = async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      await api.post(`/deals/${deal._id}/mark-paid`, { note: 'Payment sent via direct UPI' });
      setActionSuccess('Marked as paid! Awaiting seller confirmation.');
      fetchDeal();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to mark paid');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Seller confirms payment
  const handleConfirmPayment = async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      await api.post(`/deals/${deal._id}/confirm-payment`, { note: 'Payment verified in bank account' });
      setActionSuccess('Payment verified successfully!');
      fetchDeal();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to confirm payment');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Seller dispatches courier
  const handleDispatchCourier = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);

    try {
      await api.post(`/deals/${deal._id}/courier`, courierForm);
      setActionSuccess('Courier tracking information recorded!');
      fetchDeal();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update courier');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Handover confirmation (Pickup with 6-digit code or Courier delivery confirm)
  const handleCompleteHandover = async (e) => {
    if (e) e.preventDefault();
    setActionLoading(true);
    setActionError(null);

    try {
      await api.post(`/deals/${deal._id}/complete`, { handoverCode: inputHandoverCode });
      setActionSuccess('Sale completed successfully! Deal verified.');
      fetchDeal();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to complete deal');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Send Deal Chat Message (Module 16b)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMsg) return;

    setSendingMsg(true);
    try {
      const res = await api.post(`/deals/${deal._id}/chat`, { text: newMessage.trim() });
      setMessages((prev) => [...prev, res.data?.data]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Status Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to={`/listings/${deal.listing?._id || ''}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-amber-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Auction Item</span>
        </Link>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest text-warm-white text-xs font-black uppercase tracking-wider shadow-xs">
          <ShieldCheck className="w-4 h-4 text-amber" />
          <span>Deal Status: {deal.status.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Main Deal Header Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-warm-white-paper border-2 border-forest shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sage/40">
          <div>
            <span className="text-xs font-bold text-charcoal-muted uppercase tracking-wider block">
              Private Campus Deal Tracker
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-charcoal">
              {deal.listing?.title}
            </h1>
            <div className="flex items-center gap-3 pt-1 text-xs text-charcoal/80">
              <span>
                Seller: <strong className="font-bold text-charcoal">{deal.seller?.name}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Winning Buyer: <strong className="font-bold text-charcoal">{deal.buyer?.name}</strong>
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-charcoal-muted block">Approved Final Price</span>
            <span className="text-3xl font-black text-charcoal">₹{deal.amount}</span>
          </div>
        </div>

        {/* Global Action Notifications */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-sage-50 border border-sage text-charcoal text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sage-dark shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Dynamic Action Steps */}
        {/* Step A: Buyer chooses payment method & fulfilment */}
        {isBuyer && deal.status === 'approved' && (
          <form onSubmit={handleChooseMethod} className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-sage-50 border-2 border-sage space-y-3">
              <h3 className="font-black text-charcoal text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sage-dark" />
                Step 1: Choose Your Payment Method & Delivery
              </h3>
              <p className="text-xs text-charcoal/80 leading-relaxed">
                The seller approved your bid of ₹{deal.amount}. Select how you would like to pay and receive this item.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-charcoal block mb-1.5">Payment Method</label>
                  <select
                    value={chosenMethod}
                    onChange={(e) => setChosenMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sage/60 bg-warm-white text-charcoal text-xs font-bold focus:outline-none focus:border-charcoal"
                  >
                    <option value="online">Online via Razorpay Route (Held in Escrow)</option>
                    <option value="upi">Direct UPI (GPay / PhonePe / Paytm)</option>
                    <option value="cash_on_pickup">Cash on Campus Pickup</option>
                    <option value="other">Other Instructions</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-charcoal block mb-1.5">Fulfilment</label>
                  <select
                    value={fulfilment}
                    onChange={(e) => setFulfilment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sage/60 bg-warm-white text-charcoal text-xs font-bold focus:outline-none focus:border-charcoal"
                  >
                    <option value="campus_pickup">Campus Handover (Default)</option>
                    <option value="courier">Courier Delivery to Address</option>
                  </select>
                </div>
              </div>

              {fulfilment === 'courier' && (
                <div className="space-y-2 pt-2 border-t border-amber/30">
                  <span className="text-xs font-black text-forest block">Courier Delivery Address</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Recipient Full Name"
                      value={addressForm.recipientName}
                      onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-sage/60 bg-warm-white font-medium"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Phone Number for Courier"
                      value={addressForm.contactPhone}
                      onChange={(e) => setAddressForm({ ...addressForm, contactPhone: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-sage/60 bg-warm-white font-medium"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Hostel / Street Address Line 1"
                      value={addressForm.addressLine1}
                      onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                      className="sm:col-span-2 px-3 py-2 rounded-xl border border-sage/60 bg-warm-white font-medium"
                      required
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-sage/60 bg-warm-white font-medium"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Postal PIN Code"
                      value={addressForm.postalCode}
                      onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-sage/60 bg-warm-white font-medium"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-forest text-warm-white font-black text-xs hover:bg-forest-light transition-all shadow-xs"
              >
                {actionLoading ? 'Saving Selection...' : 'Confirm Selection & Reveal Seller Details'}
              </button>
            </div>
          </form>
        )}

        {/* Step B: Payment Details Revealed (UPI ID / Cash instructions) */}
        {deal.sellerPaymentDetails?.upiId && (
          <div className="p-5 rounded-2xl bg-sage-50 border-2 border-sage space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber" />
                Seller Direct Payment Information
              </span>
              <span className="text-[11px] font-bold text-charcoal bg-sage-100 px-2.5 py-0.5 rounded-full border border-sage">
                {deal.chosenMethod?.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-warm-white border border-sage/50">
              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal-muted block">Seller UPI ID</span>
                <span className="font-mono text-base font-black text-charcoal">
                  {deal.sellerPaymentDetails.upiId}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal hover:bg-charcoal-hover text-warm-white font-black text-xs shadow-xs self-start sm:self-auto cursor-pointer border border-charcoal"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-sage" /> : <Copy className="w-3.5 h-3.5 text-sage" />}
                <span>{copiedUpi ? 'Copied!' : 'Copy UPI ID'}</span>
              </button>
            </div>

            {deal.sellerPaymentDetails.contactPhone && (
              <div className="text-xs text-charcoal/80 font-medium">
                Seller Contact Phone: <strong className="font-bold text-charcoal">{deal.sellerPaymentDetails.contactPhone}</strong>
              </div>
            )}

            {/* Buyer Mark Paid Button */}
            {isBuyer && deal.status === 'details_shared' && (
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-charcoal hover:bg-charcoal-hover text-warm-white font-black text-xs shadow-md border border-charcoal transition-all cursor-pointer"
              >
                {actionLoading ? 'Updating...' : 'I Have Paid via UPI (Notify Seller)'}
              </button>
            )}
          </div>
        )}

        {/* Step B2: Razorpay Online Payment Card */}
        {deal.chosenMethod === 'online' && ['details_shared', 'payment_pending', 'approved'].includes(deal.status) && (
          <div className="p-5 rounded-2xl bg-forest-50/70 border-2 border-forest/40 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-forest flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber" />
                Online Payment via Razorpay Route (Test Mode)
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-forest bg-amber px-2.5 py-0.5 rounded-full">
                Escrow Held
              </span>
            </div>

            <div className="p-4 rounded-xl bg-warm-white border border-sage/60 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-charcoal/80 font-medium">Approved Final Price</span>
                <span className="text-xl font-black text-forest">₹{deal.amount}</span>
              </div>
              <p className="text-xs text-charcoal/70 leading-relaxed">
                Protected by campus escrow. Your payment is held on hold and transferred to the seller only when you share and verify your 6-digit handover code during physical pickup.
              </p>
            </div>

            {isBuyer && (
              <button
                type="button"
                onClick={handleRazorpayPay}
                disabled={actionLoading}
                className="w-full py-3.5 rounded-xl bg-amber hover:bg-amber-hover text-forest font-black text-xs sm:text-sm shadow-md shadow-amber/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-forest" />
                <span>{actionLoading ? 'Connecting to Gateway...' : `Pay ₹${deal.amount} via Razorpay`}</span>
              </button>
            )}
          </div>
        )}

        {/* Step C: Seller Confirms Receipt */}
        {isSeller && deal.status === 'payment_pending' && (
          <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber/50 space-y-3">
            <h3 className="font-black text-forest text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber" />
              Buyer Has Marked Payment as Sent
            </h3>
            <p className="text-xs text-charcoal/80 leading-relaxed">
              The buyer confirmed sending ₹{deal.amount} to your UPI. Please verify your banking app before confirming.
            </p>
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl bg-forest hover:bg-forest-light text-warm-white font-black text-xs shadow-sm transition-all"
            >
              {actionLoading ? 'Verifying...' : 'Payment Received in Bank (Confirm)'}
            </button>
          </div>
        )}

        {/* Step D: Courier Tracking Form (Seller) */}
        {isSeller && deal.fulfilment === 'courier' && deal.status === 'payment_confirmed' && (
          <form onSubmit={handleDispatchCourier} className="p-5 rounded-2xl bg-sage-50 border-2 border-sage space-y-3">
            <h3 className="font-black text-forest text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-forest" />
              Dispatch Item via Courier
            </h3>
            <p className="text-xs text-charcoal/80">
              Payment is verified. Enter the courier service and tracking number to notify the buyer.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                placeholder="Courier Service (e.g. BlueDart, DTDC)"
                value={courierForm.courierName}
                onChange={(e) => setCourierForm({ ...courierForm, courierName: e.target.value })}
                className="px-3 py-2 rounded-xl border border-sage/60 bg-warm-white font-medium"
                required
              />
              <input
                type="text"
                placeholder="Tracking ID / Consignment No."
                value={courierForm.trackingId}
                onChange={(e) => setCourierForm({ ...courierForm, trackingId: e.target.value })}
                className="px-3 py-2 rounded-xl border border-sage/60 bg-warm-white font-medium"
                required
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2.5 rounded-xl bg-forest text-warm-white font-black text-xs shadow-xs"
            >
              {actionLoading ? 'Saving...' : 'Mark as Shipped with Tracking'}
            </button>
          </form>
        )}

        {/* Step E: Campus Handover (6-Digit Code) */}
        {deal.fulfilment === 'campus_pickup' && ['payment_confirmed', 'details_shared', 'pickup_scheduled'].includes(deal.status) && (
          <div className="p-5 rounded-2xl bg-warm-white border-2 border-sage/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-forest flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber" />
                Campus Handover Verification
              </span>
              <span className="text-[11px] font-bold text-forest bg-sage/20 px-2 py-0.5 rounded">
                Campus Meetup
              </span>
            </div>

            {isBuyer && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber/40 text-center space-y-2">
                <span className="text-xs font-bold text-charcoal-muted uppercase tracking-wider block">
                  Your 6-Digit Verification Code
                </span>
                <div className="text-3xl sm:text-4xl font-mono font-black text-forest tracking-widest">
                  {deal.pickupInfo?.handoverCode || '------'}
                </div>
                <p className="text-[11px] text-charcoal/70">
                  Show this code to the senior when you meet on campus and inspect the item.
                </p>
              </div>
            )}

            {isSeller && (
              <form onSubmit={handleCompleteHandover} className="space-y-3">
                <p className="text-xs text-charcoal/80">
                  Inspect the item together with the junior, then enter the 6-digit code shown on the buyer's screen to complete the handover.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="Enter 6-digit code"
                    value={inputHandoverCode}
                    onChange={(e) => setInputHandoverCode(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-sage text-center font-mono text-lg font-black tracking-widest focus:outline-none focus:border-forest"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || inputHandoverCode.length !== 6}
                    className="px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-warm-white font-black text-xs disabled:opacity-50"
                  >
                    Verify & Complete
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Step F: Courier Delivery Received (Buyer confirms) */}
        {isBuyer && deal.fulfilment === 'courier' && deal.status === 'shipped' && (
          <div className="p-5 rounded-2xl bg-sage-50 border-2 border-sage space-y-3">
            <h3 className="font-black text-forest text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-forest" />
              Item Shipped via Courier
            </h3>
            <p className="text-xs text-charcoal/80">
              Tracking: <strong>{deal.courierInfo?.courierName}</strong> (ID: {deal.courierInfo?.trackingId}).
              Once you have received and inspected the package, click confirm below.
            </p>
            <button
              type="button"
              onClick={() => handleCompleteHandover()}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl bg-forest hover:bg-forest-light text-warm-white font-black text-xs shadow-xs"
            >
              {actionLoading ? 'Completing...' : 'Confirm Package Received (Complete Sale)'}
            </button>
          </div>
        )}

        {/* Step G: Completed State */}
        {deal.status === 'completed' && (
          <div className="p-5 rounded-2xl bg-sage/25 border-2 border-forest text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-forest text-amber flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6 text-amber" />
            </div>
            <h3 className="text-lg font-black text-forest">Deal Completed Successfully!</h3>
            <p className="text-xs text-charcoal/80 max-w-md mx-auto">
              Handover verified and sale finalized. This completed transaction is now recorded in your campus history dashboard.
            </p>
          </div>
        )}
      </div>

      {/* Module 16b: Private Deal Chat & Status History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Private Deal Chat (7 Cols) */}
        <div className="lg:col-span-7 bg-warm-white-paper rounded-3xl border-2 border-sage/60 p-5 sm:p-6 space-y-4 shadow-xs flex flex-col h-[520px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-sage/40 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-forest" />
              <h3 className="font-black text-forest text-sm">Private Deal Chat</h3>
            </div>
            <span className="text-[11px] font-bold text-forest bg-sage/20 px-2 py-0.5 rounded">
              Encrypted Peer Room
            </span>
          </div>

          {/* Safety Banner (Mandatory per brief) */}
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber/40 text-[11px] text-forest font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber shrink-0" />
            <span>Safety Note: Never share passwords or OTPs. Pay only after confirming the item.</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6 text-xs text-charcoal-muted">
                No messages yet. Send a message to coordinate pickup time and handover details!
              </div>
            ) : (
              messages.map((m, idx) => {
                const isMe = user && m.sender?._id === user._id;
                return (
                  <div
                    key={m._id || idx}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-charcoal-muted font-bold mb-0.5 px-1">
                      {m.sender?.name || 'Student'}
                    </span>
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-forest text-warm-white font-medium rounded-br-2xs'
                          : 'bg-warm-white border border-sage/50 text-charcoal font-medium rounded-bl-2xs'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[9px] text-charcoal-muted mt-0.5 px-1">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className="pt-2 border-t border-sage/40 flex gap-2">
            <input
              type="text"
              maxLength="1000"
              placeholder="Type private message to seller/buyer..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-sage/60 bg-warm-white text-xs font-medium focus:outline-none focus:border-forest"
            />
            <button
              type="submit"
              disabled={sendingMsg || !newMessage.trim()}
              className="px-4 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-warm-white font-bold text-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-amber" />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* Right Column: Status History & Timeline (5 Cols) */}
        <div className="lg:col-span-5 bg-warm-white-paper rounded-3xl border-2 border-sage/60 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-sage/40 pb-3">
            <Clock className="w-4 h-4 text-forest" />
            <h3 className="font-black text-forest text-sm">Deal Status Audit Log</h3>
          </div>

          <div className="space-y-3">
            {deal.statusHistory && deal.statusHistory.length > 0 ? (
              deal.statusHistory.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-forest text-amber font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-black text-forest uppercase tracking-wider block">
                      {step.status.replace(/_/g, ' ')}
                    </span>
                    <p className="text-charcoal/80 text-[11px] font-medium leading-relaxed">
                      {step.note}
                    </p>
                    <span className="text-[10px] text-charcoal-muted block">
                      {new Date(step.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-charcoal-muted">No status history recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
