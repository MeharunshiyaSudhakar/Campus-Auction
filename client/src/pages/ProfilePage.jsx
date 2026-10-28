import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function ProfilePage() {
  const { user } = useAuth();

  // Active Tab: 'overview' | 'selling' | 'buying'
  const [activeTab, setActiveTab] = useState('overview');

  // Period Filter: 'day' | 'month' | 'year' | 'custom' | 'all'
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Data states
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [sellingHistory, setSellingHistory] = useState([]);
  const [buyingHistory, setBuyingHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all profile data together whenever period/custom dates change
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams();
      if (period !== 'all') queryParams.append('period', period);
      if (period === 'custom' && customFrom) queryParams.append('from', customFrom);
      if (period === 'custom' && customTo) queryParams.append('to', customTo);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const [summaryRes, chartRes, sellingRes, buyingRes] = await Promise.all([
        api.get(`/profile/summary${qs}`),
        api.get(`/profile/chart${qs}`),
        api.get(`/profile/selling${qs}`),
        api.get(`/profile/buying${qs}`),
      ]);

      if (summaryRes.data?.success) setSummary(summaryRes.data.data);
      if (chartRes.data?.success) setChartData(chartRes.data.data);
      if (sellingRes.data?.success) setSellingHistory(sellingRes.data.data.items);
      if (buyingRes.data?.success) setBuyingHistory(buyingRes.data.data.items);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [period, customFrom, customTo]);

  return (
    <div style={{ maxWidth: 1000, margin: '20px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #ddd', paddingBottom: 16, marginBottom: 20 }}>
        <h2>Student Profile & History Dashboard</h2>
        <p style={{ color: '#666', margin: '4px 0' }}>
          <strong>Owner:</strong> {user?.name} (Private area — visible only to you)
        </p>
      </div>

      {/* Period Filter Bar */}
      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <span><strong>Filter Period:</strong></span>
        {['day', 'month', 'year', 'all', 'custom'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid #ccc',
              cursor: 'pointer',
              fontWeight: period === p ? 'bold' : 'normal',
              background: period === p ? '#4f46e5' : '#fff',
              color: period === p ? '#fff' : '#000',
            }}
          >
            {p.toUpperCase()}
          </button>
        ))}

        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label>From: <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></label>
            <label>To: <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></label>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
        {[
          { id: 'overview', label: 'Overview & Charts' },
          { id: 'selling', label: `Selling History (${sellingHistory.length})` },
          { id: 'buying', label: `Buying History (${buyingHistory.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #4f46e5' : '3px solid transparent',
              background: 'transparent',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              color: activeTab === tab.id ? '#4f46e5' : '#6b7280',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading profile metrics...</div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & CHARTS */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Money Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ border: '1px solid #e5e7eb', padding: 16, borderRadius: 8, background: '#ecfdf5' }}>
                  <div style={{ fontSize: 12, color: '#047857', fontWeight: 'bold' }}>TOTAL RECEIVED (COMPLETED SALES)</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#065f46', marginTop: 4 }}>₹{summary?.totalReceived || 0}</div>
                  <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>Pending/Reserved: ₹{summary?.pendingReceived || 0}</div>
                </div>

                <div style={{ border: '1px solid #e5e7eb', padding: 16, borderRadius: 8, background: '#eff6ff' }}>
                  <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 'bold' }}>TOTAL SPENT (COMPLETED PURCHASES)</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1e40af', marginTop: 4 }}>₹{summary?.totalSpent || 0}</div>
                  <div style={{ fontSize: 11, color: '#2563eb', marginTop: 4 }}>Pending/Reserved: ₹{summary?.pendingSpent || 0}</div>
                </div>

                <div style={{ border: '1px solid #e5e7eb', padding: 16, borderRadius: 8, background: '#f9fafb' }}>
                  <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 'bold' }}>ITEMS SOLD VS UNSOLD</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', marginTop: 6 }}>
                    Sold: <span style={{ color: '#059669' }}>{summary?.stats?.soldCount || 0}</span> | Unsold: <span style={{ color: '#dc2626' }}>{summary?.stats?.unsoldCount || 0}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Total Listed: {summary?.stats?.totalListed || 0}</div>
                </div>
              </div>

              {/* Chart 1: Spending & Earnings Over Time */}
              <div style={{ border: '1px solid #e5e7eb', padding: 16, borderRadius: 8, background: '#fff' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Spending vs Earnings Over Time</h4>
                {chartData.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>No financial activity in this period.</div>
                ) : (
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="received" name="Earnings (₹)" stroke="#059669" strokeWidth={2} />
                        <Line type="monotone" dataKey="spent" name="Spent (₹)" stroke="#2563eb" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Chart 2: Sold vs Unsold Counts */}
              <div style={{ border: '1px solid #e5e7eb', padding: 16, borderRadius: 8, background: '#fff' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Sold vs Unsold Items Count</h4>
                {chartData.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>No listing outcomes in this period.</div>
                ) : (
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="soldCount" name="Sold Items" fill="#10b981" />
                        <Bar dataKey="unsoldCount" name="Unsold Items" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SELLING HISTORY */}
          {activeTab === 'selling' && (
            <div>
              <h3>Selling History</h3>
              {sellingHistory.length === 0 ? (
                <div style={{ padding: 30, border: '1px dashed #ccc', textAlign: 'center', color: '#888' }}>
                  No items listed during this period.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: 10 }}>Item</th>
                      <th style={{ padding: 10 }}>Category</th>
                      <th style={{ padding: 10 }}>Condition</th>
                      <th style={{ padding: 10 }}>Starting</th>
                      <th style={{ padding: 10 }}>Final Price</th>
                      <th style={{ padding: 10 }}>Outcome</th>
                      <th style={{ padding: 10 }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellingHistory.map((item) => (
                      <tr key={item._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: 10, fontWeight: 'bold' }}>{item.title}</td>
                        <td style={{ padding: 10 }}>{item.category}</td>
                        <td style={{ padding: 10 }}>{item.conditionGrade}</td>
                        <td style={{ padding: 10 }}>₹{item.startingPrice}</td>
                        <td style={{ padding: 10, fontWeight: 'bold' }}>{item.finalPrice ? `₹${item.finalPrice}` : '-'}</td>
                        <td style={{ padding: 10 }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                            background: item.outcome === 'sold' ? '#d1fae5' : item.outcome === 'pending' ? '#fef3c7' : '#fee2e2',
                            color: item.outcome === 'sold' ? '#065f46' : item.outcome === 'pending' ? '#92400e' : '#991b1b',
                          }}>
                            {item.outcome.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: 10, fontSize: 12, color: '#666' }}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: BUYING HISTORY */}
          {activeTab === 'buying' && (
            <div>
              <h3>Buying History</h3>
              {buyingHistory.length === 0 ? (
                <div style={{ padding: 30, border: '1px dashed #ccc', textAlign: 'center', color: '#888' }}>
                  No bids placed during this period.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: 10 }}>Item</th>
                      <th style={{ padding: 10 }}>Category</th>
                      <th style={{ padding: 10 }}>Seller</th>
                      <th style={{ padding: 10 }}>My Max Bid</th>
                      <th style={{ padding: 10 }}>Final Price</th>
                      <th style={{ padding: 10 }}>Outcome</th>
                      <th style={{ padding: 10 }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyingHistory.map((item) => (
                      <tr key={item._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: 10, fontWeight: 'bold' }}>{item.title}</td>
                        <td style={{ padding: 10 }}>{item.category}</td>
                        <td style={{ padding: 10 }}>{item.sellerName}</td>
                        <td style={{ padding: 10 }}>₹{item.myMaxBid}</td>
                        <td style={{ padding: 10, fontWeight: 'bold' }}>{item.finalPrice ? `₹${item.finalPrice}` : '-'}</td>
                        <td style={{ padding: 10 }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                            background: item.outcome === 'won' ? '#d1fae5' : item.outcome === 'pending' ? '#fef3c7' : '#fee2e2',
                            color: item.outcome === 'won' ? '#065f46' : item.outcome === 'pending' ? '#92400e' : '#991b1b',
                          }}>
                            {item.outcome.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: 10, fontSize: 12, color: '#666' }}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
