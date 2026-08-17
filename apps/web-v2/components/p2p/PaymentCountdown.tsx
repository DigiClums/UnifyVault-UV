'use client';

import React, { useState, useEffect, memo } from 'react';
import { Clock } from 'lucide-react';
import { formatCountdown, calculateRemainingSeconds } from '../../lib/p2p/countdown';

interface PaymentCountdownProps {
  fundingTimestamp: number;
  paymentWindow: number;
  onExpire?: () => void;
  className?: string;
}

/**
 * Phase C: Isolated Payment Countdown Component
 * Ticks locally every second without triggering parent TradeDetailCard re-renders.
 */
export const PaymentCountdown = memo(function PaymentCountdown({
  fundingTimestamp,
  paymentWindow,
  onExpire,
  className = '',
}: PaymentCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    calculateRemainingSeconds(fundingTimestamp, paymentWindow),
  );

  useEffect(() => {
    if (fundingTimestamp === 0 || paymentWindow === 0) {
      setTimeLeft(0);
      return;
    }

    const checkTime = () => {
      const remaining = calculateRemainingSeconds(fundingTimestamp, paymentWindow);
      setTimeLeft(remaining);

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    // Immediate check
    checkTime();

    // 1-second interval isolated inside this component
    const interval = setInterval(checkTime, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [fundingTimestamp, paymentWindow, onExpire]);

  const isExpired = timeLeft === 0;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono transition-colors ${
        isExpired
          ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
      } ${className}`}
      aria-label={`Payment window countdown: ${formatCountdown(timeLeft)}`}
    >
      <Clock className={`w-4 h-4 ${isExpired ? '' : 'animate-pulse'}`} />
      <span className="text-xs font-bold">
        {isExpired ? 'Payment Window Expired' : `Payment Window: ${formatCountdown(timeLeft)}`}
      </span>
    </div>
  );
});
