import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
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
  Search,
  Bell,
  Home,
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
    <header className="sticky top-0 z-50 bg-charcoal text-warm-white border-b-2 border-sage shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-sage text-charcoal border border-sage-light flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Gavel className="w-5 h-5 text-charcoal stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-warm-white group-hover:text-sage-light transition-colors">
                Campus Auction
              </span>
              <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-sage text-charcoal rounded-full shadow-2xs">
                Campus
              </span>
            </div>
            <p className="text-[10px] text-sage-light hidden xs:block -mt-0.5">
              Honest Senior Exit Marketplace
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links: Home | Live Auctions (icon) | AI Assistant | Needs Attention */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-warm-white/90">
          <Link
            to="/"
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              isActive('/')
                ? 'text-sage font-extrabold border-b-2 border-sage'
                : 'text-warm-white/90 hover:text-sage-light'
            }`}
          >
            <Home className="w-4 h-4 text-sage" />
            <span>Home</span>
          </Link>

          <Link
            to="/browse"
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              isActive('/browse') || isActive('/listings')
                ? 'text-sage font-extrabold border-b-2 border-sage'
                : 'text-warm-white/90 hover:text-sage-light'
            }`}
          >
            <Gavel className="w-4 h-4 text-sage" />
            <span>Live Auctions</span>
          </Link>

          {user && (
            <Link
              to="/my-listings"
              className={`transition-colors py-1 flex items-center gap-1.5 ${
                isActive('/my-listings')
                  ? 'text-sage font-extrabold border-b-2 border-sage'
                  : 'text-warm-white/90 hover:text-sage-light'
              }`}
            >
              <Tag className="w-4 h-4 text-sage" />
              <span>My Listings</span>
            </Link>
          )}

          <Link
            to="/sell"
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              isActive('/sell')
                ? 'text-sage font-extrabold border-b-2 border-sage'
                : 'text-warm-white/90 hover:text-sage-light'
            }`}
          >
            <Sparkles className="w-4 h-4 text-sage" />
            <span>AI Assistant</span>
          </Link>

          {user && (
            <Link
              to="/needs-attention"
              className={`transition-colors px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs ${
                isActive('/needs-attention')
                  ? 'bg-amber text-charcoal font-black shadow-xs'
                  : 'bg-amber/20 text-amber font-bold border border-amber/40 hover:bg-amber hover:text-charcoal'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Needs Attention</span>
            </Link>
          )}
        </nav>

        {/* Right Actions: Sell Item (button) | Notifications Bell | Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sell Item Button */}
          <Link
            to="/sell"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sage hover:bg-sage-dark text-charcoal text-sm font-black transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-charcoal stroke-[2.5]" />
            <span>Sell Item</span>
          </Link>

          {/* Module 9/10: Notifications Bell */}
          {user && <NotificationBell />}

          {/* User Profile or Guest Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all ${
                  isActive('/profile')
                    ? 'bg-sage text-charcoal border-sage font-black'
                    : 'bg-charcoal-700 border-sage/40 text-warm-white hover:border-sage'
                }`}
                title="Profile & Activity Dashboard"
              >
                <div className="w-7 h-7 rounded-full bg-sage text-charcoal flex items-center justify-center text-xs font-black shadow-xs shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline-block font-semibold text-xs truncate max-w-[100px]">
                  {user.name}
                </span>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-sage-light hover:text-amber hover:bg-forest-light rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-2 text-xs font-bold text-warm-white hover:text-amber transition-colors rounded-xl"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-2 text-xs font-black text-forest bg-amber hover:bg-amber-hover rounded-xl shadow-md transition-all active:scale-95"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-warm-white hover:text-amber hover:bg-forest-light transition-colors border border-sage/40 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-amber" /> : <Menu className="w-5 h-5 text-warm-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-sage/40 bg-charcoal px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-fadeIn text-warm-white">
          {/* Quick User Identity */}
          {user ? (
            <div className="p-3 rounded-xl bg-charcoal-700 border border-sage/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-sage text-charcoal flex items-center justify-center font-black text-sm">
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
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-sage text-charcoal text-xs font-black shadow-xs active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5 text-charcoal" />
                <span>Sell</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-sm font-bold text-warm-white border border-sage/40 rounded-xl hover:bg-charcoal-700 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-sm font-black text-charcoal bg-sage rounded-xl hover:bg-sage-dark shadow-xs transition-colors"
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
                  ? 'bg-sage text-charcoal font-black'
                  : 'text-warm-white hover:bg-charcoal-700 hover:text-sage-light'
              }`}
            >
              <Search className="w-4 h-4 text-sage" />
              <span>Search & Browse</span>
            </Link>

            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive('/')
                  ? 'bg-sage text-charcoal font-black'
                  : 'text-warm-white hover:bg-charcoal-700 hover:text-sage-light'
              }`}
            >
              <Gavel className="w-4 h-4 text-sage" />
              <span>Live Auctions</span>
            </Link>

            {user && (
              <>
                <Link
                  to="/sell"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive('/sell') || isActive('/create-listing')
                      ? 'bg-sage text-charcoal font-black'
                      : 'text-warm-white hover:bg-charcoal-700 hover:text-sage-light'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-sage" />
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

                <Link
                  to="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive('/notifications')
                      ? 'bg-amber text-forest font-black'
                      : 'text-warm-white hover:bg-forest-light hover:text-amber'
                  }`}
                >
                  <Bell className="w-4 h-4 text-amber" />
                  <span>Notifications Center</span>
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
