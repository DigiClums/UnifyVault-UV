'use client';

import React, { useEffect } from 'react';
import { isAddress } from 'viem';

export function GlobalReferralCapture() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');

      if (refParam && isAddress(refParam.trim())) {
        const cleanRef = refParam.trim();
        localStorage.setItem('uv_cached_referrer', cleanRef);
      }
    } catch (e) {
      console.warn('Unable to capture referrer from URL query parameters:', e);
    }
  }, []);

  return null;
}
