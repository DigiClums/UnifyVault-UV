'use client';

import React from 'react';

interface TokenIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

export function TokenIcon({ symbol, size = 28, className = '' }: TokenIconProps) {
  const sym = symbol.toUpperCase();

  // ── cbBTC (Coinbase Wrapped BTC) / BTC / WBTC ──
  if (sym.includes('BTC') || sym === 'WBTC' || sym === 'CBBTC') {
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
          fillRule="evenodd"
          clipRule="evenodd"
          d="M22.585 13.567c.365-2.436-1.492-3.748-4.032-4.622l.824-3.303-2.01-.502-.803 3.22c-.528-.132-1.072-.256-1.613-.38l.81-3.243-2.01-.502-.824 3.303c-.437-.1-.865-.198-1.284-.3l-2.775-.693-.535 2.15s1.493.342 1.462.363c.815.204.962.744.938 1.173l-.94 3.766c.057.014.13.035.21.068-.068-.017-.14-.035-.213-.053l-1.317 5.28c-.1.248-.353.62-.922.477.02.03-1.465-.366-1.465-.366l-.998 2.302 2.618.653c.487.122.964.249 1.436.368l-.833 3.345 2.01.502.824-3.303c.548.149 1.08.286 1.602.417l-.82 3.284 2.01.502.833-3.341c3.432.65 6.014.388 7.098-2.716.874-2.498-.043-3.938-1.846-4.873 1.312-.303 2.3-1.166 2.564-2.95zm-4.582 6.444c-.624 2.502-4.843 1.15-6.205.81l1.107-4.436c1.362.34 5.742 1.015 5.098 3.626zm.627-6.47c-.57 2.28-4.08 1.121-5.22.838l1.003-4.024c1.14.284 4.802.816 4.217 3.186z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // ── ETH / WETH (Ethereum) ──
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
        <g fill="#FFFFFF">
          <path d="M16 4.5l-.22.75v14.1l.22.22 6.55-3.87L16 4.5z" fillOpacity="0.6" />
          <path d="M16 4.5L9.45 15.7l6.55 3.87V4.5z" />
          <path d="M16 20.73l-.12.15v6.37l.12.35 6.55-9.2-6.55 2.33z" fillOpacity="0.6" />
          <path d="M16 27.6V20.73L9.45 18.4 16 27.6z" />
          <path d="M16 19.57l6.55-3.87L16 12.83v6.74z" fillOpacity="0.2" />
          <path d="M9.45 15.7l6.55 3.87v-6.74L9.45 15.7z" fillOpacity="0.6" />
        </g>
      </svg>
    );
  }

  // ── USDC (USD Coin Official Dual Crescent) ──
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
          d="M19.5 16c0-2.2-1.4-3-3.5-3.2v-2.3c.9.1 1.7.4 2.4.9l.7-1.7c-.9-.6-2-.9-3.1-1V7h-1.5v1.7c-2 .2-3.3 1.4-3.3 3.1 0 2.1 1.4 2.9 3.3 3.2v2.5c-1.1-.1-2.1-.6-2.9-1.2l-.7 1.8c1 .8 2.3 1.2 3.6 1.3V21h1.5v-1.6c2.2-.2 3.5-1.5 3.5-3.4zm-4.9-3.2c0-.9.6-1.4 1.8-1.6v3.1c-1.1-.2-1.8-.7-1.8-1.5zm3.4 3.4c0 1-.7 1.6-1.9 1.8v-3.4c1.1.2 1.9.7 1.9 1.6z"
          fill="#FFFFFF"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16 26.5C10.2 26.5 5.5 21.8 5.5 16S10.2 5.5 16 5.5 26.5 10.2 26.5 16 21.8 26.5 16 26.5zm0-1.8c4.8 0 8.7-3.9 8.7-8.7S20.8 7.3 16 7.3 7.3 11.2 7.3 16s3.9 8.7 8.7 8.7z"
          fill="#FFFFFF"
          fillOpacity="0.4"
        />
      </svg>
    );
  }

  // ── UVBE (UnifyVault Index Share Token) ──
  if (sym.includes('UV') || sym === 'UVBE') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-full bg-black border-2 border-black dark:border-white/20 flex items-center justify-center font-black text-xs text-[#BFFF00] shrink-0 shadow-[1px_1px_0_#BFFF00] ${className}`}
      >
        <span className="font-mono tracking-tighter text-[11px] font-black">UV</span>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full bg-black text-white dark:bg-white/10 dark:text-white border border-black/20 flex items-center justify-center font-bold text-[10px] shrink-0 ${className}`}
    >
      {sym.substring(0, 2)}
    </div>
  );
}
