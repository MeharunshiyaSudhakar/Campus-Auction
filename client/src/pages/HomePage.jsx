import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gavel, ShieldCheck, Clock, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
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
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 border-b border-slate-200 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Hackathon Edition &bull; MERN + Socket.io
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Fair Campus Auctions with <br className="hidden sm:inline" />
            <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">
              100% Honest Condition Disclosure
            </span>
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Graduating seniors leave campus gear behind. Juniors get fair deals. 
            No WhatsApp spam, no hidden defects—every cycle, calculator, and book comes with verified specs and public bid history.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {user ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Logged in as <span className="underline">{user.name}</span>
              </div>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-100 transition-all hover:translate-y-[-1px]"
                >
                  <span>Join Campus Auction</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-medium border border-slate-300 transition-colors shadow-sm"
                >
                  Log In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Core Principles Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold text-slate-900 text-center mb-8">
          Why Campus Auction is Built Different
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Mandatory Condition Form</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              No generic "like new" blurbs. Sellers must state tyre condition, calculator screen contrast, marked pages, and battery wear.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Anti-Sniping Clock</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Bids in the last 30 seconds automatically extend the auction clock by 60 seconds. Everyone gets a fair chance to place their best bid.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Gavel className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Safe Handover Code</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Winning bids must be approved by the seller. A unique 6-digit campus handover code completes the sale in person.
            </p>
          </div>
        </div>
      </section>

      {/* Backend & Database Status Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 rounded-xl bg-slate-900 text-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                serverStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : serverStatus === 'checking'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-semibold text-slate-100">
              Backend Status: {serverStatus.toUpperCase()}
            </span>
            <span className="text-slate-400">| MongoDB Compass: `mongodb://localhost:27017/campus_auction`</span>
          </div>

          <div className="text-slate-400">
            Task 1: System Scaffolding & Auth Module Active
          </div>
        </div>
      </section>
    </div>
  );
}
