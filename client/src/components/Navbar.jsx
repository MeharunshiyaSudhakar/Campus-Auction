import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Gavel,
  PlusCircle,
  User,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Tag,
  AlertTriangle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-warm-white/95 backdrop-blur-md border-b border-sage/40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-forest text-warm-white flex items-center justify-center shadow-md shadow-forest/20 group-hover:scale-105 transition-transform">
            <Gavel className="w-5 h-5 text-amber" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-forest group-hover:text-forest-light transition-colors">
                Campus Auction
              </span>
              <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 bg-forest-50 text-forest rounded-full border border-forest/20">
                Verified Campus
              </span>
            </div>
            <p className="text-[10px] text-charcoal-muted hidden xs:block -mt-0.5">
              Senior Exit Sales &bull; Fair Bidding
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-charcoal">
          <Link
            to="/"
            className={`transition-colors py-1 ${
              isActive('/')
                ? 'text-forest font-bold border-b-2 border-forest'
                : 'text-charcoal hover:text-forest'
            }`}
          >
            Live Auctions
          </Link>
          {user && (
            <>
              <Link
                to="/my-listings"
                className={`transition-colors py-1 ${
                  isActive('/my-listings')
                    ? 'text-forest font-bold border-b-2 border-forest'
                    : 'text-charcoal hover:text-forest'
                }`}
              >
                My Listings
              </Link>
              <Link
                to="/needs-attention"
                className={`transition-colors py-1 flex items-center gap-1.5 ${
                  isActive('/needs-attention')
                    ? 'text-amber-hover font-bold border-b-2 border-amber'
                    : 'text-amber-hover font-semibold hover:text-amber'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber" />
                <span>Needs Attention</span>
              </Link>
              <Link
                to="/profile"
                className={`transition-colors py-1 ${
                  isActive('/profile')
                    ? 'text-forest font-bold border-b-2 border-forest'
                    : 'text-charcoal hover:text-forest'
                }`}
              >
                Dashboard
              </Link>
            </>
          )}
          <span className="text-sage/60">|</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-sage-50 text-forest font-semibold border border-sage/50 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-forest" />
            100% Condition Disclosed
          </span>
        </nav>

        {/* Right Actions (Desktop & Tablet) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/sell"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest hover:bg-forest-hover text-white text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-amber" />
                <span>Sell Item</span>
              </Link>

              {/* Public User Tag */}
              <div className="hidden xs:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sage-50 border border-sage/50 text-forest text-sm">
                <div className="w-5 h-5 rounded-full bg-forest text-warm-white flex items-center justify-center text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-charcoal truncate max-w-[120px]">
                  {user.name}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-charcoal-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-charcoal hover:text-forest transition-colors rounded-xl"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold text-white bg-forest hover:bg-forest-hover rounded-xl shadow-sm transition-all"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-charcoal hover:text-forest hover:bg-sage-50 transition-colors border border-sage/40"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-sage/40 bg-warm-white px-4 pt-3 pb-6 space-y-3 shadow-lg animate-fadeIn">
          {/* Quick User Identity */}
          {user ? (
            <div className="p-3 rounded-xl bg-sage-50 border border-sage/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-forest text-warm-white flex items-center justify-center font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-forest">{user.name}</div>
                  <div className="text-[11px] text-charcoal-muted">Public Student Profile</div>
                </div>
              </div>
              <Link
                to="/sell"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-forest text-warm-white text-xs font-semibold shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber" />
                <span>Sell</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-sm font-semibold text-charcoal border border-sage/60 rounded-xl hover:bg-sage-50 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-sm font-semibold text-white bg-forest rounded-xl hover:bg-forest-hover shadow-xs transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Navigation Links List */}
          <div className="space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-forest text-warm-white font-bold'
                  : 'text-charcoal hover:bg-sage-50'
              }`}
            >
              <Gavel className="w-4 h-4 text-amber" />
              <span>Live Auctions</span>
            </Link>

            {user && (
              <>
                <Link
                  to="/sell"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/sell') || isActive('/create-listing')
                      ? 'bg-forest text-warm-white font-bold'
                      : 'text-charcoal hover:bg-sage-50'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-amber" />
                  <span>Sell an Item (Guided Flow)</span>
                </Link>

                <Link
                  to="/my-listings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/my-listings')
                      ? 'bg-forest text-warm-white font-bold'
                      : 'text-charcoal hover:bg-sage-50'
                  }`}
                >
                  <Tag className="w-4 h-4 text-forest" />
                  <span>My Listings</span>
                </Link>

                <Link
                  to="/needs-attention"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/needs-attention')
                      ? 'bg-amber text-charcoal font-bold'
                      : 'text-amber-hover font-semibold hover:bg-amber-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber" />
                  <span>Needs Attention (Alerts)</span>
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/profile')
                      ? 'bg-forest text-warm-white font-bold'
                      : 'text-charcoal hover:bg-sage-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-forest" />
                  <span>Dashboard & Activity</span>
                </Link>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-sage/40 flex items-center justify-between text-xs text-charcoal-muted">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-forest animate-pulse"></span>
              100% Structured Disclosure
            </span>
            {user && (
              <button
                onClick={handleLogout}
                className="text-rose-600 font-semibold hover:underline flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
