'use client';

import React from 'react';

interface TokenIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

export function TokenIcon({ symbol, size = 28, className = '' }: TokenIconProps) {
  const sym = symbol.toUpperCase();

  if (sym.includes('BTC') || sym === 'WBTC') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
      >
        <circle cx="16" cy="16" r="16" fill="#F7931A" />
        <path
          d="M22.42 13.08c.32-2.14-1.31-3.29-3.54-4.06l.72-2.9-1.77-.44-.7 2.82c-.47-.12-.95-.23-1.42-.34l.71-2.84-1.77-.44-.72 2.9c-.38-.09-.76-.17-1.13-.26l-2.44-.61-.47 1.89s1.31.3 1.28.32c.72.18.85.65.83 1.03l-.83 3.33c.05.01.11.03.18.06l-.18-.04-1.16 4.67c-.09.22-.31.55-.82.42.02.03-1.28-.32-1.28-.32l-.88 2.03 2.3.57c.43.11.85.22 1.27.32l-.73 2.94 1.77.44.72-2.9c.48.13.96.25 1.43.36l-.72 2.89 1.77.44.73-2.93c3.01.57 5.28.34 6.23-2.38.77-2.19-.04-3.46-1.62-4.28 1.15-.27 2.02-.1 2.51-2.58zm-3.08 5.63c-.55 2.2-4.24 1.01-5.43.72l.97-3.88c1.19.3 5.03.89 4.46 3.16zm.55-5.65c-.5 2.01-3.58.99-4.58.74l.88-3.52c1 .25 4.21.72 3.7 2.78z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  if (sym.includes('ETH') || sym === 'WETH') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
      >
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <path
          d="M16 4l-9 12.3 9 5.3 9-5.3L16 4zm0 24l9-12.7-9 5.3-9-5.3L16 28z"
          fill="#FFFFFF"
          fillOpacity="0.6"
        />
        <path d="M16 4v12.3l9-5.3L16 4zm0 24v-7.4l9-5.3L16 28z" fill="#FFFFFF" fillOpacity="0.8" />
        <path d="M16 16.3L7 11.6l9 5.3v-0.6zm0 0l9-4.7-9 5.3v-0.6z" fill="#FFFFFF" />
      </svg>
    );
  }

  if (sym.includes('USDC') || sym === 'USD') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
      >
        <circle cx="16" cy="16" r="16" fill="#2775CA" />
        <path
          d="M15.4 9.2c-2.4.2-4.1 1.7-4.1 3.7 0 2 1.4 3.1 3.9 3.5l1.3.2c1.7.3 2.6.9 2.6 1.9 0 1.2-1.2 2-2.9 2-1.7 0-2.8-.7-3.3-1.8l-2.4 1.2c.9 2.2 2.9 3.4 5.3 3.6V25h2.4v-1.5c2.4-.2 4.2-1.7 4.2-3.8 0-2.2-1.5-3.2-3.9-3.6l-1.3-.2c-1.6-.3-2.5-.9-2.5-1.9 0-1.1 1.1-1.9 2.6-1.9 1.4 0 2.4.6 2.9 1.6l2.3-1.1c-.8-2-2.7-3.1-4.8-3.4V7h-2.4v1.5z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center font-bold text-[10px] text-white shrink-0 ${className}`}
    >
      {sym.substring(0, 2)}
    </div>
  );
}
