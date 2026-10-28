import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gavel, PlusCircle, User, LogOut, Bell, Sparkles } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              Campus Auction
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              Verified Campus Only
            </span>
          </div>
        </Link>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-indigo-600 transition-colors">
            Live Auctions
          </Link>
          {user && (
            <>
              <Link to="/my-listings" className="hover:text-indigo-600 transition-colors">
                My Listings
              </Link>
              <Link to="/needs-attention" className="hover:text-amber-600 transition-colors text-amber-700 font-semibold">
                Needs Attention
              </Link>
              <Link to="/profile" className="hover:text-indigo-600 transition-colors font-medium">
                Dashboard
              </Link>
            </>
          )}
          <span className="text-slate-300">|</span>
          <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            100% Condition Disclosed
          </span>
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/sell"
                style={{ backgroundColor: 'var(--forest)' }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Sell Item</span>
              </Link>

              {/* Public User Tag */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm">
                <User className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-slate-800">{user.name}</span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-100 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
