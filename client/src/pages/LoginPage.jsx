import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectUrl);
    } catch (err) {
      if (err.response?.status === 403 && (err.response?.data?.message?.includes('verify') || err.response?.data?.code === 'EMAIL_NOT_VERIFIED')) {
        const targetEmail = err.response?.data?.email || email;
        setError(
          <span>
            {err.response.data.message}{' '}
            <Link
              to={`/verify-email?email=${encodeURIComponent(targetEmail)}`}
              className="font-bold underline text-amber-hover hover:text-charcoal ml-1"
            >
              Verify Email Now &rarr;
            </Link>
          </span>
        );
      } else {
        const cleanMessage =
          err.response?.data?.message ||
          (err.response?.status === 401
            ? 'Invalid college email/roll number or password'
            : err.response?.status >= 500
            ? 'Server encountered an issue. Please verify your credentials or try again.'
            : !err.response || err.message === 'Network Error'
            ? 'Cannot connect to server. Please verify backend is running on port 5000.'
            : 'Failed to sign in. Please check your credentials.');
        setError(cleanMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 sm:py-12 bg-warm-white">
      <div className="max-w-md w-full bg-warm-white-paper rounded-2xl border-2 border-sage/60 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-charcoal text-warm-white border border-charcoal flex items-center justify-center mx-auto shadow-xs">
            <LogIn className="w-6 h-6 text-amber" />
          </div>
          <h1 className="text-2xl font-extrabold text-charcoal">Sign In to Campus Auction</h1>
          <p className="text-sm text-charcoal/70">
            Bid on campus gear or list your own items for juniors
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-1">
              College Email or Roll Number
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rohit@campus.edu or CS21B042"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal text-sm bg-warm-white text-charcoal"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal text-sm bg-warm-white text-charcoal"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-charcoal hover:bg-charcoal-hover disabled:bg-charcoal/50 text-warm-white font-bold text-sm transition-all shadow-md active:scale-[0.99] border border-charcoal cursor-pointer"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-charcoal/70">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-bold text-charcoal hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
