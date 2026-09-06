'use client';

import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';

export function GlobalReferralCapture() {
  const { address: userAddress } = useAccount();

  // 1. Capture ?ref= from URL query parameters instantly
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');

      if (refParam && isAddress(refParam.trim())) {
        const cleanRef = refParam.trim();
        localStorage.setItem('uv_cached_referrer', cleanRef);

        // If user is already connected, register referral link in backend immediately
        if (
          userAddress &&
          isAddress(userAddress) &&
          userAddress.toLowerCase() !== cleanRef.toLowerCase()
        ) {
          fetch('/api/referral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress, referrerAddress: cleanRef }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Unable to capture referrer from URL query parameters:', e);
    }
  }, [userAddress]);

  // 2. When a user connects wallet later, sync their cached referrer to backend
  useEffect(() => {
    if (typeof window === 'undefined' || !userAddress || !isAddress(userAddress)) return;

    try {
      const cached = localStorage.getItem('uv_cached_referrer');
      if (cached && isAddress(cached) && cached.toLowerCase() !== userAddress.toLowerCase()) {
        fetch('/api/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userAddress, referrerAddress: cached }),
        }).catch(() => {});
      }
    } catch {}
  }, [userAddress]);

  return null;
}
