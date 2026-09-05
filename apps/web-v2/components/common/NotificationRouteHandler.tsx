'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function NotificationRouteHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleNavigate = (e: any) => {
      const url = e.detail?.url;
      if (url && typeof url === 'string') {
        try {
          router.push(url);
        } catch (err) {
          console.error('Failed to route notification link:', err);
          window.location.href = url;
        }
      }
    };

    window.addEventListener('notification-navigate', handleNavigate as EventListener);

    return () => {
      window.removeEventListener('notification-navigate', handleNavigate as EventListener);
    };
  }, [router]);

  return null;
}
