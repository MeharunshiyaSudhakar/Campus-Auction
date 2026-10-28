import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Shield, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    campusRollNumber: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      const cleanMessage =
        err.response?.data?.message ||
        (err.response?.status === 409
          ? err.response?.data?.message || 'A student with this email or roll number is already registered.'
          : err.response?.status >= 500
          ? 'Server encountered an issue. Please try again shortly.'
          : !err.response || err.message === 'Network Error'
          ? 'Cannot connect to server. Please verify backend is running on port 5000.'
          : 'Registration failed. Please check your information.');
      setError(cleanMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 sm:py-12 bg-warm-white">
      <div className="max-w-md w-full bg-warm-white-paper rounded-2xl border-2 border-sage/60 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-charcoal text-warm-white border border-charcoal flex items-center justify-center mx-auto shadow-xs">
            <UserPlus className="w-6 h-6 text-amber" />
          </div>
          <h1 className="text-2xl font-extrabold text-charcoal">Create Student Account</h1>
          <p className="text-sm text-charcoal/70">
            Join the trusted peer-to-peer campus marketplace
          </p>
        </div>

        {/* Privacy by Design Banner */}
        <div className="p-3.5 rounded-xl bg-sage-50 border border-sage/60 flex items-start gap-2.5 text-charcoal text-xs">
          <Shield className="w-4 h-4 flex-shrink-0 text-sage-dark mt-0.5" />
          <span>
            <strong>Privacy Guarantee:</strong> Only your name will be visible to buyers and sellers. Your email, phone, and roll number are strictly private.
          </span>
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
              Full Name (Public Display) *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Aarav Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal text-sm bg-warm-white text-charcoal"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-1">
              College Email (Private) *
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. student@college.edu"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal text-sm bg-warm-white text-charcoal"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal text-sm bg-warm-white text-charcoal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-1">
                Phone (Private)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal text-sm bg-warm-white text-charcoal"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-1">
                Roll Number (Unique) *
              </label>
              <input
                type="text"
                name="campusRollNumber"
                required
                value={formData.campusRollNumber}
                onChange={handleChange}
                placeholder="e.g. CS21B042"
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage/60 focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal text-sm bg-warm-white text-charcoal uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-charcoal hover:bg-charcoal-hover disabled:bg-charcoal/50 text-warm-white font-bold text-sm transition-all shadow-md active:scale-[0.99] border border-charcoal cursor-pointer"
          >
            {submitting ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <p className="text-center text-xs text-charcoal/70">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-charcoal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
