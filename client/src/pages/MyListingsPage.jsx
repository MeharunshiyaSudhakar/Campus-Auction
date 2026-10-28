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
      active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      closed: 'bg-slate-100 text-slate-700 border-slate-300',
      pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
      approved: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      completed: 'bg-blue-50 text-blue-700 border-blue-200',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
      unsold: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.active}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            My Auction Listings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your campus listings, review bids, and monitor closing times.
          </p>
        </div>
        <Link
          to="/create-listing"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
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
        <div className="py-20 text-center text-slate-400">Loading your listings...</div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Gavel className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Listings Created Yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Have a cycle, scientific calculator, or textbooks you no longer need? List them now for juniors!
          </p>
          <Link
            to="/create-listing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-100 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Listing</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Photo & Status Overlay */}
              <div className="relative aspect-video bg-slate-100">
                <img
                  src={item.photos[0]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  {getStatusBadge(item.status)}
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur text-white text-xs font-semibold">
                  {item.category.toUpperCase()}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Condition: {item.condition?.grade}
                    </span>
                    <span className="text-xs text-slate-400">
                      Age: {item.condition?.age}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 line-clamp-1" title={item.title}>
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* Price and Bids Stats */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Current / Starting Price:</span>
                    <span className="font-extrabold text-slate-900 text-sm">₹{item.currentPrice}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Total Bids:</span>
                    <span className="font-semibold text-indigo-600">
                      {item.bidCount} {item.bidCount === 1 ? 'bid' : 'bids'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400 pt-1 border-t border-slate-200/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Closes:
                    </span>
                    <span>{new Date(item.closingTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {item.status === 'active' && (
                    <>
                      <button
                        onClick={() => openEditModal(item)}
                        className="flex-1 py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setCancellingId(item._id)}
                        className="py-2 px-3 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                  {item.status !== 'active' && (
                    <div className="w-full text-center py-1.5 text-xs font-medium text-slate-400 italic">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>Edit Listing</span>
              </h3>
              <button
                onClick={() => setEditingListing(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            {/* Price Lock Notice if bids exist */}
            {editingListing.bidCount > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Price Fields Locked:</strong> This item has {editingListing.bidCount} active bid(s). Starting price and minimum increment are locked to protect existing bidders.
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Zero bids placed yet. You can still adjust the starting price.</span>
              </div>
            )}

            {editError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center gap-1">
                    <span>Starting Price (₹)</span>
                    {editingListing.bidCount > 0 && <Lock className="w-3 h-3 text-amber-600" />}
                  </label>
                  <input
                    type="number"
                    disabled={editingListing.bidCount > 0}
                    value={editForm.startingPrice}
                    onChange={(e) => setEditForm({ ...editForm, startingPrice: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                      editingListing.bidCount > 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                        : 'border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center gap-1">
                    <span>Min Increment (₹)</span>
                    {editingListing.bidCount > 0 && <Lock className="w-3 h-3 text-amber-600" />}
                  </label>
                  <input
                    type="number"
                    disabled={editingListing.bidCount > 0}
                    value={editForm.minIncrement}
                    onChange={(e) => setEditForm({ ...editForm, minIncrement: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                      editingListing.bidCount > 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                        : 'border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Defects Disclosure Note
                </label>
                <textarea
                  rows={2}
                  value={editForm.conditionDefects}
                  onChange={(e) => setEditForm({ ...editForm, conditionDefects: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancel Auction?</h3>
                <p className="text-xs text-slate-500">This action records a cancelled outcome.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this auction? Any existing bids will be invalidated and this item will no longer accept bids.
            </p>

            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Optional cancellation reason (e.g. item no longer available)..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellingId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                Keep Active
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelListing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
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
