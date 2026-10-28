import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCw,
  Clock,
  Tag,
  TrendingDown,
  XCircle,
  CheckCircle2,
  DollarSign,
  X,
  AlertCircle
} from 'lucide-react';

export default function NeedsAttentionPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Relist Modal State
  const [relistingItem, setRelistingItem] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [newClosingHours, setNewClosingHours] = useState('48');
  const [relisting, setRelisting] = useState(false);

  // Edit / Quick Price Update Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const navigate = useNavigate();

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/listings/needs-attention');
      if (res.data?.success) {
        setItems(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch items needing attention');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openRelistModal = (item) => {
    setRelistingItem(item);
    // Suggest a 10-15% reduced price for quick sale
    const discounted = Math.max(1, Math.round(item.startingPrice * 0.85));
    setNewPrice(discounted.toString());
  };

  const handleConfirmRelist = async (e) => {
    e.preventDefault();
    if (!relistingItem) return;
    setRelisting(true);

    try {
      const closeTime = new Date(Date.now() + Number(newClosingHours) * 60 * 60 * 1000).toISOString();
      const res = await api.post(`/listings/relist/${relistingItem._id}`, {
        startingPrice: Number(newPrice),
        closingTime: closeTime,
      });

      if (res.data?.success) {
        alert(`"${relistingItem.title}" has been successfully relisted as a new auction!`);
        setRelistingItem(null);
        fetchItems();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to relist item');
    } finally {
      setRelisting(false);
    }
  };

  const handleCancelListing = async (itemId) => {
    if (!window.confirm('Are you sure you want to cancel this listing?')) return;

    try {
      await api.delete(`/listings/${itemId}`, { data: { reason: 'Cancelled from Needs Attention' } });
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel listing');
    }
  };

  const handleQuickPriceUpdate = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);

    try {
      await api.put(`/listings/${editingItem._id}`, {
        startingPrice: Number(editPrice),
      });
      setEditingItem(null);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update price');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8 bg-warm-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
              Items Needing Attention
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-hover border border-amber/30">
              {items.length} Active Alerts
            </span>
          </div>
          <p className="text-sm text-charcoal/75 mt-1">
            Active listings with zero bids after 3+ days, closed unsold auctions, or rejected bids. Take quick action to find a buyer!
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-charcoal-muted flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Checking listing status...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 sm:p-14 rounded-2xl border-2 border-dashed border-sage bg-warm-white-paper text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-charcoal text-warm-white flex items-center justify-center mx-auto border border-charcoal shadow-xs">
            <CheckCircle2 className="w-7 h-7 text-amber" />
          </div>
          <h3 className="text-lg font-bold text-charcoal">All Clear! No Items Need Attention</h3>
          <p className="text-sm text-charcoal/70 max-w-md mx-auto">
            None of your items are currently stale or closed unsold. All active auctions are performing well.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="p-5 sm:p-6 rounded-2xl bg-warm-white-paper border-2 border-sage/60 shadow-xs hover:border-charcoal transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      item.reasonKey === 'no_bids_stale'
                        ? 'bg-amber-50 text-amber-hover border-amber/30'
                        : 'bg-warm-white-muted text-charcoal-muted border-sage/40'
                    }`}
                  >
                    {item.reasonKey.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-charcoal-muted">
                    Listed on {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-charcoal">{item.title}</h3>
                <p className="text-xs sm:text-sm text-charcoal/80">{item.reasonText}</p>

                <div className="text-xs sm:text-sm text-charcoal flex items-center gap-3 pt-1">
                  <span>
                    <strong>Starting Price:</strong> <span className="font-mono font-bold text-charcoal">₹{item.startingPrice}</span>
                  </span>
                  <span className="text-sage">|</span>
                  <span>
                    <strong>Bids:</strong> <span className="font-bold">{item.bidCount}</span>
                  </span>
                </div>
              </div>

              {/* Quick Actions (Responsive stack on mobile, horizontal on tablet/PC) */}
              <div className="flex items-center gap-2 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-sage/30">
                {item.status === 'active' && (
                  <>
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setEditPrice(item.startingPrice.toString());
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-sage/60 hover:bg-sage-100 text-charcoal text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <TrendingDown className="w-3.5 h-3.5 text-charcoal" />
                      <span>Lower Price</span>
                    </button>
                    <button
                      onClick={() => handleCancelListing(item._id)}
                      className="px-4 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </>
                )}

                {item.status !== 'active' && (
                  <button
                    onClick={() => openRelistModal(item)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-charcoal hover:bg-charcoal-hover text-warm-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-charcoal cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber" />
                    <span>Relist as New Auction</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RELIST MODAL (Centered & responsive for mobile/tablet) */}
      {relistingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-warm-white-paper rounded-2xl border border-sage/50 p-6 max-w-md w-full shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-forest">Relist Item as New Auction</h3>
              <button
                onClick={() => setRelistingItem(null)}
                className="p-1 rounded-lg hover:bg-sage-50 text-charcoal-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-charcoal/75 leading-relaxed">
              Relisting creates a fresh auction prefilled with your photos and verified condition details from <strong>{relistingItem.title}</strong>.
            </p>

            <form onSubmit={handleConfirmRelist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1">
                  New Starting Price (₹):
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-forest text-sm bg-warm-white font-mono"
                />
                <span className="text-[11px] text-forest font-medium mt-1 block">
                  Suggested discount applied for faster bidding.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1">
                  New Auction Duration (Hours):
                </label>
                <select
                  value={newClosingHours}
                  onChange={(e) => setNewClosingHours(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-forest text-sm bg-warm-white"
                >
                  <option value="24">24 Hours (Quick Campus Sale)</option>
                  <option value="48">48 Hours (Standard 2 Days)</option>
                  <option value="72">72 Hours (3 Days)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRelistingItem(null)}
                  className="px-4 py-2 rounded-xl border border-sage/60 hover:bg-sage-50 text-charcoal text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={relisting}
                  className="px-5 py-2 rounded-xl bg-forest hover:bg-forest-hover disabled:bg-forest/50 text-white text-xs font-bold shadow-xs"
                >
                  {relisting ? 'Publishing...' : 'Publish Relisted Auction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PRICE UPDATE MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-warm-white-paper rounded-2xl border border-sage/50 p-6 max-w-sm w-full shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-forest">Adjust Starting Price</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg hover:bg-sage-50 text-charcoal-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-charcoal/75 leading-relaxed">
              Lowering the starting price attracts interested juniors browsing for deals.
            </p>

            <form onSubmit={handleQuickPriceUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1">
                  New Starting Price (₹):
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-forest text-sm bg-warm-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border border-sage/60 hover:bg-sage-50 text-charcoal text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-forest hover:bg-forest-hover disabled:bg-forest/50 text-white text-xs font-bold shadow-xs"
                >
                  {savingEdit ? 'Saving...' : 'Update Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
