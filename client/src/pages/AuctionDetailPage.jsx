import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import CountdownTimer from '../components/CountdownTimer';
import ListingQaSection from '../components/ListingQaSection';
import {
  Gavel,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowLeft,
  ChevronRight,
  User,
  Tag,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Sparkles,
  Info,
  DollarSign,
  History,
  Lock,
  Zap,
} from 'lucide-react';
import useAuctionSocket from '../hooks/useAuctionSocket';
import ItemImage from '../components/ItemImage';
import { categoryEmojiMap } from '../config/categoryConfig';

export default function AuctionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Live real-time socket events state (Module 6)
  const [extensionAlert, setExtensionAlert] = useState(null);
  const [liveBidBanner, setLiveBidBanner] = useState(null);

  // Bidding form state
  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState(null);
  const [bidSuccess, setBidSuccess] = useState(null);
  const [submittingBid, setSubmittingBid] = useState(false);

  // Subscribe to live auction Socket.io room (Module 6)
  useAuctionSocket(id, {
    onNewBid: (data) => {
      setListing((prev) => {
        if (!prev) return prev;
        const bids = prev.bids || [];
        const alreadyExists = bids.some((b) => b._id === data.bid?._id);
        const nextBids = alreadyExists ? bids : [data.bid, ...bids];
        return {
          ...prev,
          currentPrice: data.currentPrice,
          bidCount: data.bidCount,
          closingTime: data.closingTime,
          leadingBidder: data.leadingBidder,
          bids: nextBids,
        };
      });

      // Dynamically update next valid minimum bid amount
      setBidAmount((prevAmount) => {
        const nextMin = data.currentPrice + (listing?.minIncrement || 50);
        return String(Math.max(Number(prevAmount) || 0, nextMin));
      });

      // Flash live bid banner if from another student
      if (!user || data.leadingBidder?._id !== user._id) {
        setLiveBidBanner(`⚡ New leading bid of ₹${data.currentPrice} placed by ${data.leadingBidder?.name || 'Fellow Student'}!`);
        setTimeout(() => setLiveBidBanner(null), 6000);
      }
    },
    onAuctionClosed: (data) => {
      setListing((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: data.status,
          finalPrice: data.finalPrice || prev.currentPrice,
          winner: data.winner || prev.winner || prev.leadingBidder,
        };
      });
      setLiveBidBanner(
        data.status === 'pending_approval'
          ? `Auction closed! Awaiting seller approval for winning bid of ₹${data.finalPrice || ''}`
          : `Auction closed without bids.`
      );
      setTimeout(() => setLiveBidBanner(null), 8000);
    },
    onAuctionApproved: (data) => {
      setListing((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'approved',
          dealId: data.dealId,
        };
      });
      setLiveBidBanner(`🎉 Sale Approved! Deal tracker is now open.`);
      setTimeout(() => setLiveBidBanner(null), 8000);
    },
    onAuctionRejected: () => {
      setListing((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'rejected',
        };
      });
    },
  });

  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);
    setError(null);

    api.get(`/listings/${id}`)
      .then((res) => {
        if (!isSubscribed) return;
        const data = res.data?.data;
        setListing(data);
        if (data) {
          const nextMin = (data.currentPrice || data.startingPrice) + (data.bidCount > 0 ? data.minIncrement : 0);
          setBidAmount(String(nextMin));
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        console.error('Failed to fetch listing:', err);
        setError(err.response?.data?.message || 'Listing not found or failed to load');
        setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-8">
        <div className="h-6 bg-sage/20 rounded w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-4/3 bg-sage/20 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-sage/20 rounded w-3/4" />
            <div className="h-6 bg-sage/15 rounded w-1/2" />
            <div className="h-24 bg-sage/20 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber flex items-center justify-center border border-amber/40">
          <AlertTriangle className="w-8 h-8 text-amber" />
        </div>
        <h2 className="text-2xl font-black text-forest">Auction Not Found</h2>
        <p className="text-sm text-charcoal/70">
          {error || "The auction listing you're looking for doesn't exist or has been removed."}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest text-warm-white font-bold text-xs hover:bg-forest-light"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Auctions</span>
        </Link>
      </div>
    );
  }

  const isSeller = user && listing.seller && (user._id === listing.seller._id || user._id === listing.seller);
  const isWinner =
    user &&
    ((listing.winner && (user._id === listing.winner._id || user._id === listing.winner)) ||
      (listing.leadingBidder &&
        (user._id === listing.leadingBidder._id || user._id === listing.leadingBidder)));

  // Seller approval / decline states (Module 8)
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const handleApproveSale = async () => {
    setDecisionLoading(true);
    setDecisionError(null);
    try {
      const res = await api.post(`/listings/${id}/approve`);
      const deal = res.data?.data?.deal;
      setListing((prev) => ({
        ...prev,
        status: 'approved',
        dealId: deal?._id,
      }));
      if (deal?._id) {
        navigate(`/deals/${deal._id}`);
      }
    } catch (err) {
      console.error('Failed to approve bid:', err);
      setDecisionError(err.response?.data?.message || 'Failed to approve bid');
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleRejectSale = async () => {
    setDecisionLoading(true);
    setDecisionError(null);
    try {
      await api.post(`/listings/${id}/reject`, {
        reason: declineReason || 'Price below expectations',
      });
      setListing((prev) => ({
        ...prev,
        status: 'rejected',
      }));
      setShowDeclineModal(false);
    } catch (err) {
      console.error('Failed to decline bid:', err);
      setDecisionError(err.response?.data?.message || 'Failed to decline bid');
    } finally {
      setDecisionLoading(false);
    }
  };

  const minValidBid = listing.bidCount > 0 ? listing.currentPrice + listing.minIncrement : listing.startingPrice;
  const isClosed = listing.status !== 'active' || (listing.timeLeftMs !== undefined && listing.timeLeftMs <= 0);

  const categoryEmoji = categoryEmojiMap[listing.category?.toLowerCase()] || `🏷️ ${listing.category}`;

  const conditionColorMap = {
    'New': 'bg-sage/25 text-forest border-sage font-black',
    'Like new': 'bg-sage/25 text-forest border-sage font-black',
    'Good': 'bg-forest/10 text-forest border-forest/30 font-extrabold',
    'Fair': 'bg-amber/20 text-amber-hover border-amber/50 font-black',
    'Poor': 'bg-red-50 text-red-700 border-red-300 font-black',
  };
  const conditionBadgeStyle = conditionColorMap[listing.condition?.grade] || 'bg-sage/20 text-forest border-sage';

  const placeholderImages = {
    vehicles: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
    stationery: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=800&q=80',
    cycle: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
    calculator: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
    books: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    electronics: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80',
    furniture: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    clothing: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
    sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
    other: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80',
  };

  const photosList = Array.isArray(listing.photos) && listing.photos.length > 0 ? listing.photos : [placeholderImages[listing.category] || placeholderImages.other];

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    setBidError(null);
    setBidSuccess(null);

    const val = Number(bidAmount);
    if (!val || isNaN(val)) {
      setBidError('Please enter a valid bid amount');
      return;
    }
    if (val < minValidBid) {
      setBidError(`Bid must be at least ₹${minValidBid}`);
      return;
    }

    setSubmittingBid(true);
    try {
      const res = await api.post('/bids', { listingId: listing._id, amount: val });
      const result = res.data?.data;
      
      // Update local listing state with atomically returned values
      setListing((prev) => {
        const updatedBids = [result.bid, ...(prev.bids || [])];
        return {
          ...prev,
          currentPrice: result.listing.currentPrice,
          bidCount: result.listing.bidCount,
          closingTime: result.listing.closingTime,
          leadingBidder: result.listing.leadingBidder,
          bids: updatedBids,
        };
      });

      // Update next minimum bid amount in input
      const nextMin = result.listing.currentPrice + (listing.minIncrement || 10);
      setBidAmount(String(nextMin));
      setBidSuccess(result.message || `Bid of ₹${val} placed successfully! You are now leading.`);
    } catch (err) {
      console.error('Failed to place bid:', err);
      const status = err.response?.status;
      const msg = err.response?.data?.message || '';

      if (status === 401) {
        navigate(`/login?redirect=/listings/${id}`);
        return;
      }
      if (status === 403 && (msg.toLowerCase().includes('verify') || msg.toLowerCase().includes('verification'))) {
        setBidError('Please verify your campus email before placing a bid on this auction.');
        return;
      }
      if (msg.toLowerCase().includes('own listing') || msg.toLowerCase().includes('own item')) {
        setBidError('You cannot bid on your own item.');
        return;
      }
      if (msg.toLowerCase().includes('closed') || msg.toLowerCase().includes('ended')) {
        setBidError('This auction has ended. Bids are no longer accepted.');
        return;
      }
      setBidError(msg || 'Failed to place bid. Please check the minimum amount.');
    } finally {
      setSubmittingBid(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28 sm:pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-charcoal/70">
        <Link to="/" className="hover:text-forest font-semibold">
          Live Auctions
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/?category=${listing.category}`} className="hover:text-forest font-semibold capitalize">
          {listing.category}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-forest font-bold truncate max-w-xs">{listing.title}</span>
      </nav>

      {/* Main Grid: Left Photos & Details, Right Live Auction Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Photos & Structured Condition Breakdown (7 Cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Photo Showcase */}
          <div className="bg-warm-white-paper rounded-3xl border-2 border-sage/60 p-4 space-y-4 shadow-xs">
            {/* Active Hero Image (1:1 Ratio, Full Resolution) */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-warm-white-muted">
              <ItemImage
                src={photosList[selectedPhotoIndex]}
                alt={listing.title}
                category={listing.category}
                useThumbnail={false}
                className="w-full h-full object-cover"
                containerClassName="rounded-2xl"
              />

              {listing.defectPhotoIncluded && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber text-charcoal text-xs font-black shadow-md">
                    <Camera className="w-4 h-4 text-charcoal" />
                    Defect Close-up Photo Included
                  </span>
                </div>
              )}

              <div className="absolute bottom-3 right-3 z-10">
                <span className="px-3 py-1 rounded-full bg-charcoal/80 text-warm-white text-xs font-bold backdrop-blur-xs">
                  Photo {selectedPhotoIndex + 1} of {photosList.length}
                </span>
              </div>
            </div>

            {/* Thumbnail Strip (1:1 Square Thumbnails) */}
            {photosList.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {photosList.map((photo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      selectedPhotoIndex === idx
                        ? 'border-charcoal ring-2 ring-charcoal/30 scale-105'
                        : 'border-sage/50 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <ItemImage
                      src={photo}
                      thumbnailSrc={listing.photoThumbnails?.[idx]}
                      alt={`thumb ${idx}`}
                      category={listing.category}
                      useThumbnail={true}
                      containerClassName="w-full h-full"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Core Principle: Structured Condition Disclosure Breakdown */}
          <div className="bg-warm-white-paper rounded-3xl border-2 border-sage/60 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-sage/40 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-forest text-amber flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-amber" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-forest">
                    100% Structured Condition Disclosure
                  </h2>
                  <p className="text-xs text-charcoal-muted">
                    Mandatory factual report filled by the senior prior to listing
                  </p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs border ${conditionBadgeStyle}`}>
                Grade: {listing.condition?.grade || 'Inspected'}
              </span>
            </div>

            {/* 3 Major Condition Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-warm-white border border-sage/50">
                <span className="text-[10px] uppercase font-black tracking-wider text-charcoal-muted block">
                  Condition Grade
                </span>
                <span className="text-base font-extrabold text-forest">
                  {listing.condition?.grade}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-warm-white border border-sage/50">
                <span className="text-[10px] uppercase font-black tracking-wider text-charcoal-muted block">
                  Item Age
                </span>
                <span className="text-base font-extrabold text-forest">
                  {listing.condition?.age || 'Not specified'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-warm-white border border-sage/50">
                <span className="text-[10px] uppercase font-black tracking-wider text-charcoal-muted block">
                  Working Status
                </span>
                <span className="text-base font-extrabold text-forest">
                  {listing.condition?.workingStatus || 'Functional'}
                </span>
              </div>
            </div>

            {/* Mandatory Known Defects Disclosure (Amber Callout) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-forest">
                <ShieldAlert className="w-4 h-4 text-amber" />
                <span>Known Wear & Defects (Honesty Mandatory)</span>
              </div>
              <p className="text-sm font-semibold text-charcoal leading-relaxed">
                {listing.condition?.defects && listing.condition.defects !== 'None'
                  ? listing.condition.defects
                  : 'Zero major defects reported. Senior confirmed item is in clean working condition.'}
              </p>
            </div>

            {/* Included Accessories */}
            {Array.isArray(listing.condition?.accessories) && listing.condition.accessories.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-forest block">
                  Included Accessories
                </span>
                <div className="flex flex-wrap gap-2">
                  {listing.condition.accessories.map((acc, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sage-50 text-forest border border-sage text-xs font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                      {acc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Category-Specific Detailed Specs */}
            {listing.condition?.categoryDetails && (
              <div className="space-y-3 pt-2 border-t border-sage/40">
                <span className="text-xs font-black uppercase tracking-wider text-forest block">
                  Category-Specific Technical Specs
                </span>

                {/* Vehicles / Cycle */}
                {(listing.category === 'vehicles' || listing.category === 'cycle') && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Type / Model</span>
                      <span className="font-extrabold text-forest">{listing.itemType || listing.condition?.categoryDetails?.vehicles_type || 'Vehicle'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Brakes</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.vehicles_brakes || listing.condition?.categoryDetails?.cycle?.brakes || 'Standard'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Tyres</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.vehicles_tyres || listing.condition?.categoryDetails?.cycle?.tyres || 'Good'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Gears</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.vehicles_gears || (listing.condition?.categoryDetails?.cycle?.geared ? 'Geared' : 'Single Speed')}</span>
                    </div>
                  </div>
                )}

                {/* Stationery / Calculator */}
                {(listing.category === 'stationery' || listing.category === 'calculator') && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Kind / Model</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.stationery_kind || listing.condition?.categoryDetails?.stationery_model || listing.condition?.categoryDetails?.calculator?.modelType || 'Stationery'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Display / Power</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.stationery_displayBattery || listing.condition?.categoryDetails?.calculator?.display || 'Good'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Quantity</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.stationery_quantity || '1 Unit'}</span>
                    </div>
                  </div>
                )}

                {/* Books */}
                {listing.category === 'books' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Author / Edition</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.books_author || listing.condition?.categoryDetails?.books?.edition || 'Standard'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Page Markings</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.books_markedPages || listing.condition?.categoryDetails?.books?.markedPages || 'Clean'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Binding</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.books_missingPages || listing.condition?.categoryDetails?.books?.binding || 'Intact'}</span>
                    </div>
                  </div>
                )}

                {/* Electronics */}
                {listing.category === 'electronics' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Battery Health</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.electronics_batteryHealth || listing.condition?.categoryDetails?.electronics?.batteryHealth || 'Good'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Charger</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.electronics_charger || (listing.condition?.categoryDetails?.electronics?.chargerIncluded ? 'Included' : 'Not included')}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Warranty</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.electronics_warranty || 'Standard'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Screen</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.electronics_screen || listing.condition?.categoryDetails?.electronics?.screenCondition || 'Good'}</span>
                    </div>
                  </div>
                )}

                {/* Furniture */}
                {listing.category === 'furniture' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Type</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.furniture_type || listing.itemType || 'Furniture'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Material</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.furniture_material || 'Standard'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Wear</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.furniture_wear || 'Sturdy'}</span>
                    </div>
                  </div>
                )}

                {/* Clothing */}
                {listing.category === 'clothing' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Garment Type</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.clothing_type || listing.itemType || 'Clothing'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Size</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.clothing_size || 'Standard'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Wear Condition</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.clothing_wear || 'Good'}</span>
                    </div>
                  </div>
                )}

                {/* Sports */}
                {listing.category === 'sports' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Equipment</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.sports_type || listing.itemType || 'Sports'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Size / Grip</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.sports_size || 'Standard'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-warm-white border border-sage/40">
                      <span className="text-[10px] text-charcoal-muted block font-bold">Playability</span>
                      <span className="font-extrabold text-forest">{listing.condition?.categoryDetails?.sports_wear || 'Playable'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Seller Description */}
            <div className="space-y-2 pt-2 border-t border-sage/40">
              <span className="text-xs font-black uppercase tracking-wider text-forest block">
                Seller's Detailed Notes
              </span>
              <p className="text-sm text-charcoal/90 leading-relaxed whitespace-pre-line bg-warm-white p-4 rounded-2xl border border-sage/40">
                {listing.description}
              </p>
            </div>

            {/* Honor Code Pledge */}
            <div className="p-3 rounded-xl bg-sage/20 border border-sage/60 flex items-center gap-2 text-xs text-forest font-semibold">
              <ShieldCheck className="w-4 h-4 text-forest shrink-0" />
              <span>Campus Honor Code: Seller certified that all details are accurate upon listing.</span>
            </div>
          </div>

          {/* Module 10: Pre-Bid Public Q&A */}
          <ListingQaSection listingId={listing._id} isSeller={isSeller} />
        </div>

        {/* Right Column: Live Auction Box, Bidding Form & Public Bid History (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          {/* Anti-Sniping Live Extension Banner */}
          {extensionAlert && (
            <div className="p-4 rounded-2xl bg-amber/20 border-2 border-amber flex items-center gap-3 animate-pulse text-forest shadow-md">
              <Zap className="w-6 h-6 text-amber-hover fill-amber shrink-0 animate-bounce" />
              <div>
                <h4 className="font-black text-xs uppercase tracking-wider text-forest">Anti-Sniping Triggered</h4>
                <p className="text-xs font-bold text-charcoal">{extensionAlert}</p>
              </div>
            </div>
          )}

          {/* Real-time Bid Notification Banner */}
          {liveBidBanner && (
            <div className="p-3.5 rounded-2xl bg-forest text-warm-white flex items-center gap-2.5 shadow-md border border-forest-light animate-fade-in">
              <Gavel className="w-4 h-4 text-amber shrink-0 animate-pulse" />
              <span className="text-xs font-bold">{liveBidBanner}</span>
            </div>
          )}

          {/* Main Auction Box */}
          <div className="bg-warm-white-paper rounded-3xl border-2 border-charcoal p-6 sm:p-7 space-y-6 shadow-md">
            {/* Title & Category Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-charcoal text-warm-white text-xs font-bold">
                  {categoryEmoji}
                </span>
                <span className="text-xs text-charcoal-muted font-bold">
                  Listed {new Date(listing.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-charcoal leading-snug">
                {listing.title}
              </h1>

              {/* Public Seller Profile (Name ONLY, zero sensitive leaks) */}
              <div className="flex items-center gap-2 pt-1 text-xs text-charcoal/80">
                <div className="w-6 h-6 rounded-full bg-sage-100 text-charcoal font-black flex items-center justify-center text-[10px] border border-sage">
                  {listing.seller?.name ? listing.seller.name.charAt(0) : 'S'}
                </div>
                <span>
                  Listed by <strong className="font-bold text-charcoal">{listing.seller?.name || 'Graduating Senior'}</strong>
                </span>
                <span className="text-sage">&bull;</span>
                <span className="text-charcoal font-semibold">Campus Verified</span>
              </div>
            </div>

            {/* Live Countdown Box */}
            <div className="p-4 rounded-2xl bg-warm-white border border-sage/60 shadow-2xs">
              <CountdownTimer targetDate={listing.closingTime} />
              <div className="mt-2 text-[11px] text-charcoal-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber shrink-0" />
                <span>Anti-sniping: Bids in the last 30s extend auction by 60s.</span>
              </div>
            </div>

            {/* Price & Bid Stats */}
            <div className="p-4 rounded-2xl bg-sage-50 border border-sage/50 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs uppercase font-black tracking-wider text-charcoal-muted block">
                    {listing.bidCount > 0 ? 'Current Leading Bid' : 'Starting Price'}
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-charcoal">
                    ₹{listing.currentPrice || listing.startingPrice}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-charcoal-muted block">Total Bids</span>
                  <span className="text-lg font-black text-amber-hover">
                    {listing.bidCount || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-charcoal/80 pt-2 border-t border-sage/40 font-semibold">
                <span>Min Increment: <strong>₹{listing.minIncrement}</strong></span>
                <span>Next Minimum: <strong>₹{minValidBid}</strong></span>
              </div>
            </div>

            {/* Post-Auction Lifecycle & Bidding Action Form */}
            {isClosed ? (
              <div className="space-y-4">
                {/* 1. Pending Seller Approval */}
                {listing.status === 'pending_approval' && (
                  <>
                    {isSeller ? (
                      <div className="p-5 rounded-2xl bg-amber/15 border-2 border-amber space-y-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber fill-amber shrink-0 animate-pulse" />
                          <h3 className="text-xs font-black text-forest uppercase tracking-wider">
                            Seller Decision Required
                          </h3>
                        </div>
                        <p className="text-xs text-charcoal leading-relaxed font-semibold">
                          Auction closed with a winning bid of{' '}
                          <strong className="text-forest font-black">
                            ₹{listing.finalPrice || listing.currentPrice}
                          </strong>{' '}
                          from{' '}
                          <strong className="text-forest font-bold">
                            {listing.winner?.name || listing.leadingBidder?.name || 'Winning Student'}
                          </strong>
                          . Approve to generate the campus handover code and open direct payment.
                        </p>

                        {decisionError && (
                          <p className="text-xs text-red-600 font-bold">{decisionError}</p>
                        )}

                        {showDeclineModal ? (
                          <div className="space-y-2 pt-2 border-t border-amber/40">
                            <label className="text-[11px] font-black uppercase text-charcoal block">
                              Reason for declining (optional):
                            </label>
                            <input
                              type="text"
                              value={declineReason}
                              onChange={(e) => setDeclineReason(e.target.value)}
                              placeholder="e.g. Expected a higher price"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-warm-white text-forest focus:outline-none"
                            />
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={handleRejectSale}
                                disabled={decisionLoading}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-warm-white text-xs font-black hover:bg-red-700 cursor-pointer"
                              >
                                {decisionLoading ? 'Declining...' : 'Confirm Decline'}
                              </button>
                              <button
                                onClick={() => setShowDeclineModal(false)}
                                className="px-3 py-2.5 rounded-xl bg-sage/20 text-forest text-xs font-bold hover:bg-sage/40 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <button
                              onClick={handleApproveSale}
                              disabled={decisionLoading}
                              className="flex-1 py-3 rounded-xl bg-forest hover:bg-forest-light text-warm-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                            >
                              <CheckCircle2 className="w-4 h-4 text-amber" />
                              <span>
                                {decisionLoading
                                  ? 'Approving...'
                                  : `Approve Sale (₹${listing.finalPrice || listing.currentPrice})`}
                              </span>
                            </button>
                            <button
                              onClick={() => setShowDeclineModal(true)}
                              disabled={decisionLoading}
                              className="py-3 px-4 rounded-xl border-2 border-charcoal/30 text-charcoal hover:bg-charcoal/10 text-xs font-bold cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ) : isWinner ? (
                      <div className="p-5 rounded-2xl bg-forest-50 border-2 border-forest/30 space-y-2 text-center">
                        <div className="w-10 h-10 rounded-full bg-forest text-amber flex items-center justify-center mx-auto shadow-xs">
                          <Sparkles className="w-5 h-5 fill-amber" />
                        </div>
                        <h3 className="text-base font-black text-forest">You Hold the Winning Bid!</h3>
                        <p className="text-xs text-charcoal/80 leading-relaxed max-w-sm mx-auto">
                          Your bid of <strong className="text-forest font-black">₹{listing.finalPrice || listing.currentPrice}</strong> was the highest when the auction closed. The seller has been notified to approve the price.
                        </p>
                        <div className="p-2.5 rounded-xl bg-warm-white border border-sage/60 text-xs font-bold text-forest mt-2">
                          ⏳ Awaiting seller confirmation (deal tracker unlocks upon approval)
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-charcoal/10 border border-charcoal/20 text-center space-y-1">
                        <span className="font-black text-charcoal block">Auction Closed</span>
                        <span className="text-xs text-charcoal-muted">
                          Winning bid of ₹{listing.finalPrice || listing.currentPrice} placed by {listing.winner?.name || 'Fellow Student'}. Awaiting seller confirmation.
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* 2. Approved Sale */}
                {listing.status === 'approved' && (
                  <div className="p-5 rounded-2xl bg-forest/10 border-2 border-forest space-y-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-forest text-warm-white flex items-center justify-center mx-auto shadow-xs">
                      <CheckCircle2 className="w-5 h-5 text-amber" />
                    </div>
                    <h3 className="text-base font-black text-forest">Sale Approved!</h3>
                    <p className="text-xs text-charcoal/80">
                      Final price of <strong className="text-forest font-black">₹{listing.finalPrice || listing.currentPrice}</strong> was confirmed by the senior.
                    </p>
                    {(isSeller || isWinner) && (
                      <Link
                        to={`/deals/${listing.dealId || id}`}
                        className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-forest hover:bg-forest-light text-warm-white font-black text-xs shadow-md shadow-forest/20 transition-all cursor-pointer"
                      >
                        <span>Open Deal Tracker (Payment & Handover)</span>
                        <ChevronRight className="w-4 h-4 text-amber" />
                      </Link>
                    )}
                  </div>
                )}

                {/* 3. Unsold Item */}
                {listing.status === 'unsold' && (
                  <div className="p-4 rounded-2xl bg-charcoal/10 border border-charcoal/20 text-center space-y-2">
                    <span className="font-black text-charcoal block">Auction Closed (Unsold)</span>
                    <span className="text-xs text-charcoal-muted block">
                      This item ended with no bids.
                    </span>
                    {isSeller && (
                      <Link
                        to="/needs-attention"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest text-warm-white text-xs font-bold hover:bg-forest-light"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber" />
                        <span>Relist from Needs Attention</span>
                      </Link>
                    )}
                  </div>
                )}

                {/* 4. Rejected Sale */}
                {listing.status === 'rejected' && (
                  <div className="p-4 rounded-2xl bg-charcoal/10 border border-charcoal/20 text-center space-y-2">
                    <span className="font-black text-charcoal block">Auction Closed (Sale Declined)</span>
                    <span className="text-xs text-charcoal-muted block">
                      The seller declined the final price for this item.
                    </span>
                    {isSeller && (
                      <Link
                        to="/needs-attention"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest text-warm-white text-xs font-bold hover:bg-forest-light"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber" />
                        <span>Adjust Price & Relist</span>
                      </Link>
                    )}
                  </div>
                )}

                {/* Generic Completed fallback */}
                {['completed', 'pickup_scheduled'].includes(listing.status) && (
                  <div className="p-4 rounded-2xl bg-forest-50 border border-forest/20 text-center space-y-2">
                    <span className="font-black text-forest block">Deal In Progress / Completed</span>
                    {(isSeller || isWinner) && (
                      <Link
                        to={`/deals/${listing.dealId || id}`}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-forest text-warm-white text-xs font-bold"
                      >
                        <span>View Deal Tracker</span>
                        <ChevronRight className="w-3.5 h-3.5 text-amber" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ) : isSeller ? (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-forest">
                  <Lock className="w-4 h-4 text-amber" />
                  <span>Seller Controls</span>
                </div>
                <p className="text-xs text-charcoal/80">
                  You are the seller of this auction. Campus rules prohibit bidding on your own item.
                </p>
                <div className="flex gap-2 pt-1">
                  <Link
                    to="/my-listings"
                    className="w-full py-2 rounded-xl bg-forest text-warm-white text-xs font-bold text-center hover:bg-forest-light"
                  >
                    Manage in My Listings
                  </Link>
                </div>
              </div>
            ) : user ? (
              <form onSubmit={handlePlaceBid} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-charcoal flex items-center justify-between">
                    <span>Enter Your Bid (₹)</span>
                    <span className="text-[11px] text-amber-hover font-bold">Min: ₹{minValidBid}</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-charcoal font-bold text-base">₹</span>
                    <input
                      type="number"
                      min={minValidBid}
                      step={listing.minIncrement || 10}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border-2 border-charcoal bg-warm-white text-charcoal text-lg font-black focus:outline-none focus:ring-2 focus:ring-charcoal/20"
                    />
                  </div>

                  {/* Quick-Increment Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setBidAmount(String(minValidBid))}
                      className="flex-1 py-1 px-2 text-xs font-bold rounded-lg border border-sage/60 bg-warm-white hover:bg-sage-100 text-charcoal transition-all cursor-pointer"
                    >
                      Min ₹{minValidBid}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBidAmount((prev) => String((Number(prev) || minValidBid) + (listing.minIncrement || 10)))}
                      className="flex-1 py-1 px-2 text-xs font-bold rounded-lg border border-sage/60 bg-warm-white hover:bg-sage-100 text-charcoal transition-all cursor-pointer"
                    >
                      +₹{listing.minIncrement || 10}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBidAmount((prev) => String((Number(prev) || minValidBid) + 2 * (listing.minIncrement || 10)))}
                      className="flex-1 py-1 px-2 text-xs font-bold rounded-lg border border-sage/60 bg-warm-white hover:bg-sage-100 text-charcoal transition-all cursor-pointer"
                    >
                      +₹{2 * (listing.minIncrement || 10)}
                    </button>
                  </div>
                </div>

                {bidError && (
                  <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {bidError}
                  </p>
                )}

                {bidSuccess && (
                  <p className="text-xs text-charcoal font-bold flex items-center gap-1 bg-sage-100 p-2 rounded-lg border border-sage">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sage-dark" />
                    {bidSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submittingBid}
                  className="w-full py-3.5 rounded-xl bg-charcoal hover:bg-charcoal-hover text-warm-white font-black text-sm shadow-md border border-charcoal transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Gavel className="w-4 h-4 text-amber" />
                  <span>{submittingBid ? 'Submitting Bid...' : `Place Bid for ₹${bidAmount || minValidBid}`}</span>
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-sage/20 border border-sage text-center space-y-2">
                <p className="text-xs font-bold text-forest">
                  Log in with your verified campus account to bid on this item.
                </p>
                <Link
                  to={`/login?redirect=/listings/${id}`}
                  className="inline-block w-full py-2.5 rounded-xl bg-forest hover:bg-forest-light text-warm-white font-black text-xs shadow-xs"
                >
                  Log In to Bid
                </Link>
              </div>
            )}
          </div>

          {/* Public Transparent Bid History Card */}
          <div className="bg-warm-white-paper rounded-3xl border-2 border-sage/60 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-sage/40 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-forest" />
                <h3 className="font-black text-forest text-sm">Public Bid History</h3>
              </div>
              <span className="text-xs font-bold text-charcoal-muted">
                {Array.isArray(listing.bids) ? `${listing.bids.length} recorded` : '0 recorded'}
              </span>
            </div>

            {Array.isArray(listing.bids) && listing.bids.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {listing.bids.map((b, idx) => (
                  <div
                    key={b._id || idx}
                    className={`p-3 rounded-xl flex items-center justify-between text-xs border ${
                      idx === 0
                        ? 'bg-amber-50 border-amber/50 font-black'
                        : 'bg-warm-white border-sage/30 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-amber text-forest' : 'bg-sage/20 text-forest'}`}>
                        #{idx + 1}
                      </span>
                      <span className="text-forest font-bold">
                        {b.bidder?.name || 'Verified Student'}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-forest text-warm-white font-bold">
                          Leading
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-black text-forest text-sm">₹{b.amount}</div>
                      <div className="text-[10px] text-charcoal-muted">
                        {new Date(b.bidTime || b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 space-y-1">
                <p className="text-xs font-bold text-forest">No bids placed yet</p>
                <p className="text-[11px] text-charcoal-muted">
                  First bid starts at ₹{listing.startingPrice}. Be the first to place a bid!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
