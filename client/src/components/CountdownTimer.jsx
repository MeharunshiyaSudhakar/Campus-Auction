import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export default function CountdownTimer({ targetDate, compact = false, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  function calculateTimeLeft(target) {
    if (!target) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    const difference = new Date(target).getTime() - Date.now();
    if (difference <= 0) {
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    return {
      total: difference,
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isExpired: false,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft(targetDate);
      setTimeLeft(remaining);
      if (remaining.isExpired) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (timeLeft.isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 font-bold ${compact ? 'text-xs text-charcoal-muted' : 'text-sm px-3 py-1.5 rounded-lg bg-charcoal/10 text-charcoal-muted'}`}>
        <CheckCircle className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>Auction Ended</span>
      </div>
    );
  }

  const isUrgent = timeLeft.total < 2 * 60 * 60 * 1000; // Under 2 hours

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full border shadow-2xs transition-colors ${
          isUrgent
            ? 'bg-amber text-forest border-amber/60 animate-pulse'
            : 'bg-warm-white text-forest border-sage'
        }`}
        title={`Auction closes at ${new Date(targetDate).toLocaleString()}`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.days === 0 && `${timeLeft.seconds}s`}
        </span>
      </div>
    );
  }

  // Detailed countdown view (for Auction Detail Page)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-forest flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-amber" />
          Time Remaining (Server Clock)
        </span>
        {isUrgent && (
          <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-amber text-forest flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-forest" />
            Closing Soon
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 sm:p-3 rounded-xl bg-forest text-warm-white border border-forest-light shadow-xs">
          <div className="text-xl sm:text-2xl font-black">{timeLeft.days}</div>
          <div className="text-[10px] sm:text-xs text-sage-light uppercase font-bold tracking-wider">Days</div>
        </div>
        <div className="p-2 sm:p-3 rounded-xl bg-forest text-warm-white border border-forest-light shadow-xs">
          <div className="text-xl sm:text-2xl font-black">{timeLeft.hours}</div>
          <div className="text-[10px] sm:text-xs text-sage-light uppercase font-bold tracking-wider">Hours</div>
        </div>
        <div className="p-2 sm:p-3 rounded-xl bg-forest text-warm-white border border-forest-light shadow-xs">
          <div className="text-xl sm:text-2xl font-black">{timeLeft.minutes}</div>
          <div className="text-[10px] sm:text-xs text-sage-light uppercase font-bold tracking-wider">Mins</div>
        </div>
        <div className={`p-2 sm:p-3 rounded-xl border shadow-xs ${isUrgent ? 'bg-amber text-forest border-amber/60 font-black' : 'bg-forest text-warm-white border-forest-light'}`}>
          <div className="text-xl sm:text-2xl font-black">{timeLeft.seconds}</div>
          <div className={`text-[10px] sm:text-xs uppercase font-bold tracking-wider ${isUrgent ? 'text-forest' : 'text-sage-light'}`}>Secs</div>
        </div>
      </div>
    </div>
  );
}
