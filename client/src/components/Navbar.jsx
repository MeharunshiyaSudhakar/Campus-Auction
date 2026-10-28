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
  ShieldCheck,
  Search
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
    <header className="sticky top-0 z-50 bg-forest text-warm-white border-b-2 border-amber/40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-forest-light text-amber border border-amber/30 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Gavel className="w-5 h-5 text-amber" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-warm-white group-hover:text-amber transition-colors">
                Campus Auction
              </span>
              <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber text-forest rounded-full shadow-2xs">
                Campus Only
              </span>
            </div>
            <p className="text-[10px] text-sage-light hidden xs:block -mt-0.5">
              Senior Exit Marketplace &bull; Fair Bidding
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-warm-white/90">
          <Link
            to="/browse"
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              isActive('/browse') || isActive('/listings')
                ? 'text-amber font-extrabold border-b-2 border-amber'
                : 'text-warm-white/90 hover:text-amber'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-amber" />
            <span>Search & Browse</span>
          </Link>
          <Link
            to="/"
            className={`transition-colors py-1 ${
              isActive('/')
                ? 'text-amber font-extrabold border-b-2 border-amber'
                : 'text-warm-white/90 hover:text-amber'
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
                    ? 'text-amber font-extrabold border-b-2 border-amber'
                    : 'text-warm-white/90 hover:text-amber'
                }`}
              >
                My Listings
              </Link>
              <Link
                to="/needs-attention"
                className={`transition-colors px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                  isActive('/needs-attention')
                    ? 'bg-amber text-forest font-black shadow-xs'
                    : 'bg-amber/20 text-amber font-bold border border-amber/40 hover:bg-amber hover:text-forest'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Needs Attention</span>
              </Link>
              <Link
                to="/profile"
                className={`transition-colors py-1 ${
                  isActive('/profile')
                    ? 'text-amber font-extrabold border-b-2 border-amber'
                    : 'text-warm-white/90 hover:text-amber'
                }`}
              >
                Dashboard
              </Link>
            </>
          )}
          <span className="text-sage/40">|</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-forest-light text-sage-light font-semibold border border-sage/40 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber" />
            100% Condition Disclosed
          </span>
        </nav>

        {/* Right Actions (Desktop & Tablet) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/sell"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber hover:bg-amber-hover text-forest text-sm font-black transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-forest stroke-[2.5]" />
                <span>Sell Item</span>
              </Link>

              {/* Public User Tag */}
              <div className="hidden xs:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-light border border-sage/30 text-warm-white text-sm">
                <div className="w-6 h-6 rounded-full bg-amber text-forest flex items-center justify-center text-xs font-black">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-warm-white truncate max-w-[120px]">
                  {user.name}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-sage-light hover:text-amber hover:bg-forest-light rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-bold text-warm-white hover:text-amber transition-colors rounded-xl"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-black text-forest bg-amber hover:bg-amber-hover rounded-xl shadow-md transition-all active:scale-95"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-warm-white hover:text-amber hover:bg-forest-light transition-colors border border-sage/40"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-amber" /> : <Menu className="w-5 h-5 text-warm-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-sage/30 bg-forest px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-fadeIn text-warm-white">
          {/* Quick User Identity */}
          {user ? (
            <div className="p-3 rounded-xl bg-forest-light border border-sage/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber text-forest flex items-center justify-center font-black text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-warm-white">{user.name}</div>
                  <div className="text-[11px] text-sage-light">Public Student Profile</div>
                </div>
              </div>
              <Link
                to="/sell"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-amber text-forest text-xs font-black shadow-xs active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Sell</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-sm font-bold text-warm-white border border-sage/40 rounded-xl hover:bg-forest-light transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-sm font-black text-forest bg-amber rounded-xl hover:bg-amber-hover shadow-xs transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Navigation Links List */}
          <div className="space-y-1">
            <Link
              to="/browse"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive('/browse') || isActive('/listings')
                  ? 'bg-amber text-forest font-black'
                  : 'text-warm-white hover:bg-forest-light hover:text-amber'
              }`}
            >
              <Search className="w-4 h-4 text-amber" />
              <span>Search & Browse</span>
            </Link>

            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive('/')
                  ? 'bg-amber text-forest font-black'
                  : 'text-warm-white hover:bg-forest-light hover:text-amber'
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive('/sell') || isActive('/create-listing')
                      ? 'bg-amber text-forest font-black'
                      : 'text-warm-white hover:bg-forest-light hover:text-amber'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-amber" />
                  <span>Sell an Item (Guided Flow)</span>
                </Link>

                <Link
                  to="/my-listings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive('/my-listings')
                      ? 'bg-amber text-forest font-black'
                      : 'text-warm-white hover:bg-forest-light hover:text-amber'
                  }`}
                >
                  <Tag className="w-4 h-4 text-sage-light" />
                  <span>My Listings</span>
                </Link>

                <Link
                  to="/needs-attention"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive('/needs-attention')
                      ? 'bg-amber text-forest font-black'
                      : 'text-amber hover:bg-forest-light'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber" />
                  <span>Needs Attention (Alerts)</span>
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive('/profile')
                      ? 'bg-amber text-forest font-black'
                      : 'text-warm-white hover:bg-forest-light hover:text-amber'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-sage-light" />
                  <span>Dashboard & Activity</span>
                </Link>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-sage/30 flex items-center justify-between text-xs text-sage-light">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber animate-pulse"></span>
              100% Condition Disclosed
            </span>
            {user && (
              <button
                onClick={handleLogout}
                className="text-amber-light font-bold hover:underline flex items-center gap-1"
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
