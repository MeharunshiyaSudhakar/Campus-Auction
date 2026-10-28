import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  Gavel,
  PlusCircle,
  Clock,
  Tag,
  AlertCircle,
  Lock,
  Edit3,
  XCircle,
  Eye,
  CheckCircle2,
  Calendar,
  AlertTriangle
} from 'lucide-react';

export default function MyListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit Modal State
  const [editingListing, setEditingListing] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    startingPrice: '',
    minIncrement: '',
    conditionDefects: '',
  });
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Cancellation Modal State
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/listings/my');
      if (res.data && res.data.success) {
        setListings(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, []);

  const openEditModal = (item) => {
    setEditingListing(item);
    setEditForm({
      title: item.title,
      description: item.description,
      startingPrice: item.startingPrice,
      minIncrement: item.minIncrement,
      conditionDefects: item.condition?.defects || '',
    });
    setEditError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    setSavingEdit(true);

    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        condition: {
          ...editingListing.condition,
          defects: editForm.conditionDefects,
        },
      };

      // Only send starting price if no bids exist (enforcing price lock)
      if (editingListing.bidCount === 0) {
        payload.startingPrice = Number(editForm.startingPrice);
        payload.minIncrement = Number(editForm.minIncrement);
      }

      const res = await api.put(`/listings/${editingListing._id}`, payload);
      if (res.data && res.data.success) {
        setEditingListing(null);
        fetchMyListings();
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update listing');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelListing = async () => {
    if (!cancellingId) return;
    setCancelling(true);
    try {
      await api.delete(`/listings/${cancellingId}`, {
        data: { reason: cancelReason || 'Cancelled by seller' },
      });
      setCancellingId(null);
      setCancelReason('');
      fetchMyListings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel listing');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-forest-50 text-forest border-forest/20',
      closed: 'bg-warm-white-muted text-charcoal-muted border-sage/40',
      pending_approval: 'bg-amber-50 text-amber-hover border-amber/30',
      approved: 'bg-forest-50 text-forest border-forest/30',
      completed: 'bg-sage-50 text-forest border-sage/60',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
      unsold: 'bg-warm-white-muted text-charcoal-muted border-sage/40',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || styles.active}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8 bg-warm-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage/40 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
            My Auction Listings
          </h1>
          <p className="text-sm text-charcoal/75 mt-1">
            Manage your campus listings, review bids, and monitor closing times.
          </p>
        </div>
        <Link
          to="/sell"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-forest hover:bg-forest-hover text-white rounded-xl text-sm font-bold shadow-xs transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4 text-amber" />
          <span>Sell Another Item</span>
        </Link>
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
          <span className="text-sm">Loading your listings...</span>
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-warm-white-paper rounded-2xl border border-sage/50 p-8 sm:p-14 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-forest-50 text-forest border border-forest/20 flex items-center justify-center mx-auto">
            <Gavel className="w-8 h-8 text-amber" />
          </div>
          <h3 className="text-lg font-bold text-forest">No Listings Created Yet</h3>
          <p className="text-sm text-charcoal/70 max-w-sm mx-auto">
            Have a cycle, scientific calculator, or textbooks you no longer need? List them now for juniors!
          </p>
          <Link
            to="/sell"
            className="inline-flex items-center gap-2 px-6 py-3 bg-forest hover:bg-forest-hover text-white rounded-xl text-sm font-bold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 text-amber" />
            <span>Create First Listing</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => (
            <div
              key={item._id}
              className="bg-warm-white-paper rounded-2xl border border-sage/50 overflow-hidden shadow-xs hover:border-forest/40 hover:shadow-sm transition-all flex flex-col"
            >
              {/* Photo & Status Overlay */}
              <div className="relative aspect-video bg-warm-white-muted">
                <img
                  src={item.photos[0]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  {getStatusBadge(item.status)}
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-forest/90 backdrop-blur-xs text-warm-white text-xs font-bold uppercase tracking-wider">
                  {item.category}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-sage-50 text-forest border border-sage/50">
                      Condition: {item.condition?.grade}
                    </span>
                    <span className="text-xs text-charcoal-muted">
                      Age: {item.condition?.age}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-forest line-clamp-1" title={item.title}>
                    {item.title}
                  </h3>
                  <p className="text-xs text-charcoal/70 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* Price and Bids Stats */}
                <div className="p-3.5 rounded-xl bg-warm-white border border-sage/40 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-charcoal-muted">Current / Starting:</span>
                    <span className="font-mono font-extrabold text-forest text-sm">₹{item.currentPrice}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-charcoal-muted">Total Bids:</span>
                    <span className="font-bold text-amber-hover">
                      {item.bidCount} {item.bidCount === 1 ? 'bid' : 'bids'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-charcoal-muted pt-1 border-t border-sage/30">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-forest" /> Closes:
                    </span>
                    <span className="font-mono">{new Date(item.closingTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-sage/30">
                  {item.status === 'active' && (
                    <>
                      <button
                        onClick={() => openEditModal(item)}
                        className="flex-1 py-2 px-3 rounded-xl border border-sage/60 hover:bg-sage-50 text-charcoal text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-forest" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setCancellingId(item._id)}
                        className="py-2 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                  {item.status !== 'active' && (
                    <div className="w-full text-center py-1.5 text-xs font-medium text-charcoal-muted italic">
                      Auction {item.status}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT MODAL WITH PRICE LOCK RULE */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-warm-white-paper rounded-2xl border border-sage/50 max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-sage/40 pb-3">
              <h3 className="text-lg font-bold text-forest flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-forest" />
                <span>Edit Listing</span>
              </h3>
              <button
                onClick={() => setEditingListing(null)}
                className="text-charcoal-muted hover:text-charcoal p-1"
              >
                &times;
              </button>
            </div>

            {/* Price Lock Notice if bids exist */}
            {editingListing.bidCount > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber/30 text-amber-hover text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Price Fields Locked:</strong> This item has {editingListing.bidCount} active bid(s). Starting price and minimum increment are locked to protect existing bidders.
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-forest-50 border border-forest/20 text-forest text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest flex-shrink-0" />
                <span>Zero bids placed yet. You can adjust the starting price freely.</span>
              </div>
            )}

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-forest text-sm bg-warm-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>Starting Price (₹)</span>
                    {editingListing.bidCount > 0 && <Lock className="w-3 h-3 text-amber" />}
                  </label>
                  <input
                    type="number"
                    disabled={editingListing.bidCount > 0}
                    value={editForm.startingPrice}
                    onChange={(e) => setEditForm({ ...editForm, startingPrice: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono ${
                      editingListing.bidCount > 0
                        ? 'bg-warm-white-muted text-charcoal-muted cursor-not-allowed border-sage/40'
                        : 'border-sage/60 bg-warm-white focus:outline-none focus:ring-2 focus:ring-forest'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>Min Increment (₹)</span>
                    {editingListing.bidCount > 0 && <Lock className="w-3 h-3 text-amber" />}
                  </label>
                  <input
                    type="number"
                    disabled={editingListing.bidCount > 0}
                    value={editForm.minIncrement}
                    onChange={(e) => setEditForm({ ...editForm, minIncrement: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono ${
                      editingListing.bidCount > 0
                        ? 'bg-warm-white-muted text-charcoal-muted cursor-not-allowed border-sage/40'
                        : 'border-sage/60 bg-warm-white focus:outline-none focus:ring-2 focus:ring-forest'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-forest text-sm bg-warm-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-1">
                  Defects Disclosure Note
                </label>
                <textarea
                  rows={2}
                  value={editForm.conditionDefects}
                  onChange={(e) => setEditForm({ ...editForm, conditionDefects: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-forest text-sm bg-warm-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="px-4 py-2 rounded-xl border border-sage/60 hover:bg-sage-50 text-charcoal text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-forest hover:bg-forest-hover disabled:bg-forest/50 text-white text-xs font-bold shadow-xs"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL LISTING CONFIRMATION MODAL */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-warm-white-paper rounded-2xl border border-sage/50 max-w-md w-full p-6 space-y-4 shadow-xl animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-forest">Cancel Auction?</h3>
                <p className="text-xs text-charcoal-muted">This action records a cancelled outcome.</p>
              </div>
            </div>

            <p className="text-xs text-charcoal/80 leading-relaxed">
              Are you sure you want to cancel this auction? Any existing bids will be invalidated and this item will no longer accept bids.
            </p>

            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Optional cancellation reason (e.g. item no longer available)..."
              className="w-full px-3.5 py-2 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-forest text-xs bg-warm-white"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingId(null)}
                className="px-4 py-2 rounded-xl border border-sage/60 hover:bg-sage-50 text-charcoal text-xs font-semibold"
              >
                Keep Active
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelListing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
