import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Gavel,
  ShieldCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Compass,
  ShieldAlert,
  Award,
  PlusCircle,
  Search,
  Package,
} from 'lucide-react';
import api from '../api/client';
import ListingCard from '../components/ListingCard';

export default function HomePage() {
  const { user } = useAuth();
  const [serverStatus, setServerStatus] = useState('checking');
  const [featuredListings, setFeaturedListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    api.get('/health')
      .then(() => setServerStatus('connected'))
      .catch(() => setServerStatus('disconnected'));
  }, []);

  useEffect(() => {
    setLoadingListings(true);
    const params = { limit: 6 };
    if (selectedCategory !== 'all') {
      params.category = selectedCategory;
    }

    api.get('/listings', { params })
      .then((res) => {
        const data = res.data?.data;
        if (data?.listings) {
          setFeaturedListings(data.listings);
        } else if (Array.isArray(data)) {
          setFeaturedListings(data);
        } else {
          setFeaturedListings([]);
        }
        setLoadingListings(false);
      })
      .catch((err) => {
        console.error('Failed to load featured listings:', err);
        setLoadingListings(false);
      });
  }, [selectedCategory]);

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-warm-white via-warm-white to-warm-white-muted border-b-2 border-sage/40 py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-hover border border-amber/40 text-xs font-black uppercase tracking-wider shadow-xs">
            <Sparkles className="w-4 h-4 text-amber" />
            Senior Exit &bull; Fair Campus Auctions &bull; MERN + Socket.io
          </div>

          <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-black text-forest tracking-tight leading-tight">
            Fair Campus Auctions with <br className="hidden sm:inline" />
            <span className="text-amber underline decoration-amber/50 underline-offset-8">
              100% Honest Condition Disclosure
            </span>
          </h1>

          <p className="text-base sm:text-lg text-charcoal/80 max-w-2xl mx-auto leading-relaxed">
            Graduating seniors leave campus gear behind. Juniors get honest, reliable deals. 
            No WhatsApp spam, no hidden defects—every cycle, calculator, and book comes with verified condition specs and live anti-sniping bidding.
          </p>

          <div className="flex flex-col xs:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
            <Link
              to="/browse"
              className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-charcoal hover:bg-charcoal-hover text-warm-white font-black shadow-md shadow-charcoal/20 transition-all text-sm active:scale-95 cursor-pointer border border-charcoal"
            >
              <Search className="w-4 h-4 text-amber" />
              <span>Search & Browse Auctions</span>
            </Link>

            {user ? (
              <Link
                to="/sell"
                className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-sage hover:bg-sage-dark text-charcoal font-black text-sm shadow-md shadow-sage/30 border border-sage-dark/30 transition-all active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-charcoal" />
                <span>Sell an Item</span>
              </Link>
            ) : (
              <Link
                to="/register"
                className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-sage hover:bg-sage-dark text-charcoal font-black shadow-md shadow-sage/30 border border-sage-dark/30 transition-all text-sm active:scale-95 cursor-pointer"
              >
                <span>Join Campus Auction</span>
                <ArrowRight className="w-4 h-4 text-charcoal" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Core Principles Cards (Prominently displaying Charcoal, Sage Green, Half White, Amber) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-block px-3.5 py-1 rounded-full bg-sage-100 text-charcoal text-xs font-bold uppercase tracking-wider border border-sage">
            Fair & Transparent Marketplace
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal">
            Why Campus Auction is Built Different
          </h2>
          <p className="text-sm text-charcoal-muted">
            Engineered for fair student pricing, zero hidden surprises, and safe peer-to-peer handovers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: SAGE THEME (Structured Condition) */}
          <div className="p-6 bg-warm-white-paper rounded-2xl border-2 border-sage shadow-xs hover:border-charcoal transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-charcoal text-warm-white flex items-center justify-center font-bold shadow-xs">
                <ShieldCheck className="w-6 h-6 text-sage" />
              </div>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-sage-100 text-charcoal border border-sage">
                Condition Specs
              </span>
            </div>
            <h3 className="text-lg font-bold text-charcoal">Mandatory Condition Form</h3>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              No generic "like new" blurbs. Seniors disclose tyre tread, calculator display status, marked pages, battery life, and known defects.
            </p>
          </div>

          {/* Card 2: AMBER THEME (Anti-Sniping Clock) */}
          <div className="p-6 bg-amber-50/70 rounded-2xl border-2 border-amber/60 shadow-xs hover:border-amber transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-charcoal text-amber flex items-center justify-center font-black shadow-xs">
                <Clock className="w-6 h-6 text-amber" />
              </div>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber text-charcoal shadow-2xs">
                Anti-Sniping
              </span>
            </div>
            <h3 className="text-lg font-bold text-charcoal">Anti-Sniping Clock</h3>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              Bids in the last 30 seconds automatically extend the auction clock by 60 seconds. Everyone gets a fair chance to place their best bid.
            </p>
          </div>

          {/* Card 3: CHARCOAL & SAGE THEME (Safe Handover) */}
          <div className="p-6 bg-sage-50 rounded-2xl border-2 border-sage shadow-xs hover:border-charcoal transition-all space-y-3 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-charcoal text-warm-white flex items-center justify-center font-bold shadow-xs">
                <Gavel className="w-6 h-6 text-amber" />
              </div>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-charcoal text-warm-white border border-charcoal">
                Handover Code
              </span>
            </div>
            <h3 className="text-lg font-bold text-charcoal">Safe Handover Code</h3>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              Winning bids must be approved by the seller. A unique 6-digit campus handover code completes the sale in person upon item inspection.
            </p>
          </div>
        </div>
      </section>

      {/* Live Campus Auctions Showcase Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-forest text-xs font-black uppercase tracking-wider border border-amber/40 mb-2">
              <Clock className="w-3.5 h-3.5 text-amber" />
              Active Campus Listings
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-forest">
              Live Senior Exit Auctions
            </h2>
            <p className="text-xs sm:text-sm text-charcoal/80">
              Browse real campus items with disclosed condition grades and live anti-sniping timers.
            </p>
          </div>

          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-forest hover:text-amber-hover transition-colors group self-start sm:self-auto"
          >
            <span>Explore All Auctions</span>
            <ArrowRight className="w-4 h-4 text-amber group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Quick Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All Items', icon: '🏷️' },
            { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
            { id: 'stationery', label: 'Stationery', icon: '✏️' },
            { id: 'books', label: 'Books', icon: '📚' },
            { id: 'electronics', label: 'Electronics', icon: '💻' },
            { id: 'furniture', label: 'Furniture', icon: '🪑' },
            { id: 'clothing', label: 'Clothing', icon: '👕' },
            { id: 'sports', label: 'Sports', icon: '⚽' },
            { id: 'other', label: 'Other', icon: '📦' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                selectedCategory === cat.id
                  ? 'bg-charcoal text-warm-white border-charcoal shadow-xs font-black'
                  : 'bg-warm-white-paper text-charcoal hover:bg-sage-100 border-sage/60 font-semibold'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Listings Grid */}
        {loadingListings ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border-2 border-sage/40 bg-warm-white-paper p-4 space-y-4 animate-pulse"
              >
                <div className="aspect-4/3 rounded-xl bg-sage/20 w-full" />
                <div className="h-4 bg-sage/20 rounded w-3/4" />
                <div className="h-3 bg-sage/15 rounded w-1/2" />
                <div className="h-8 bg-sage/20 rounded w-full mt-4" />
              </div>
            ))}
          </div>
        ) : featuredListings.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-warm-white-paper border-2 border-dashed border-sage/80 space-y-3">
            <Package className="w-8 h-8 text-charcoal mx-auto opacity-60" />
            <p className="text-sm font-bold text-charcoal">No active listings in this category yet.</p>
            <Link
              to="/sell"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sage hover:bg-sage-dark text-charcoal font-black text-xs shadow-xs border border-sage-dark/30"
            >
              <PlusCircle className="w-3.5 h-3.5 text-charcoal" />
              <span>Be the first senior to list an item</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredListings.map((item) => (
              <ListingCard key={item._id} listing={item} />
            ))}
          </div>
        )}
      </section>

      {/* Backend & Database Status Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 rounded-2xl bg-charcoal text-warm-white border-2 border-sage flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <span
              className={`w-3 h-3 rounded-full ${
                serverStatus === 'connected'
                  ? 'bg-amber animate-pulse shadow-sm shadow-amber'
                  : serverStatus === 'checking'
                  ? 'bg-amber-light'
                  : 'bg-rose-400'
              }`}
            />
            <span className="font-black text-warm-white">
              Backend Status: {serverStatus.toUpperCase()}
            </span>
            <span className="text-sage hidden xs:inline">|</span>
            <span className="text-sage-light font-mono text-[11px]">
              MongoDB Compass: 127.0.0.1:27017/campus_auction
            </span>
          </div>

          <div className="text-amber font-bold text-center sm:text-right flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber"></span>
            Search & Filters &bull; 100% Condition Badges &bull; Anti-Sniping &bull; Active
          </div>
        </div>
      </section>
    </div>
  );
}
