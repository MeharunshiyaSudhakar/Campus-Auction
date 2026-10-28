import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

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
    <div style={{ maxWidth: 900, margin: '20px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <div style={{ borderBottom: '1px solid #ddd', paddingBottom: 16, marginBottom: 20 }}>
        <h2>Items Needing Attention (Unsold & Stale Alerts)</h2>
        <p style={{ color: '#666', margin: '4px 0' }}>
          Listings with zero bids after 3+ days, closed unsold auctions, or rejected bids. Take quick action to find a buyer!
        </p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Checking listing status...</div>
      ) : items.length === 0 ? (
        <div style={{ border: '1px dashed #10b981', background: '#ecfdf5', padding: 32, borderRadius: 8, textAlign: 'center' }}>
          <h3 style={{ color: '#065f46', margin: '0 0 8px 0' }}>All Clear! No Items Need Attention</h3>
          <p style={{ color: '#047857', margin: 0 }}>
            None of your items are currently stale or closed unsold.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((item) => (
            <div
              key={item._id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 16,
                background: '#fff',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      background: item.reasonKey === 'no_bids_stale' ? '#fef3c7' : '#fee2e2',
                      color: item.reasonKey === 'no_bids_stale' ? '#92400e' : '#991b1b',
                      fontSize: 11,
                      fontWeight: 'bold',
                      padding: '3px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {item.reasonKey.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    Listed: {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 style={{ margin: '0 0 4px 0', fontSize: 16 }}>{item.title}</h4>
                <p style={{ margin: '0 0 8px 0', color: '#4b5563', fontSize: 13 }}>{item.reasonText}</p>
                <div style={{ fontSize: 13 }}>
                  <strong>Current Starting Price:</strong> ₹{item.startingPrice} | <strong>Bids:</strong> {item.bidCount}
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {item.status === 'active' && (
                  <>
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setEditPrice(item.startingPrice.toString());
                      }}
                      style={{ padding: '8px 14px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                    >
                      Lower Price
                    </button>
                    <button
                      onClick={() => handleCancelListing(item._id)}
                      style={{ padding: '8px 14px', borderRadius: 4, border: '1px solid #f87171', background: '#fee2e2', color: '#991b1b', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </>
                )}

                {item.status !== 'active' && (
                  <button
                    onClick={() => openRelistModal(item)}
                    style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    + Relist Item
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RELIST MODAL */}
      {relistingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 450, width: '100%' }}>
            <h3>Relist Item as New Auction</h3>
            <p style={{ color: '#555', fontSize: 13 }}>
              Relisting creates a fresh auction prefilled with your photos and verified condition details from <strong>{relistingItem.title}</strong>.
            </p>

            <form onSubmit={handleConfirmRelist} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
                  New Starting Price (₹):
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: 11, color: '#059669' }}>
                  Suggested lower price for a faster sale.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
                  New Auction Duration (Hours):
                </label>
                <select
                  value={newClosingHours}
                  onChange={(e) => setNewClosingHours(e.target.value)}
                  style={{ width: '100%', padding: 8 }}
                >
                  <option value="24">24 Hours (Quick Campus Sale)</option>
                  <option value="48">48 Hours (Standard)</option>
                  <option value="72">72 Hours (3 Days)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setRelistingItem(null)}
                  style={{ padding: '8px 14px', background: '#ccc', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={relisting}
                  style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 400, width: '100%' }}>
            <h3>Adjust Starting Price</h3>
            <p style={{ color: '#555', fontSize: 13 }}>
              Lowering starting price can attract bids from students looking for affordable campus gear.
            </p>

            <form onSubmit={handleQuickPriceUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
                  New Starting Price (₹):
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{ padding: '8px 14px', background: '#ccc', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
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
