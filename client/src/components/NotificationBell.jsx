import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import getSocket from '../services/socket';
import {
  Bell,
  Check,
  CheckCheck,
  Gavel,
  ShieldAlert,
  Sparkles,
  MessageSquare,
  Clock,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef(null);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data?.data?.unreadCount || 0);
    } catch (err) {
      // Ignore background counter errors
    }
  };

  const fetchRecentNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=8');
      const data = res.data?.data;
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // Poll count periodically (every 15s)
      const interval = setInterval(fetchUnreadCount, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchRecentNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        // Continue navigation even if marking fails
      }
    }

    setIsOpen(false);

    // Target navigation
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

  if (!user) return null;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'won':
      case 'approved':
        return <Sparkles className="w-4 h-4 text-amber fill-amber shrink-0" />;
      case 'outbid':
        return <Gavel className="w-4 h-4 text-red-500 shrink-0" />;
      case 'approval_needed':
        return <Clock className="w-4 h-4 text-amber shrink-0" />;
      case 'qa_question':
      case 'qa_answered':
        return <MessageSquare className="w-4 h-4 text-forest shrink-0" />;
      case 'unsold_alert':
        return <RotateCcw className="w-4 h-4 text-charcoal shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-forest shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-warm-white hover:text-amber hover:bg-charcoal-700 transition-colors cursor-pointer border border-sage/30"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5 text-warm-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber text-charcoal text-[10px] font-black flex items-center justify-center border-2 border-charcoal shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-warm-white-paper border-2 border-sage shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b-2 border-sage flex items-center justify-between bg-charcoal text-warm-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-warm-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber text-charcoal text-[10px] font-black">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-sage-light hover:text-amber flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-sage-light" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-sage/25">
            {loading ? (
              <div className="p-4 space-y-2">
                <div className="h-12 bg-sage/20 rounded-xl animate-pulse" />
                <div className="h-12 bg-sage/20 rounded-xl animate-pulse" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-charcoal-muted text-xs font-semibold space-y-1">
                <Bell className="w-6 h-6 mx-auto text-sage" />
                <p>No notifications yet</p>
                <p className="text-[11px]">Bidding updates and seller alerts will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-sage/15 ${
                    !n.isRead ? 'bg-amber/5' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-sage/20 shrink-0 mt-0.5">
                    {getTypeIcon(n.type)}
                  </div>

                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          !n.isRead ? 'font-black text-forest' : 'font-bold text-charcoal'
                        }`}
                      >
                        {n.title}
                      </h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-amber shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-charcoal/80 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-charcoal-muted block font-semibold pt-0.5">
                      {new Date(n.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-warm-white border-t border-sage/40 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-black text-forest hover:text-forest-light inline-flex items-center gap-1"
            >
              <span>View All Notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
