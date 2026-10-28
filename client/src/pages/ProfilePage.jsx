import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import {
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  DollarSign,
  Package,
  Clock,
  TrendingUp,
  Tag,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Zap,
} from 'lucide-react';

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

  // Payout states (Module 16)
  const [payoutStatus, setPayoutStatus] = useState('not_started');
  const [activatingPayout, setActivatingPayout] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState('');
  const [payoutError, setPayoutError] = useState('');

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

      const [summaryRes, chartRes, sellingRes, buyingRes, payoutRes] = await Promise.all([
        api.get(`/profile/summary${qs}`),
        api.get(`/profile/chart${qs}`),
        api.get(`/profile/selling${qs}`),
        api.get(`/profile/buying${qs}`),
        api.get('/payouts/status').catch(() => ({ data: { data: { payoutStatus: 'not_started' } } })),
      ]);

      if (summaryRes.data?.success) setSummary(summaryRes.data.data);
      if (chartRes.data?.success) setChartData(chartRes.data.data);
      if (sellingRes.data?.success) setSellingHistory(sellingRes.data.data.items);
      if (buyingRes.data?.success) setBuyingHistory(buyingRes.data.data.items);
      if (payoutRes.data?.data) setPayoutStatus(payoutRes.data.data.payoutStatus || 'not_started');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDevActivatePayout = async () => {
    setActivatingPayout(true);
    setPayoutError('');
    setPayoutSuccess('');
    try {
      const res = await api.post('/payouts/dev-activate');
      if (res.data?.success) {
        setPayoutStatus('active');
        setPayoutSuccess('Test seller linked account activated successfully!');
      }
    } catch (err) {
      setPayoutError(err.response?.data?.message || 'Failed to activate payout');
    } finally {
      setActivatingPayout(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [period, customFrom, customTo]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8 bg-warm-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage/40 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
            Student Profile & History Dashboard
          </h1>
          <p className="text-sm text-charcoal/75 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-forest">Owner:</span> {user?.name}
            <span className="text-xs px-2 py-0.5 rounded-full bg-sage-50 text-forest border border-sage/40 flex items-center gap-1">
              <Shield className="w-3 h-3 text-forest" />
              Private Dashboard &bull; Visible only to you
            </span>
          </p>
        </div>
      </div>

      {/* Period Filter Bar (Responsive for mobile, tab, and desktop) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-warm-white-paper border border-sage/50 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-charcoal" />
            Period:
          </span>
          {['day', 'month', 'year', 'all', 'custom'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                period === p
                  ? 'bg-charcoal text-warm-white shadow-xs font-black'
                  : 'bg-sage-100 text-charcoal hover:bg-sage-200 border border-sage/40'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-sage/30">
            <label className="text-xs font-semibold text-charcoal flex items-center gap-1">
              From:
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-sage/60 text-xs bg-warm-white focus:outline-none focus:ring-1 focus:ring-charcoal"
              />
            </label>
            <label className="text-xs font-semibold text-charcoal flex items-center gap-1">
              To:
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-sage/60 text-xs bg-warm-white focus:outline-none focus:ring-1 focus:ring-charcoal"
              />
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Navigation (Touch friendly and responsive) */}
      <div className="flex gap-2 sm:gap-4 border-b border-sage/40 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview & Charts' },
          { id: 'selling', label: `Selling History (${sellingHistory.length})` },
          { id: 'buying', label: `Buying History (${buyingHistory.length})` },
          { id: 'payouts', label: 'Payout Settings (Route)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
              activeTab === tab.id
                ? 'border-charcoal text-charcoal font-black'
                : 'border-transparent text-charcoal/70 hover:text-charcoal'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-charcoal-muted flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-charcoal border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Loading profile metrics...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & CHARTS */}
          {activeTab === 'overview' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Money Summary Cards (Grid: 1 col mobile, 2 col tab, 3 col desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Card 1: SAGE THEME (Received) */}
                <div className="p-5 rounded-2xl bg-sage-50 border-2 border-sage shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-charcoal uppercase tracking-wider">
                    <span>Total Received (Sales)</span>
                    <ArrowDownLeft className="w-4 h-4 text-charcoal stroke-[2.5]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-charcoal">
                    ₹{summary?.totalReceived || 0}
                  </div>
                  <div className="text-xs text-charcoal/70 font-medium">
                    Pending / Handover in Progress: ₹{summary?.pendingReceived || 0}
                  </div>
                </div>

                {/* Card 2: AMBER (Spent) */}
                <div className="p-5 rounded-2xl bg-amber-50/70 border-2 border-amber/50 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-amber-hover uppercase tracking-wider">
                    <span>Total Spent (Purchases)</span>
                    <ArrowUpRight className="w-4 h-4 text-amber-hover stroke-[2.5]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-charcoal">
                    ₹{summary?.totalSpent || 0}
                  </div>
                  <div className="text-xs text-amber-hover font-medium">
                    Reserved / Pending Handover: ₹{summary?.pendingSpent || 0}
                  </div>
                </div>

                {/* Card 3: CHARCOAL ACCENT (Sold vs Unsold) */}
                <div className="p-5 rounded-2xl bg-warm-white-paper border-2 border-charcoal/30 shadow-xs space-y-2 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between text-xs font-black text-charcoal uppercase tracking-wider">
                    <span>Items Sold vs Unsold</span>
                    <Package className="w-4 h-4 text-charcoal stroke-[2.5]" />
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-charcoal pt-1">
                    Sold: <span className="text-charcoal font-black">{summary?.stats?.soldCount || 0}</span>
                    <span className="text-sage mx-2 font-bold">|</span>
                    Unsold: <span className="text-amber-hover font-black">{summary?.stats?.unsoldCount || 0}</span>
                  </div>
                  <div className="text-xs text-charcoal-muted font-medium">
                    Total Listed on Campus: {summary?.stats?.totalListed || 0}
                  </div>
                </div>
              </div>

              {/* Chart 1: Spending vs Earnings Over Time */}
              <div className="p-5 sm:p-6 rounded-2xl bg-warm-white-paper border border-sage/50 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-forest flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-forest" />
                    Spending vs Earnings Over Time
                  </h3>
                  <span className="text-xs text-charcoal-muted">
                    Filtered by: {period.toUpperCase()}
                  </span>
                </div>

                {chartData.length === 0 ? (
                  <div className="py-16 text-center text-charcoal-muted text-sm border border-dashed border-sage/50 rounded-xl">
                    No financial activity recorded in this selected period.
                  </div>
                ) : (
                  <div className="w-full h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE5" />
                        <XAxis dataKey="date" tick={{ fill: '#5A5A5A', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#5A5A5A', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FAF7F0',
                            borderColor: '#A9BFA8',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Line
                          type="monotone"
                          dataKey="received"
                          name="Earnings (₹)"
                          stroke="#1F4D3A"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#1F4D3A' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="spent"
                          name="Spent (₹)"
                          stroke="#E0A030"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#E0A030' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Chart 2: Sold vs Unsold Counts */}
              <div className="p-5 sm:p-6 rounded-2xl bg-warm-white-paper border border-sage/50 shadow-xs space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-forest">
                  Sold vs Unsold Items Count
                </h3>

                {chartData.length === 0 ? (
                  <div className="py-16 text-center text-charcoal-muted text-sm border border-dashed border-sage/50 rounded-xl">
                    No listing outcomes recorded in this selected period.
                  </div>
                ) : (
                  <div className="w-full h-56 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE5" />
                        <XAxis dataKey="date" tick={{ fill: '#5A5A5A', fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fill: '#5A5A5A', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FAF7F0',
                            borderColor: '#A9BFA8',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Bar dataKey="soldCount" name="Sold Items" fill="#1F4D3A" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="unsoldCount" name="Unsold Items" fill="#E0A030" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SELLING HISTORY */}
          {activeTab === 'selling' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-forest">Selling History</h3>
                <Link
                  to="/my-listings"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest text-warm-white text-xs font-bold hover:bg-forest-light transition-all w-fit cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5 text-amber" />
                  <span>Go to My Listings Manager &rarr;</span>
                </Link>
              </div>
              {sellingHistory.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-sage/50 text-center text-charcoal-muted text-sm bg-warm-white-paper">
                  No items listed during this period.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-sage/50 bg-warm-white-paper shadow-xs">
                  <table className="w-full border-collapse text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-sage-50 text-forest font-bold uppercase tracking-wider border-b border-sage/40">
                        <th className="p-3 sm:p-4">Item</th>
                        <th className="p-3 sm:p-4">Category</th>
                        <th className="p-3 sm:p-4">Condition</th>
                        <th className="p-3 sm:p-4">Starting</th>
                        <th className="p-3 sm:p-4">Final Price</th>
                        <th className="p-3 sm:p-4">Outcome</th>
                        <th className="p-3 sm:p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage/20 text-charcoal">
                      {sellingHistory.map((item) => (
                        <tr key={item._id} className="hover:bg-sage-50/50 transition-colors">
                          <td className="p-3 sm:p-4 font-bold text-forest">{item.title}</td>
                          <td className="p-3 sm:p-4 capitalize">{item.category}</td>
                          <td className="p-3 sm:p-4">{item.conditionGrade}</td>
                          <td className="p-3 sm:p-4 font-mono">₹{item.startingPrice}</td>
                          <td className="p-3 sm:p-4 font-bold font-mono">
                            {item.finalPrice ? `₹${item.finalPrice}` : '-'}
                          </td>
                          <td className="p-3 sm:p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                item.outcome === 'sold'
                                  ? 'bg-forest-50 text-forest border-forest/20'
                                  : item.outcome === 'pending'
                                  ? 'bg-amber-50 text-amber-hover border-amber/30'
                                  : 'bg-warm-white-muted text-charcoal-muted border-sage/40'
                              }`}
                            >
                              {item.outcome.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4 text-xs text-charcoal-muted whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BUYING HISTORY */}
          {activeTab === 'buying' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-forest">Buying History</h3>
              {buyingHistory.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-sage/50 text-center text-charcoal-muted text-sm bg-warm-white-paper">
                  No bids placed during this period.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-sage/50 bg-warm-white-paper shadow-xs">
                  <table className="w-full border-collapse text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-sage-50 text-forest font-bold uppercase tracking-wider border-b border-sage/40">
                        <th className="p-3 sm:p-4">Item</th>
                        <th className="p-3 sm:p-4">Category</th>
                        <th className="p-3 sm:p-4">Seller</th>
                        <th className="p-3 sm:p-4">My Max Bid</th>
                        <th className="p-3 sm:p-4">Final Price</th>
                        <th className="p-3 sm:p-4">Outcome</th>
                        <th className="p-3 sm:p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage/20 text-charcoal">
                      {buyingHistory.map((item) => (
                        <tr key={item._id} className="hover:bg-sage-50/50 transition-colors">
                          <td className="p-3 sm:p-4 font-bold text-forest">{item.title}</td>
                          <td className="p-3 sm:p-4 capitalize">{item.category}</td>
                          <td className="p-3 sm:p-4 font-medium">{item.sellerName}</td>
                          <td className="p-3 sm:p-4 font-mono">₹{item.myMaxBid}</td>
                          <td className="p-3 sm:p-4 font-bold font-mono">
                            {item.finalPrice ? `₹${item.finalPrice}` : '-'}
                          </td>
                          <td className="p-3 sm:p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                item.outcome === 'won'
                                  ? 'bg-forest-50 text-forest border-forest/20'
                                  : item.outcome === 'pending'
                                  ? 'bg-amber-50 text-amber-hover border-amber/30'
                                  : 'bg-warm-white-muted text-charcoal-muted border-sage/40'
                              }`}
                            >
                              {item.outcome.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4 text-xs text-charcoal-muted whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PAYOUT SETTINGS (Module 16) */}
          {activeTab === 'payouts' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-warm-white-paper border-2 border-forest/30 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sage/40">
                  <div>
                    <h3 className="text-lg font-black text-forest flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber" />
                      Razorpay Route Seller Payout Account
                    </h3>
                    <p className="text-xs text-charcoal/75 mt-0.5">
                      Receive split payments directly to your linked account with automatic escrow hold until physical campus handover.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                    {payoutStatus === 'active' ? (
                      <span className="bg-forest-50 text-forest border border-forest/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                        Payout Status: Active
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-hover border border-amber/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber" />
                        Payout Status: {payoutStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {payoutSuccess && (
                  <div className="p-3.5 rounded-xl bg-sage-50 border border-sage text-forest text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                    <span>{payoutSuccess}</span>
                  </div>
                )}

                {payoutError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{payoutError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-warm-white border border-sage/60 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-forest flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-amber" />
                      How Route Escrow Works
                    </h4>
                    <ul className="text-xs text-charcoal/80 space-y-1.5 list-disc pl-4">
                      <li>Buyer pays online when you approve their winning bid.</li>
                      <li>Payment is placed on hold in campus escrow.</li>
                      <li>You meet on campus for in-person item inspection.</li>
                      <li>When you enter the buyer's secret 6-digit code, the transfer is automatically released to your bank!</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-warm-white border border-sage/60 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-forest flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber" />
                      Test Mode Activation
                    </h4>
                    <p className="text-xs text-charcoal/70">
                      In development / test mode, you can activate your test seller linked account with 1-click without providing real bank details.
                    </p>
                    <button
                      type="button"
                      onClick={handleDevActivatePayout}
                      disabled={activatingPayout || payoutStatus === 'active'}
                      className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        payoutStatus === 'active'
                          ? 'bg-sage-50 text-forest border border-sage/60 cursor-default'
                          : 'bg-amber hover:bg-amber-hover text-forest shadow-xs active:scale-95'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {activatingPayout
                          ? 'Activating...'
                          : payoutStatus === 'active'
                          ? 'Linked Account Active'
                          : '1-Click Dev Activate Payout'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
