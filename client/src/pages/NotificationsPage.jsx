import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Bell,
  CheckCheck,
  Gavel,
  ShieldAlert,
  Sparkles,
  MessageSquare,
  Clock,
  ExternalLink,
  RotateCcw,
  Filter,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/notifications?limit=50&unreadOnly=${unreadOnly}`);
      const data = res.data?.data;
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const handleMarkAsRead = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // continue
      }
    }

    if (notif.type === 'approved' || notif.type === 'completed') {
      if (notif.listing?._id) {
        navigate(`/auctions/${notif.listing._id}`);
      }
    } else if (notif.type === 'unsold_alert') {
      navigate('/needs-attention');
    } else if (notif.listing?._id) {
      navigate(`/auctions/${notif.listing._id}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'won':
      case 'approved':
        return <Sparkles className="w-5 h-5 text-amber fill-amber shrink-0" />;
      case 'outbid':
        return <Gavel className="w-5 h-5 text-red-500 shrink-0" />;
      case 'approval_needed':
        return <Clock className="w-5 h-5 text-amber shrink-0" />;
      case 'qa_question':
      case 'qa_answered':
        return <MessageSquare className="w-5 h-5 text-forest shrink-0" />;
      case 'unsold_alert':
        return <RotateCcw className="w-5 h-5 text-charcoal shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-forest shrink-0" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sage/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-forest text-warm-white flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5 text-amber" />
            </div>
            <h1 className="text-2xl font-black text-forest">Notifications Center</h1>
          </div>
          <p className="text-xs text-charcoal-muted">
            Stay updated on your live bids, winning outcomes, and buyer questions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pill */}
          <div className="flex rounded-xl bg-warm-white p-1 border border-sage/60 text-xs font-bold">
            <button
              onClick={() => setUnreadOnly(false)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                !unreadOnly ? 'bg-forest text-warm-white' : 'text-forest hover:bg-sage/20'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setUnreadOnly(true)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                unreadOnly ? 'bg-forest text-warm-white' : 'text-forest hover:bg-sage/20'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber text-forest text-[10px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 rounded-xl bg-forest hover:bg-forest-light text-warm-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-amber" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-20 bg-sage/15 rounded-2xl" />
            <div className="h-20 bg-sage/15 rounded-2xl" />
            <div className="h-20 bg-sage/15 rounded-2xl" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-warm-white-paper rounded-3xl border border-sage/60 p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-sage/20 text-forest flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-forest" />
            </div>
            <h3 className="text-base font-black text-forest">
              {unreadOnly ? 'No Unread Notifications' : 'No Notifications Yet'}
            </h3>
            <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
              {unreadOnly
                ? 'You have caught up with all your notifications!'
                : 'When students bid on your items or reply to your questions, alerts will appear here.'}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleMarkAsRead(n)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 hover:border-forest/50 ${
                !n.isRead
                  ? 'bg-amber/10 border-amber/60 shadow-xs'
                  : 'bg-warm-white-paper border-sage/50'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-sage/20 shrink-0 mt-0.5">
                {getTypeIcon(n.type)}
              </div>

              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-sm ${
                      !n.isRead ? 'font-black text-forest' : 'font-bold text-charcoal'
                    }`}
                  >
                    {n.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-charcoal-muted font-semibold">
                      {new Date(n.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!n.isRead && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber shrink-0 animate-pulse" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-charcoal/90 leading-relaxed font-medium">
                  {n.message}
                </p>

                {n.listing && (
                  <div className="flex items-center gap-1.5 pt-1 text-[11px] font-bold text-forest hover:underline">
                    <span>View item: {n.listing.title}</span>
                    <ExternalLink className="w-3 h-3 text-amber" />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
