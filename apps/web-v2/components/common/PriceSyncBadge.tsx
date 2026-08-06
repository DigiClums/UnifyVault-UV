'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

interface PriceSyncBadgeProps {
  intervalSeconds?: number;
  showCountdown?: boolean;
  className?: string;
  onRefresh?: () => void;
}

export function PriceSyncBadge({
  intervalSeconds = 30,
  showCountdown = true,
  className = '',
  onRefresh,
}: PriceSyncBadgeProps) {
  const [secondsLeft, setSecondsLeft] = useState(intervalSeconds);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsSyncing(true);
          setTimeout(() => setIsSyncing(false), 1200);
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalSeconds]);

  const handleManualRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    setSecondsLeft(intervalSeconds);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsSyncing(false), 1200);
  };

  return (
    <div
      onClick={handleManualRefresh}
      title="Real-time Oracle Sync — Click to force instant refresh"
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-semibold cursor-pointer hover:bg-emerald-500/20 transition-all select-none ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${
            isSyncing ? 'duration-300' : ''
          }`}
        />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="font-bold text-emerald-400 tracking-wider">LIVE</span>
      {showCountdown && (
        <span className="text-[10px] text-emerald-300/80 font-normal">
          {isSyncing ? (
            <span className="flex items-center space-x-1">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              <span>Syncing…</span>
            </span>
          ) : (
            `(${secondsLeft}s)`
          )}
        </span>
      )}
    </div>
  );
}
