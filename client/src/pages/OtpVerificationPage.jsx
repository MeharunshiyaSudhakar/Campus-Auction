import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

export default function OtpVerificationPage() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const purposeParam = searchParams.get('purpose') || 'signup';

  const [email] = useState(emailParam);
  const [purpose] = useState(purposeParam);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef([]);
  const { verifyEmail, verifyLoginOtp } = useAuth();
  const navigate = useNavigate();

  // Redirect if no email provided
  useEffect(() => {
    if (!emailParam) {
      navigate('/login');
    }
  }, [emailParam, navigate]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // 60-Second Resend Countdown Timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (index, value) => {
    // Only accept numeric digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pasteData) return;

    const digits = pasteData.slice(0, 6).split('');
    const newOtp = [...otp];
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);
    setError('');

    // Focus last filled box
    const focusIndex = Math.min(digits.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const fullCode = otp.join('');

    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of your verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (purpose === 'login') {
        await verifyLoginOtp(email, fullCode);
      } else {
        await verifyEmail(email, fullCode);
      }
      setSuccessMsg('Email verified successfully! Redirecting to campus feed...');
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError('');

    try {
      const res = await api.post('/auth/resend-otp', {
        email,
        purpose,
      });

      if (res.data?.success) {
        setCountdown(60);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setSuccessMsg(`A new verification code was sent to ${email}`);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-warm-white">
      <div className="max-w-md w-full space-y-6">
        {/* Verification Card */}
        <div className="bg-warm-white-paper border-2 border-sage rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
          {/* Header Icon & Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-charcoal text-warm-white flex items-center justify-center mx-auto shadow-md border border-charcoal">
              <ShieldCheck className="w-7 h-7 text-amber" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal">
              Verify Campus Email
            </h1>
            <p className="text-xs sm:text-sm text-charcoal/80 leading-relaxed max-w-sm mx-auto">
              We sent a 6-digit confirmation code to:
              <br />
              <strong className="text-forest font-bold font-mono">{email}</strong>
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 6-Box OTP Input Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/70 mb-3 text-center">
                Enter 6-Digit Code
              </label>

              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-11 h-14 sm:w-13 sm:h-16 text-center font-mono text-2xl sm:text-3xl font-black bg-warm-white text-charcoal border-2 border-sage/70 rounded-xl focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none transition-all shadow-xs"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full py-3.5 px-4 rounded-xl bg-amber hover:bg-amber-hover text-charcoal text-btn font-black transition-all shadow-md shadow-amber/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-98 border border-amber/40"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-charcoal" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Continue</span>
                  <ArrowRight className="w-4 h-4 text-charcoal" />
                </>
              )}
            </button>
          </form>

          {/* Resend Code Action with 60s Countdown */}
          <div className="pt-2 border-t border-sage/40 text-center space-y-2">
            <div className="text-xs text-charcoal/80 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-charcoal/60" />
              <span>
                {countdown > 0 ? (
                  <>Resend code in <strong className="font-mono text-forest">{countdown}s</strong></>
                ) : (
                  "Didn't receive the email?"
                )}
              </span>
            </div>

            <button
              type="button"
              disabled={countdown > 0 || resending}
              onClick={handleResend}
              className="text-xs sm:text-sm font-bold text-forest hover:text-amber underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {resending ? 'Sending New Code...' : 'Resend Verification Code'}
            </button>
          </div>

          {/* Development Console Note */}
          <div className="p-3 rounded-xl bg-sage-50/70 border border-sage/60 text-[11px] text-charcoal/70 text-center leading-relaxed">
            💡 <strong>Campus Tip:</strong> If SMTP email is unconfigured during testing, check your server terminal output for the OTP code.
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal hover:text-forest transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
