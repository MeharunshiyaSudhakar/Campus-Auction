import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GuidedSellPage from './pages/GuidedSellPage';
import MyListingsPage from './pages/MyListingsPage';
import ProfilePage from './pages/ProfilePage';
import NeedsAttentionPage from './pages/NeedsAttentionPage';
import BrowsePage from './pages/BrowsePage';
import AuctionDetailPage from './pages/AuctionDetailPage';
import DealTrackerPage from './pages/DealTrackerPage';
import NotificationsPage from './pages/NotificationsPage';

export default function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen flex flex-col bg-warm-white text-charcoal">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/listings" element={<BrowsePage />} />
              <Route path="/listings/:id" element={<AuctionDetailPage />} />
              <Route path="/auction/:id" element={<AuctionDetailPage />} />
              <Route path="/deals/:id" element={<DealTrackerPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/sell" element={<GuidedSellPage />} />
              <Route path="/create-listing" element={<GuidedSellPage />} />
              <Route path="/my-listings" element={<MyListingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/needs-attention" element={<NeedsAttentionPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
            </Routes>
          </main>
          <footer className="border-t border-sage/40 bg-warm-white-muted/60 py-6 px-4 text-center text-xs text-charcoal/70">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>Campus Auction &bull; Fair & Transparent Marketplace for Graduating Seniors & Juniors</span>
              <span className="text-forest font-semibold">MERN Stack &bull; Socket.io Anti-Sniping &bull; 100% Honest Disclosure</span>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
