import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gavel, ShieldCheck, Clock, Sparkles, CheckCircle2, ArrowRight, Compass, ShieldAlert, Award } from 'lucide-react';
import api from '../api/client';

export default function HomePage() {
  const { user } = useAuth();
  const [serverStatus, setServerStatus] = useState('checking');

  useEffect(() => {
    api.get('/health')
      .then(() => setServerStatus('connected'))
      .catch(() => setServerStatus('disconnected'));
  }, []);

  return (
    <div className="space-y-10 sm:space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-forest-50/80 via-warm-white to-warm-white border-b border-sage/40 py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-50 text-forest text-xs font-bold uppercase tracking-wider border border-forest/20 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber" />
            Hackathon Edition &bull; MERN + Socket.io Live
          </div>

          <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-extrabold text-forest tracking-tight leading-tight">
            Fair Campus Auctions with <br className="hidden sm:inline" />
            <span className="text-amber underline decoration-amber/40 underline-offset-8">
              100% Honest Condition Disclosure
            </span>
          </h1>

          <p className="text-base sm:text-lg text-charcoal/80 max-w-2xl mx-auto leading-relaxed">
            Graduating seniors leave campus gear behind. Juniors get honest, reliable deals. 
            No WhatsApp spam, no hidden defects—every cycle, calculator, and book comes with verified condition specs and live anti-sniping bidding.
          </p>

          <div className="flex flex-col xs:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
            {user ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sage-50 text-forest font-semibold border border-sage/60 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-forest" />
                  Logged in as <span className="underline font-bold">{user.name}</span>
                </div>
                <Link
                  to="/sell"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-forest hover:bg-forest-hover text-warm-white font-semibold text-sm shadow-md shadow-forest/20 transition-all active:scale-95"
                >
                  <span>Sell an Item</span>
                  <ArrowRight className="w-4 h-4 text-amber" />
                </Link>
              </div>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-forest hover:bg-forest-hover text-white font-semibold shadow-md shadow-forest/20 transition-all hover:translate-y-[-1px] text-sm"
                >
                  <span>Join Campus Auction</span>
                  <ArrowRight className="w-4 h-4 text-amber" />
                </Link>
                <Link
                  to="/login"
                  className="w-full xs:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-warm-white hover:bg-sage-50 text-charcoal font-semibold border border-sage/60 transition-colors shadow-xs text-sm"
                >
                  Log In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Core Principles Cards (Responsive Grid: 1 col mobile, 2 col tablet, 3 col desktop) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest">
            Why Campus Auction is Built Different
          </h2>
          <p className="text-sm text-charcoal-muted">
            Engineered for fair pricing, student safety, and complete transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-warm-white rounded-2xl border border-sage/50 shadow-xs hover:border-forest/40 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest flex items-center justify-center font-bold border border-forest/20">
              <ShieldCheck className="w-6 h-6 text-forest" />
            </div>
            <h3 className="text-lg font-bold text-forest">Mandatory Condition Form</h3>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              No generic "like new" blurbs. Sellers must disclose tyre wear, calculator screen contrast, marked pages, battery life, and defects.
            </p>
          </div>

          <div className="p-6 bg-warm-white rounded-2xl border border-sage/50 shadow-xs hover:border-amber/40 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber flex items-center justify-center font-bold border border-amber/20">
              <Clock className="w-6 h-6 text-amber" />
            </div>
            <h3 className="text-lg font-bold text-forest">Anti-Sniping Engine</h3>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              Bids in the last 30 seconds automatically extend the auction clock by 60 seconds. Everyone gets a fair chance to place their best bid.
            </p>
          </div>

          <div className="p-6 bg-warm-white rounded-2xl border border-sage/50 shadow-xs hover:border-forest/40 transition-colors space-y-3 sm:col-span-2 lg:col-span-1">
            <div className="w-12 h-12 rounded-xl bg-sage-50 text-forest flex items-center justify-center font-bold border border-sage/60">
              <Gavel className="w-6 h-6 text-forest" />
            </div>
            <h3 className="text-lg font-bold text-forest">Safe Handover Code</h3>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              Winning bids must be approved by the seller. A unique 6-digit campus handover code completes the sale in person upon item inspection.
            </p>
          </div>
        </div>
      </section>

      {/* Backend & Database Status Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 rounded-2xl bg-forest text-warm-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                serverStatus === 'connected'
                  ? 'bg-amber animate-pulse'
                  : serverStatus === 'checking'
                  ? 'bg-amber-light'
                  : 'bg-rose-400'
              }`}
            />
            <span className="font-bold text-warm-white">
              Backend Status: {serverStatus.toUpperCase()}
            </span>
            <span className="text-sage-light hidden xs:inline">|</span>
            <span className="text-sage-light font-mono text-[11px]">
              MongoDB Compass: 127.0.0.1:27017/campus_auction
            </span>
          </div>

          <div className="text-warm-white/80 font-medium text-center sm:text-right">
            Active: Auth &bull; AI-Guided Sell &bull; History &bull; Unsold Alerts
          </div>
        </div>
      </section>
    </div>
  );
}
